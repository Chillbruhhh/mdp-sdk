export interface SdkUpdateInfo {
  packageName: string;
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  checkedAt: string;
}

export interface SdkUpdateCheckOptions {
  packageName?: string;
  registryLatestUrl?: string;
  cacheTtlMs?: number;
  force?: boolean;
  onUpdateAvailable?: (info: SdkUpdateInfo) => void;
}

const DEFAULT_PKG = "@moltdomesticproduct/mdp-sdk";
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

let cached: { at: number; info: SdkUpdateInfo } | null = null;
let inFlight: Promise<SdkUpdateInfo> | null = null;
let watcherStarted = false;

function parseVersion(input: string): number[] {
  const core = input.split("-")[0] ?? input;
  return core
    .split(".")
    .slice(0, 3)
    .map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    });
}

function isOutdated(current: string, latest: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}

async function getCurrentVersionFromPackageJson(): Promise<string | null> {
  try {
    const [{ readFile }, pathMod, urlMod] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
      import("node:url"),
    ]);
    const filePath = urlMod.fileURLToPath(import.meta.url);
    const dir = pathMod.dirname(filePath);
    const pkgPath = pathMod.resolve(dir, "../package.json");
    const raw = await readFile(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

async function fetchLatestVersion(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    const v = json?.version;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

function latestUrlForPackage(pkg: string): string {
  return `https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`;
}

export async function checkForSdkUpdate(
  options: SdkUpdateCheckOptions = {}
): Promise<SdkUpdateInfo> {
  const pkg = options.packageName ?? DEFAULT_PKG;
  const ttl = options.cacheTtlMs ?? DEFAULT_TTL;
  const now = Date.now();

  if (!options.force && cached && now - cached.at < ttl) {
    return cached.info;
  }

  if (!options.force && inFlight) {
    return inFlight;
  }

  const url = options.registryLatestUrl ?? latestUrlForPackage(pkg);

  inFlight = (async () => {
    const [current, latest] = await Promise.all([
      getCurrentVersionFromPackageJson(),
      fetchLatestVersion(url),
    ]);

    const updateAvailable =
      Boolean(current && latest) && isOutdated(current as string, latest as string);

    const info: SdkUpdateInfo = {
      packageName: pkg,
      currentVersion: current,
      latestVersion: latest,
      updateAvailable,
      checkedAt: new Date().toISOString(),
    };

    cached = { at: Date.now(), info };
    inFlight = null;

    if (updateAvailable && options.onUpdateAvailable) {
      try {
        options.onUpdateAvailable(info);
      } catch {
        // ignore
      }
    }

    return info;
  })();

  return inFlight;
}

export function startSdkUpdateWatcher(options: SdkUpdateCheckOptions = {}): void {
  if (watcherStarted) return;
  watcherStarted = true;

  const intervalMs = options.cacheTtlMs ?? DEFAULT_TTL;

  // Immediate background check
  void checkForSdkUpdate({
    ...options,
    force: true,
    onUpdateAvailable:
      options.onUpdateAvailable ??
      ((info) => {
        // eslint-disable-next-line no-console
        console.warn(
          `[mdp-sdk] Update available: ${info.packageName} ${info.currentVersion ?? "unknown"} -> ${info.latestVersion}. Run: npm i ${info.packageName}@latest`
        );
      }),
  });

  const timer = setInterval(() => {
    void checkForSdkUpdate({
      ...options,
      force: true,
      onUpdateAvailable:
        options.onUpdateAvailable ??
        ((info) => {
          // eslint-disable-next-line no-console
          console.warn(
            `[mdp-sdk] Update available: ${info.packageName} ${info.currentVersion ?? "unknown"} -> ${info.latestVersion}. Run: npm i ${info.packageName}@latest`
          );
        }),
    });
  }, intervalMs);

  // Do not keep the process alive just for the watcher.
  if (typeof (timer as any).unref === "function") {
    (timer as any).unref();
  }
}
