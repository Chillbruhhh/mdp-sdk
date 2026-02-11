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

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

const sourceSkill = normalizeApiBase(normalizeDomain(fs.readFileSync(skillPath, "utf8")));
const sourcePager = normalizeApiBase(normalizeDomain(fs.readFileSync(pagerPath, "utf8")));

writeFile(skillPath, sourceSkill);
writeFile(pagerPath, sourcePager);
writeFile(path.join(bundledOpenclawDir, "SKILL.md"), sourceSkill);
writeFile(path.join(bundledOpenclawDir, "pager.md"), sourcePager);

console.log("[sync-skill-docs] Synced SKILL.md and pager.md into openclaw-skill/");
