// License rail (10 §8): the PRODUCTION dependency graph must be permissive-only —
// copyleft anywhere in it fails CI. Dev-only deps are reported, never fatal.
// Usage: node tools/license-assert.mjs   (after npm install)
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const ALLOW = new Set(["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD",
  "BlueOak-1.0.0", "CC0-1.0", "CC-BY-4.0", "CC-BY-3.0", "Unlicense", "Python-2.0", "Zlib", "WTFPL", "MIT-0"]);
const COPYLEFT = /GPL|EUPL|OSL|CECILL|SSPL|BUSL|Elastic/i; // AGPL/LGPL/GPL all match GPL

function licenseOf(pkg) {
  const l = pkg.license ?? pkg.licenses;
  if (!l) return null;
  if (typeof l === "string") return l;
  if (Array.isArray(l)) return l.map(x => (typeof x === "string" ? x : x.type)).join(" OR ");
  return l.type ?? null;
}
function readPkg(dir) {
  try { return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")); } catch { return null; }
}
function resolveDir(name, fromDir) {
  // walk up node_modules chains the way require() does
  let dir = fromDir;
  while (dir.length >= root.length) {
    const cand = join(dir, "node_modules", name);
    if (existsSync(join(cand, "package.json"))) return cand;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const seen = new Map(); // name@version -> { license, dir }
const missing = [];
function walk(dir) {
  const pkg = readPkg(dir);
  if (!pkg) return;
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    const d = resolveDir(name, dir);
    if (!d) { missing.push(`${name} (from ${pkg.name})`); continue; }
    const p = readPkg(d);
    const key = `${p.name}@${p.version}`;
    if (seen.has(key)) continue;
    seen.set(key, { license: licenseOf(p), dir: d });
    walk(d);
  }
}
walk(root);

const bad = [], unknown = [];
for (const [key, { license }] of seen) {
  if (!license) { unknown.push(key); continue; }
  // SPDX expressions: OK if every ALLOW-listed alternative exists in an OR; fail hard on copyleft-only
  if (COPYLEFT.test(license) && !/\bOR\b/i.test(license)) { bad.push(`${key}: ${license}`); continue; }
  const parts = license.replace(/[()]/g, "").split(/\s+(?:OR|AND)\s+/i);
  const ok = /\bOR\b/i.test(license) ? parts.some(p => ALLOW.has(p.trim())) : parts.every(p => ALLOW.has(p.trim()));
  if (!ok) unknown.push(`${key}: ${license}`);
}

console.log(`license-assert: ${seen.size} production packages scanned`);
if (missing.length) console.log(`  unresolved (optional/platform?): ${missing.length}`);
if (unknown.length) console.log(`  NOT on the allowlist (review + extend ALLOW deliberately):\n    ${unknown.join("\n    ")}`);
if (bad.length) {
  console.error(`  COPYLEFT IN THE PRODUCTION GRAPH (10 §8):\n    ${bad.join("\n    ")}`);
  process.exit(1);
}
if (unknown.length) process.exit(1);
console.log("  permissive-only ✓");
