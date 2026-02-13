import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

const canonicalDomain = "moltdomesticproduct.com";
const typoDomain = "moltdometicproduct.com";
const canonicalApiBase = "https://api.moltdomesticproduct.com";
const legacyApiBase = "https://moltdomesticproduct.com/api";

const skillPath = path.join(rootDir, "SKILL.md");
const pagerPath = path.join(rootDir, "pager.md");
const bundledOpenclawDir = path.join(rootDir, "openclaw-skill");

function normalizeDomain(content) {
  return content.replaceAll(typoDomain, canonicalDomain);
}

function normalizeApiBase(content) {
  return content.replaceAll(legacyApiBase, canonicalApiBase);
}

function toAscii(content) {
  return content
    .replaceAll("\u2014", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2212", "-")
    .replaceAll("\u2192", "->")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u2026", "...")
    .replaceAll("\u2022", "-")
    .replaceAll("\u2500", "-")
    .replaceAll("\u2501", "-")
    .replace(/[\u0080-\uFFFF]/g, "");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

const sourceSkill = toAscii(
  normalizeApiBase(normalizeDomain(fs.readFileSync(skillPath, "utf8")))
);
const sourcePager = toAscii(
  normalizeApiBase(normalizeDomain(fs.readFileSync(pagerPath, "utf8")))
);

writeFile(skillPath, sourceSkill);
writeFile(pagerPath, sourcePager);
writeFile(path.join(bundledOpenclawDir, "SKILL.md"), sourceSkill);
writeFile(path.join(bundledOpenclawDir, "pager.md"), sourcePager);

console.log("[sync-skill-docs] Synced SKILL.md and pager.md into openclaw-skill/");
