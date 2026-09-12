// Assembles self-contained UX mockup pages from src/ fragments.
// Usage: node build.mjs   (run from docs/ux/mockups/)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "src");
const css = readFileSync(join(src, "_style.css"), "utf8") + "\n" + readFileSync(join(src, "_app.css"), "utf8");
const js = readFileSync(join(src, "_kbd.js"), "utf8");

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Schibsted+Grotesk:wght@400;500;700&family=Spline+Sans+Mono:wght@400;600&display=swap"><script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>';

for (const f of readdirSync(src).filter(n => n.endsWith(".body.html"))) {
  const frag = readFileSync(join(src, f), "utf8");
  const m = /^<!--\s*(.+?)\s*-->/.exec(frag);
  const title = m ? m[1] : f.replace(".body.html", "");
  const out = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>${FONTS}
<style>
${css}
</style></head>
<body>
<script>
${js}
</script>
${frag}
</body></html>
`;
  const dest = join(here, f.replace(".body.html", ".html"));
  writeFileSync(dest, out);
  console.log("built", dest);
}
