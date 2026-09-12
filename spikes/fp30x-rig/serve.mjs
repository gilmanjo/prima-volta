// Tiny static server for the rig (Web MIDI needs a secure context; localhost qualifies).
// Usage: node spikes/fp30x-rig/serve.mjs  → open http://localhost:8477
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
createServer((req, res) => {
  try {
    const file = req.url === "/" ? "index.html" : req.url.slice(1);
    res.setHeader("content-type", file.endsWith(".html") ? "text/html" : "text/plain");
    res.end(readFileSync(join(here, file)));
  } catch { res.statusCode = 404; res.end("not found"); }
}).listen(8477, () => console.log("FP-30X rig → http://localhost:8477  (Chrome, keyboard on USB)"));
