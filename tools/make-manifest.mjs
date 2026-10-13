// make-manifest.mjs — Gen-A manifest over the capture layer.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.argv[2] || ".";
const outFile = process.argv[3] || ".upstream/manifest.json";
const skipDirs = new Set(["tools", "docs", "readable", "src", ".upstream", ".git", "legacy", "node_modules"]);
const skipFiles = new Set([".gitattributes", ".gitignore", "README.md", "_mirror-report.json", "split-spec.json"]);
const dynamic = new Set(["embed"]); // JWT/sessionToken rotate per response

const files = {};
let count = 0;
let total = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.relative(root, path.join(dir, e.name)).split(path.sep).join("/");
    const top = rel.split("/")[0];
    if (skipDirs.has(top) || (e.isDirectory() && skipDirs.has(rel))) continue;
    if (e.isDirectory()) walk(path.join(dir, e.name));
    else {
      if (skipFiles.has(rel)) continue;
      const b = fs.readFileSync(path.join(dir, e.name));
      const rec = { bytes: b.length, sha256: crypto.createHash("sha256").update(b).digest("hex") };
      if (dynamic.has(rel)) rec.dynamic = true;
      files[rel] = rec;
      count++;
      total += b.length;
    }
  }
}
walk(root);
const manifest = {
  generated: new Date().toISOString().slice(0, 10),
  origin: "https://wavedash.com/games/blood-slayers",
  files,
};
fs.mkdirSync(path.dirname(path.join(root, outFile)), { recursive: true });
fs.writeFileSync(path.join(root, outFile), JSON.stringify(manifest, null, 2) + "\n");
console.log(`${count} files, ${total} bytes, ${(total / 1048576).toFixed(1)} MiB -> ${outFile}`);
