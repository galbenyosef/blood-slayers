// update.mjs — read-only drift probe for BLOOD SLAYERS
// (https://wavedash.com/games/blood-slayers). Never rewrites the capture.
// usage: node tools/update.mjs [--json]
//
// Platform mechanics (re-probed 2026-11-01): the game is NOT served from
// wavedash.com. The game itself is served by a per-user, per-build CDN host:
//
//   https://<gameCloudId>-<fnv32(userId)>-<fnv32(gameBuildId)>.builds.wavedashcdn.com
//
// MARKUP SHAPE (what changed since 2026-10-13): wavedash.com is now a
// SvelteKit portal. The game page's inline `kit.start(…)` data blob still
// carries the SSR bootstrap — `game:{…}`, `gameBuild:{_id, engine,
// entrypoint, buildNumber, …}`, `gameCloud:{_id, environment}` and
// `anonymousUser:{id, username, language}` — but it no longer carries
// `playKey`. The rotating per-load bootstrap (playKey + userId + the
// authoritative gameBuild/gameCloud) is now minted by an API endpoint the
// player calls:
//
//   POST /embed/api/game-launch   (embed player; what embed/sw-embed.js drives)
//   POST /api/game-launch         (the game page's own player)
//   body: {"gameSlug":"blood-slayers"}   →  {playKey, userId, gameBuild,
//                                            gameCloud, anonymousUser}
//
// The endpoint requires the anonymous session the page load sets as cookies
// (`anonymousUserId` + `aut`), otherwise it 403s "Gameplay requires a user".
//
// The host still requires a per-session gameplay JWT: GET /embed?entrypoint=…&engine=CUSTOM&pk=<playKey>
// (with the sdkconfig JSON param) answers the embed shell HTML carrying
// window.__WAVEDASH_GAME__ = { gcid, gbid, swPath, gameplayJwt, sessionToken };
// every build-file request then travels with `Authorization: Bearer <jwt>` +
// `X-Wd-Sw: jwt` (what the sw-embed.js service worker adds in a browser).
//
// This probe is therefore (read-only, writes nothing, no *.tmp):
//   1. GET the game page (cookieless — it sets the anonymous session cookies)
//      and read the SSR bootstrap as a shape guard / cross-check:
//      gameCloud._id / gameBuild._id (+ engine, entrypoint);
//   2. POST the launch endpoint with those cookies to mint the per-load
//      bootstrap, and cross-check its gameBuild._id / gameCloud._id against
//      the SSR markup (a mismatch means the platform changed how the page
//      picks the build — fail loudly rather than guess);
//   3. derive the same CDN host the platform would derive (FNV-1a 32-bit of
//      userId and gameBuildId, see the SDK's subdomain helper);
//   4. GET /embed with the playKey to mint a fresh gameplay JWT (valid ~1 h);
//   5. probe every file recorded in .upstream/manifest.json with the JWT and
//      compare sha256 (the `embed` shell is `dynamic: true` — rotating
//      JWT/sessionToken — so it is compared normalized).
//
// FAILURE MODE: every step that depends on the live shape is guarded. If the
// page stops carrying the SSR bootstrap, if the launch endpoint is gone /
// answers non-200 / changes its response fields, or if the embed shell stops
// carrying a gameplayJwt, this probe prints exactly what is missing and exits
// 2 — it never silently reports "up to date".
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
const GAME_SLUG = "blood-slayers";
// The two launch endpoints the platform's player calls; embed first (this is
// an embed capture), then the game page's own endpoint.
const LAUNCH_ENDPOINTS = ["/embed/api/game-launch", "/api/game-launch"];
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
  return { status: r.status, headers: r.headers, buf: r.ok ? Buffer.from(await r.arrayBuffer()) : null };
}
// loud, actionable shape failure — the probe must never guess past this
function shapeFail(what, detail) {
  console.error(`PROBE BROKEN — platform shape changed: ${what}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  The probe is read-only; the capture was NOT touched. Re-derive the extraction rule");
  console.error("  from the live markup/API (see the header comment) before trusting any drift report.");
  process.exit(2);
}
// rotating per-session fields inside the embed shell — everything else must be identical
const normalizeEmbed = (s) =>
  s
    .replace(/gameplayJwt":"[^"]*"/g, 'gameplayJwt":"<jwt>"')
    .replace(/sessionToken":"[0-9a-f]*"/g, 'sessionToken":"<token>"')
    .replace(/wavedashUser":\{"id":"[^"]*","username":"[^"]*"\}/g, 'wavedashUser":{"id":"<id>","username":"<name>"}')
    .replace(/pk=[0-9a-f]+/g, "pk=<playKey>");

const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));

// ── 1) SSR page: anonymous session cookies + bootstrap cross-check ──────
const page = await get(ORIGIN + PAGE);
if (page.status !== 200) {
  console.error(`live page ${ORIGIN + PAGE} -> HTTP ${page.status}`);
  process.exit(2);
}
const html = page.buf.toString("utf8");
// SvelteKit SSR blob: `gameCloud:{_creationTime:…,_id:"…",…}` etc. (keys are
// unquoted object-literal keys in the inline kit.start() data).
const ssrCloudId = /gameCloud:\{.*?_id:"([^"]+)"/.exec(html)?.[1];
const ssrBuildId = /gameBuild:\{.*?_id:"([^"]+)"/.exec(html)?.[1];
const ssrEngine = /gameBuild:\{.*?engine:"([^"]+)"/.exec(html)?.[1];
const ssrEntrypoint = /gameBuild:\{.*?entrypoint:"([^"]+)"/.exec(html)?.[1];
if (!ssrCloudId || !ssrBuildId) {
  shapeFail(
    "the SSR page no longer carries the gameCloud/gameBuild bootstrap",
    `page ${ORIGIN + PAGE} (${html.length} bytes) has no gameCloud._id / gameBuild._id in its inline data blob`,
  );
}
const setCookies = (h) =>
  typeof h.getSetCookie === "function" ? h.getSetCookie() : [h.get("set-cookie")].filter(Boolean);
const cookie = setCookies(page.headers)
  .map((c) => c.split(";")[0])
  .join("; ");
if (!cookie) {
  shapeFail(
    "the SSR page set no anonymous session cookie",
    "the launch endpoint 403s (\"Gameplay requires a user\") without anonymousUserId/aut",
  );
}

// ── 2) launch endpoint: the per-load bootstrap (playKey + authoritative build) ──
let launch = null;
let launchUrl = null;
let lastErr = null;
for (const ep of LAUNCH_ENDPOINTS) {
  const r = await fetch(ORIGIN + ep, {
    method: "POST",
    headers: {
      ...UA,
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Referer: ORIGIN + "/embed/games/" + GAME_SLUG,
      Cookie: cookie,
    },
    body: JSON.stringify({ gameSlug: GAME_SLUG }),
  });
  if (r.status === 200) {
    try {
      launch = JSON.parse(await r.text());
      launchUrl = ep;
      break;
    } catch (e) {
      lastErr = `${ep} -> 200 but not JSON (${String(e).slice(0, 80)})`;
    }
  } else {
    lastErr = `${ep} -> HTTP ${r.status} ${(await r.text()).slice(0, 80)}`;
  }
}
if (!launch) {
  shapeFail(
    "no launch endpoint returned the per-load bootstrap",
    `tried ${LAUNCH_ENDPOINTS.join(", ")}: ${lastErr}`,
  );
}
const playKey = launch.playKey;
const userId = launch.userId;
const gameCloudId = launch.gameCloud?._id;
const gameBuildId = launch.gameBuild?._id;
const engine = launch.gameBuild?.engine || ssrEngine;
const entrypoint = launch.gameBuild?.entrypoint || ssrEntrypoint;
const anon = launch.anonymousUser || {};
const missing = [
  ["playKey", playKey],
  ["userId", userId],
  ["gameBuild._id", gameBuildId],
  ["gameCloud._id", gameCloudId],
].filter(([, v]) => !v);
if (missing.length) {
  shapeFail(
    `launch response from ${launchUrl} is missing ${missing.map(([k]) => k).join(", ")}`,
    `got keys: ${Object.keys(launch).join(", ")}`,
  );
}
if (gameBuildId !== ssrBuildId || gameCloudId !== ssrCloudId) {
  shapeFail(
    "the launch build does not match the SSR markup",
    `SSR gameBuild=${ssrBuildId} gameCloud=${ssrCloudId} but launch gameBuild=${gameBuildId} gameCloud=${gameCloudId} (the page and the player disagree on which build is live)`,
  );
}
const buildHash = fnv32(gameBuildId);
const host = `${gameCloudId}-${fnv32(userId)}-${buildHash}.builds.wavedashcdn.com`;

// ── 3) mint a gameplay JWT via the embed shell ──────────────────────────
const sdk = JSON.stringify({
  convexCloudUrl: "https://convex-api.wavedash.com",
  wavedashUser: { id: anon.id || userId, username: anon.username || "anonymous" },
  gameCloudId,
  ugcHost: "ugc.wavedashcdn.com",
  uploadsHost: "uploads.wavedash.com",
  launchParams: {},
  parentOrigin: ORIGIN,
  initialVolume: 1,
});
const embedUrl =
  `https://${host}/embed?entrypoint=${encodeURIComponent(entrypoint || "index.html")}` +
  `&engine=${encodeURIComponent(engine || "CUSTOM")}&pk=${playKey}&sdkconfig=${encodeURIComponent(sdk)}&gameSlug=${GAME_SLUG}`;
const embed = await get(embedUrl);
if (embed.status !== 200) {
  console.error(`live embed ${embedUrl.slice(0, 120)}… -> HTTP ${embed.status}`);
  process.exit(2);
}
const embedText = embed.buf.toString("utf8");
const jwt = /gameplayJwt":"([^"]+)"/.exec(embedText)?.[1];
if (!jwt) {
  shapeFail(
    "the embed shell carries no gameplayJwt",
    `${host}/embed answered 200 (${embedText.length} bytes) but window.__WAVEDASH_GAME__ has no gameplayJwt`,
  );
}

// ── 4) probe every captured file ────────────────────────────────────────
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
const missingCount = rows.filter((r) => r.state === "live-missing").length;
if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        origin: ORIGIN,
        launch: launchUrl,
        host,
        build: buildHash,
        checked: rels.length,
        changed,
        missing: missingCount,
        rows,
      },
      null,
      2,
    ),
  );
} else if (!rows.length) {
  console.log(`up to date: ${rels.length} captured files identical upstream (build ${buildHash})`);
} else {
  console.log(`DRIFT: ${changed} changed, ${missingCount} live-missing (of ${rels.length} captured; build ${buildHash})`);
  for (const r of rows.slice(0, 40)) console.log(`  ${r.state.padEnd(14)} ${r.file}`);
  process.exit(1);
}
