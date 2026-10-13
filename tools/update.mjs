// update.mjs — read-only drift probe for BLOOD SLAYERS
// (https://wavedash.com/games/blood-slayers). Never rewrites the capture.
// usage: node tools/update.mjs [--json]
//
// Platform mechanics (probed 2026-10-13): the game is NOT served from
// wavedash.com. The platform server-renders the game page with the per-load
// bootstrap (playKey, gameCloudId, gameBuild metadata) and the game itself is
// served by a per-build CDN host:
//
//   https://<gameCloudId>-<fnv32(userId)>-<fnv32(gameBuildId)>.builds.wavedashcdn.com
//
// The host requires a per-session gameplay JWT: GET /embed?entrypoint=…&engine=CUSTOM&pk=<playKey>
// (with the sdkconfig JSON param) answers the embed shell HTML carrying
// window.__WAVEDASH_GAME__ = { gcid, gbid, swPath, gameplayJwt, sessionToken };
// every build-file request then travels with `Authorization: Bearer <jwt>` +
// `X-Wd-Sw: jwt` (what the sw-embed.js service worker adds in a browser).
//
// This probe is therefore:
//   1. GET the game page (cookieless — an anonymous bootstrap is enough to
//      read; it mints a working pk for an anonymous user) and extract
//      playKey / gameCloud._id / gameBuild._id (+ engine, entrypoint);
//   2. derive the same CDN host the platform would derive (FNV-1a 32-bit of
//      userId and gameBuildId, see the SDK's Ki() function);
//   3. GET /embed with that pk to mint a fresh gameplay JWT (valid ~1 h);
//   4. probe every file recorded in .upstream/manifest.json with the JWT and
//      compare sha256 (the `embed` shell is `dynamic: true` — rotating
//      JWT/sessionToken — so it is compared normalized, presence-only would
//      also be acceptable).
//
// Known noise: _mirror-report.json is a local capture record — never probed.
// A build change shows up twice: as a "build" row (build-id hash) and as
// changed/live-missing file rows.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const ORIGIN = "https://wavedash.com";
const PAGE = "/games/blood-slayers";
const CAPTURED_BUILD_HASH = "0a5301b2"; // fnv32(gameBuildId) of the captured build
const CONC = 6;
const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
function fnv32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
async function get(url, headers) {
  const r = await fetch(url, { headers: { ...UA, ...(headers || {}) } });
  return { status: r.status, buf: r.ok ? Buffer.from(await r.arrayBuffer()) : null };
}
// rotating per-session fields inside the embed shell — everything else must be identical
const normalizeEmbed = (s) =>
  s
    .replace(/gameplayJwt":"[^"]*"/g, 'gameplayJwt":"<jwt>"')
    .replace(/sessionToken":"[0-9a-f]*"/g, 'sessionToken":"<token>"')
    .replace(/wavedashUser":\{"id":"[^"]*","username":"[^"]*"\}/g, 'wavedashUser":{"id":"<id>","username":"<name>"}')
    .replace(/pk=[0-9a-f]+/g, "pk=<playKey>");

const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));

// ── 1) bootstrap from the SSR page ──────────────────────────────────────
const page = await get(ORIGIN + PAGE);
if (page.status !== 200) {
  console.error(`live page ${ORIGIN + PAGE} -> HTTP ${page.status}`);
  process.exit(2);
}
const html = page.buf.toString("utf8");
const playKey = /playKey:"([0-9a-f]+)"/.exec(html)?.[1];
const gameCloudId = /gameCloud:\{.*?_id:"([^"]+)"/.exec(html)?.[1];
const gameBuildId = /gameBuild:\{.*?_id:"([^"]+)"/.exec(html)?.[1];
const engine = /gameBuild:\{.*?engine:"([^"]+)"/.exec(html)?.[1];
const entrypoint = /gameBuild:\{.*?entrypoint:"([^"]+)"/.exec(html)?.[1];
const anonId = /anonymousUser:\{id:"([^"]+)"/.exec(html)?.[1];
const anonName = /anonymousUser:\{id:"[^"]+",username:"([^"]+)"/.exec(html)?.[1];
if (!playKey || !gameCloudId || !gameBuildId || !anonId) {
  console.error("could not extract the game bootstrap (playKey/gameCloudId/gameBuildId/anonymousUser) from the SSR page");
  process.exit(2);
}
const buildHash = fnv32(gameBuildId);
const host = `${gameCloudId}-${fnv32(anonId)}-${buildHash}.builds.wavedashcdn.com`;

// ── 2) mint a gameplay JWT via the embed shell ──────────────────────────
const sdk = JSON.stringify({
  convexCloudUrl: "https://convex-api.wavedash.com",
  wavedashUser: { id: anonId, username: anonName || "anonymous" },
  gameCloudId,
  ugcHost: "ugc.wavedashcdn.com",
  uploadsHost: "uploads.wavedash.com",
  launchParams: {},
  parentOrigin: "https://wavedash.com",
  initialVolume: 1,
});
const embedUrl =
  `https://${host}/embed?entrypoint=${encodeURIComponent(entrypoint || "index.html")}` +
  `&engine=${encodeURIComponent(engine || "CUSTOM")}&pk=${playKey}&sdkconfig=${encodeURIComponent(sdk)}&gameSlug=blood-slayers`;
const embed = await get(embedUrl);
if (embed.status !== 200) {
  console.error(`live embed ${embedUrl.slice(0, 120)}… -> HTTP ${embed.status}`);
  process.exit(2);
}
const embedText = embed.buf.toString("utf8");
const jwt = /gameplayJwt":"([^"]+)"/.exec(embedText)?.[1];
if (!jwt) {
  console.error("live embed shell carries no gameplayJwt — platform shape changed");
  process.exit(2);
}

// ── 3) probe every captured file ────────────────────────────────────────
const rows = [];
if (buildHash !== CAPTURED_BUILD_HASH)
  rows.push({ file: "<build>", state: "changed", mirror: CAPTURED_BUILD_HASH, live: buildHash, note: "gameBuild._id hash differs — a new build is live" });

const rels = Object.keys(manifest.files).filter((r) => !r.endsWith("_mirror-report.json")).sort();
let i = 0;
const results = new Map();
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (i < rels.length) {
      const rel = rels[i++];
      try {
        const r = await get(`https://${host}/${rel}`, { Authorization: `Bearer ${jwt}`, "X-Wd-Sw": "jwt" });
        results.set(rel, r);
      } catch (e) {
        results.set(rel, { status: 0, err: String(e) });
      }
    }
  }),
);
for (const rel of rels) {
  const m = manifest.files[rel];
  const l = results.get(rel);
  if (!l || l.status !== 200) {
    rows.push({ file: rel, state: "live-missing", status: l ? l.status : 0 });
    continue;
  }
  if (m.dynamic) {
    // rotating session fields — compare normalized
    if (rel === "embed") {
      const a = normalizeEmbed(l.buf.toString("utf8"));
      const b = normalizeEmbed(fs.readFileSync(path.join(proj, rel), "utf8"));
      if (a !== b) rows.push({ file: rel, state: "changed", note: "dynamic shell differs beyond rotating tokens" });
    } else if (rel.endsWith(".html") || isDoc(rel)) {
      const a = normalizeEmbed(l.buf.toString("utf8"));
      const b = normalizeEmbed(fs.readFileSync(path.join(proj, rel), "utf8"));
      if (a !== b) rows.push({ file: rel, state: "changed" });
    }
    continue; // dynamic: presence (+ shape for the embed shell) is the stable signal
  }
  if (rel === "embed" || isDoc(rel)) {
    const a = normalizeEmbed(l.buf.toString("utf8"));
    const b = normalizeEmbed(fs.readFileSync(path.join(proj, rel), "utf8"));
    if (a !== b) rows.push({ file: rel, state: "changed" });
  } else if (m.sha256 !== sha(l.buf)) {
    rows.push({ file: rel, state: "changed", mirror: m.sha256.slice(0, 12), live: sha(l.buf).slice(0, 12) });
  }
}
function isDoc(rel) {
  return /\.html$/i.test(rel) || rel === "embed";
}
const changed = rows.filter((r) => r.state === "changed").length;
const missing = rows.filter((r) => r.state === "live-missing").length;
if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      { origin: ORIGIN, host, build: buildHash, checked: rels.length, changed, missing, rows },
      null,
      2,
    ),
  );
} else if (!rows.length) {
  console.log(`up to date: ${rels.length} captured files identical upstream (build ${buildHash})`);
} else {
  console.log(`DRIFT: ${changed} changed, ${missing} live-missing (of ${rels.length} captured; build ${buildHash})`);
  for (const r of rows.slice(0, 40)) console.log(`  ${r.state.padEnd(14)} ${r.file}`);
  process.exit(1);
}
