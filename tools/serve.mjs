// serve.mjs — dependency-free static server for the offline boot test.
// usage: node tools/serve.mjs <port> [document-root]
//
// Binds 127.0.0.1 only, serves the given root (default: repo root, which is
// the build host's document root for this capture), maps /x/ -> x/index.html,
// answers honest 404s (never an SPA fallback), and logs path + status.
// The origin's build host sends cross-origin-isolation headers; the engine is
// mirrored with them.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 8080);
const root = path.resolve(process.argv[3] || path.join(here, ".."));

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".gz": "application/gzip",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".bin": "application/octet-stream",
  ".dat": "application/octet-stream",
  ".hdr": "application/octet-stream",
  ".ktx2": "application/octet-stream",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  } catch {
    console.log(`400 ${req.url}`);
    return send(res, 400, "Bad Request");
  }
  const target = path.resolve(root, "." + rel);
  if (target !== root && !target.startsWith(root + path.sep)) {
    console.log(`403 ${rel}`);
    return send(res, 403, "Forbidden");
  }
  fs.stat(target, (err, st) => {
    if (!err && st.isDirectory()) {
      const index = path.join(target, "index.html");
      if (fs.existsSync(index)) return serveFile(index, rel, res);
    } else if (!err && st.isFile()) {
      return serveFile(target, rel, res);
    }
    console.log(`404 ${rel}`);
    send(res, 404, "Not Found");
  });
});

function serveFile(file, rel, res) {
  fs.readFile(file, (err, data) => {
    if (err) {
      console.log(`500 ${rel}`);
      return send(res, 500, "Internal Server Error");
    }
    const type = types[path.extname(file).toLowerCase()] || "application/octet-stream";
    console.log(`200 ${rel}`);
    send(res, 200, data, { "Content-Type": type, "Content-Length": data.length });
  });
}

server.listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} on http://127.0.0.1:${port}/`);
});
