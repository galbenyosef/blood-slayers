# BLOOD SLAYERS — offline mirror

Full mirror of **BLOOD SLAYERS** (https://wavedash.com/games/blood-slayers), the
"olbaid" WebGPU action RPG served by the Wavedash platform.

Source: https://wavedash.com/games/blood-slayers

![BLOOD SLAYERS](docs/cover.png)

## Stack

- **Custom "olbaid" engine — Rust → WebAssembly + WebGPU.** The game is not
  Unity/Godot/Unreal: `olbaid_bg.wasm` (34.7 MB) is a Rust/wasm-bindgen build
  with Bevy crates vendored in (bevy_pbr / bevy_core_pipeline / bevy_ui_render
  shaders and reflection tables are visible in the payload), a winit browser
  event loop and a hand-written wgpu renderer — the entry document refuses to
  boot without `navigator.gpu` and drives the load bar from Rust
  (`window.olbaidProgress` / `window.olbaidReady`).
- **Hand-written entry + wasm-bindgen glue.** `index.html` is authored source
  (canvas page, iOS gesture/audio shims, `import("./olbaid.js")`);
  `olbaid.js` is the 184 KB wasm-bindgen glue with the
  `snippets/olbaid-abdb8433e54eccc9/` JS shims (`inline0.js`,
  `web/olbaid_net.js` — the Wavedash SDK bridge for parties/Quick Play/P2P —
  and `web/olbaid_save.js` — cloud saves).
- **Wavedash platform delivery (the platform mechanics).** The game page on
  wavedash.com is a SvelteKit shell; the game itself is served by a **per-user,
  per-build CDN host**:
  `https://<gameCloudId>-<fnv32(userId)>-<fnv32(gameBuildId)>.builds.wavedashcdn.com`.
  Since 2026-11-01 the page is a SvelteKit **portal**: its SSR HTML still carries
  `gameCloud._id` / `gameBuild._id` (plus `engine`, `entrypoint`) in the inline
  `kit.start()` data blob, but it **no longer carries `playKey`** (the old probe
  looked for it there and broke). The per-load bootstrap is now minted by an API
  endpoint the player calls — `POST /embed/api/game-launch` (embed player) or
  `POST /api/game-launch` (the game page), body `{"gameSlug":"blood-slayers"}`,
  requiring the anonymous session cookies (`anonymousUserId`/`aut`) the page
  load sets — answering `{playKey, userId, gameBuild, gameCloud, anonymousUser}`.
  The player iframe then requests
  `/embed?entrypoint=index.html&engine=CUSTOM&pk=<playKey>&sdkconfig=…`,
  which answers an embed shell embedding
  `window.__WAVEDASH_GAME__ = {gcid, gbid, swPath, gameplayJwt, sessionToken}`
  (JWT ≈ 1 h). `sw-embed.js` — a service worker registered at the host's root
  scope — attaches `Authorization: Bearer <gameplayJwt>` + `X-Wd-Sw: jwt` to
  every build-file request, refreshes it via `POST /auth/refresh`, and caches
  immutable build files (`build-file-cache`). `embed.js` is the Wavedash SDK
  that boots the game document and exposes `window.Wavedash` to the Rust side.
  Without the JWT every path 401s (except `/embed.js`, `/embed.css`,
  `/sw-embed.js`, which are public).
- **Account/party features stay platform-side.** Convex
  (`convex-api.wavedash.com`) backs lobbies/rosters/cloud saves; UGC and
  userfs go to `ugc.wavedashcdn.com` / `uploads.wavedash.com`; error reports
  go to Sentry. These endpoints are documented gaps, not captured bytes. The
  mirror boots **"PLAYING SOLO"** — the game is fully playable offline; a
  local character (creation, dungeon, combat, death/resurrect) was verified.

## What this is

BLOOD SLAYERS — "The Five Seals" — is a 1.1.1 WebGPU action RPG (What To Do!?
Games) for 1–4 players: pick a Barbarian-Knight or a Sorcerer, fight down
through procedurally-carved Ossuary floors (crypts, catacombs, …), hunt the
Keywarden, break the Warden seals and take the loot. The mirror captures the
game's complete build-host closure: **414 files, 255,847,170 bytes (244.0
MiB)** — entry, wasm engine payload, wasm-bindgen shims, the Wavedash embed
shell (embed, embed.js, embed.css, sw-embed.js) and the entire asset tree:
10 themed environment sets (all nine theme prefixes plus the generic crypt
set, with floor depth maps), 20 character/monster models, 43 gear models, 4
item models, 45 icons, 20 UI sheets, 78 audio tracks (SFX + music + voice),
2 fonts, 5 WGSL shaders and 30 `_depth.png` floor maps.

The asset universe was closed **network-log-led**: a full browser session
recorded the platform load, the embed boot and the game's own fetches
(`docs/network-log-2026-10-13.jsonl`), and the game's embedded tables were
recovered from the wasm (the Rust payload compiles in its region list and the
full scene-object name table via `include_str!` — 9 theme prefixes × props,
the 17 monster keys, the 29 gear looks, every icon/UI/audio name). Every
candidate was probed with a session JWT; 404s are recorded in
`_mirror-report.json` (e.g. `*_wall_c` exists only for drowned/thorn/foundry/
abyss, staves only for the sorcerer body, weapons only for the hero body,
`mock-wavedash.js` is referenced by the `?mock=1` local-testing branch but
never uploaded). The platform reports `buildSizeBytes 347,715,998` for build
20; the captured 244.0 MiB is every byte any runtime request reaches — the
delta is upload-side build metadata/artifacts not addressable from the CDN
host (probed exhaustively, including `*.gz`/`*.br`/manifest paths).

External at runtime (documented gaps, not captured — PLAN §1/§4): the Convex
backend, uploads/UGC hosts, Google sign-in and Sentry, all listed in
`_mirror-report.json`.

Platform page vs game build: wavedash.com/games/blood-slayers is **platform
chrome** (nav, store text, comments, platform auth) and is not captured; the
**game closure** lives entirely on the build host and is captured at the repo
root, so serving this repo root reproduces the build host's paths 1:1
(`/index.html`, `/olbaid.js`, `/assets/…`, `/embed`, `/embed.js`,
`/sw-embed.js`). The captured `embed` document is a snapshot of one response
and therefore carries one (long-expired, anonymous-session) `gameplayJwt` +
`sessionToken` pair — it is recorded byte-exact as served and marked
`dynamic: true` in the manifest (the probe compares it token-normalized).

## Layout

- `index.html`, `olbaid.js`, `olbaid_bg.wasm`, `snippets/…` — the game's own
  closure, at the build host's root paths.
- `embed`, `embed.js`, `embed.css`, `sw-embed.js` — the Wavedash embed shell /
  platform runtime (vendor; the `embed` file is extensionless HTML).
- `assets/` — the full asset tree (see `## Assets`).
- `.upstream/manifest.json` — sha256 for every captured file (Gen-A)
- `readable/` — prettified derived layer (pinned prettier 3.9.6): the olbaid
  glue, the three wasm-bindgen shims, the Wavedash SDK + service worker
  (vendor, whole-file), `embed.css`, and the inline twins of `index.html`
  (style + 2 scripts) and `embed` (config script), plus
  `index-inline-map.json` (inline byte ranges + sha256)
- `src/` + `split-spec.json` — 12 statement-aligned slices of the app-side JS
  (glue, shims, inline boot module) with the recorded derivation spec
- `tools/derive.mjs` — rebuild `readable/` + `src/` + `split-spec.json`
- `tools/capture.mjs` — (re)fetch the build closure with a session JWT
- `tools/update.mjs` — read-only drift probe (mints a fresh pk/JWT itself)
- `tools/verify.mjs` — re-hash the capture against the manifest
- `tools/audit.js` — integrity gate for the derived layers (`AUDIT PASS`)
- `tools/check-links.mjs` — the export-binding link gate: does every export
  table the layer carries name a binding the layer declares? The engine
  (`node --input-type=module --check -`) is the judge. The wasm module's
  export table lives in a RECORDED TAIL (`split-spec.json` `sections[].text`),
  not in a file on disk, so the gate takes those bytes from the mirror's own
  record. A table that names a binding a SIBLING slice declares is a
  FRAGMENT, not a defect.
- `docs/cover.png` — cover (gameplay: the Barbarian-Knight fighting risen
  skeletons in the Forgotten Ossuary, mirror-served), `docs/boot-2026-10-13.png`
  and `docs/boot-2026-11-01-refresh.png` — boot evidence (offline character
  screen), `docs/network-log-2026-10-13.jsonl` — the browser/runtime network
  record
- `legacy/2026-11-01/` — the bytes this refresh replaced (the three platform
  embed-runtime files + their superseded derived layer), with `SHA256SUMS`
  (`sha256sum -c` verifies) and a `NOTE.md`; rollback path per PLAN §3

## Assets

- **models — environment** — 160 file(s): `assets/models/env/` — 10 themed
  sets (generic crypt + catacomb/cathedral/sunken/hellforge/cavern/drowned/
  thorn/foundry/abyss × floors a/b/c, walls, pillars) plus props (chests,
  braziers, banners, levers, gates, decals…) and 30 `*_depth.png` floor maps
- **models — characters** — 20 file(s): `assets/models/characters/` — hero,
  sorcerer, and the bestiary (skeleton_warrior, skeleton_archer, ghoul,
  drowned_thrall, tidecaller, drowned_warden, thorn_penitent,
  weeping_chorister, weeping_saint, ash_smith, cinder_hurler, forgemaster,
  hollow_sentinel, abyss_seer, void_spawn, hollow_king, boss, skeleton_parts)
- **models — gear** — 43 file(s): `assets/models/gear/hero/`,
  `assets/models/gear/sorcerer/` (weapons/armour looks that show on the hero)
- **models — items** — 4 file(s): `assets/models/items/` (ring, amulet, gold,
  potion)
- **images — icons** — 45 file(s): `assets/icons/` (item_*, skill_*, class_*)
- **images — UI** — 20 file(s): `assets/ui/` (HUD orbs/bars, panels, worldmap,
  cutscene and intro/ending art, map fog/tokens)
- **audio** — 78 file(s): `assets/audio/` (68 SFX, `music/` — village/demons_lair/
  the_pit tracks, `voice/` — 5 narrator takes, plus intro/ending/cutscene themes)
- **fonts** — 2 file(s): `assets/fonts/` (Cinzel, CinzelDecorative-Bold)
- **shaders** — 5 file(s): `assets/shaders/` (orb, fx, occluder, spell, character)
- **engine payload** — `olbaid_bg.wasm` (34.7 MB Rust/wasm, notRendered)

## Run

Serve this repo root with any static file server (the capture is a static
site; no build step):

```
npx serve .
```

Then open `http://localhost:<port>/index.html` — the game boots standalone
offline ("PLAYING SOLO") straight into character creation/play. The build
host's own boot path is also reproduced: `/embed?entrypoint=index.html&engine=CUSTOM&sdkconfig=<json>`.
Note the origin's build host sends cross-origin-isolation headers
(`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy:
require-corp`); the boot below was verified with a static server that mirrors
them. The platform backend calls fail offline exactly as expected (no roster/
cloud saves) and the game degrades to solo play.

## Boot test (2026-10-27)

- Entry: `http://127.0.0.1:4730/index.html` served by `tools/serve.mjs` with the network blocked (`MAP * 127.0.0.1`).
- Outcome: **rendered** — the loader cleared and the WebGPU engine drew the character-creation screen ("CREATE A NEW SLAYER", Barbarian-Knight / Sorcerer cards, "PLAYING SOLO") from the offline capture.
- Evidence: body 0 chars (canvas-rendered UI); canvas 1262x568; 0 console errors; 1 failed same-origin request, 0 blocked cross-origin; screenshot `docs/boot-2026-10-27.png`.
- Gaps seen: `/favicon.ico` (browser default request, not part of the capture). The existing "fully playable offline / PLAYING SOLO" claim is confirmed.

## Boot test (2026-11-01)

- Entry: `http://127.0.0.1:4713/index.html` served by `tools/serve.mjs` with the
  network blocked (`--host-resolver-rules="MAP * 127.0.0.1"`); port 4713 was
  free in 4700–4799 (`curl` first).
- Outcome: **rendered** — the loader cleared at ~5 s and the WebGPU engine drew
  the character-creation screen ("CREATE A NEW SLAYER", Barbarian-Knight /
  Sorcerer cards, "PLAYING SOLO") from the refreshed offline capture.
- Evidence: canvas 1262x568; body 0 chars (canvas-rendered UI); 1 console error
  (`/favicon.ico` 404 — browser default, not part of the capture) and 4 warnings
  (3 AudioContext autoplay, 1 `powerPreference` ignored on Windows); 0 blocked
  cross-origin; screenshot `docs/boot-2026-11-01-refresh.png`.
- Flag note: headless Chrome 156 with `--use-angle=swiftshader` makes
  `navigator.gpu.requestAdapter()` return **null** on this host (Dawn finds no
  adapter and the engine panics "Unable to find a GPU"); dropping that one flag
  while keeping `--enable-unsafe-swiftshader` gives a working adapter and the
  engine renders, so the boot used
  `--headless=new --enable-unsafe-swiftshader --host-resolver-rules="MAP * 127.0.0.1"`.
- Gaps seen: `/favicon.ico` only. The "fully playable offline / PLAYING SOLO"
  claim is re-confirmed on the refreshed capture.

## Verify

```
node tools/verify.mjs     # re-hash the capture against the manifest
node tools/audit.js       # derived-layer integrity gate (AUDIT PASS)
node tools/check-exports.mjs   # the derived layer still exports every public name
node tools/check-links.mjs     # every export table names a binding the layer declares (fragments are reported, breaks fail)
node tools/derive.mjs --check          # the derived layer is current? (compares a fresh rebuild; writes NOTHING)
```

## Updating from upstream

```
node tools/update.mjs     # read-only drift probe (mints its own pk/JWT)
```

The probe re-derives the per-build CDN host from the live game page, mints a
fresh anonymous playKey → gameplay JWT, and re-hashes every captured file
against the manifest (the `embed` shell is compared token-normalized). The
probe never rewrites the capture — a mirror is a point-in-time snapshot.
`tools/capture.mjs` boots the same session and writes the fetched bytes at
their served paths; it takes `--only <path>…` for a targeted re-capture (the
2026-11-01 refresh used `--only embed embed.css embed.js`) or no filter for the
full closure. Refreshing means: copy the bytes being replaced into
`legacy/<date>/` (with a `SHA256SUMS`), then `node tools/capture.mjs` (or
`--only`), then `node tools/make-manifest.mjs . .upstream/manifest.json`, then
re-deriving (`node tools/derive.mjs` + `node tools/audit.js` +
`node tools/verify.mjs`).

**Extraction rule (re-pointed 2026-11-01).** The probe reads the build from the
current markup/API, in this order, and fails loudly (exit 2, naming the missing
field) if any step's shape changed:

1. `GET https://wavedash.com/games/blood-slayers` — read `gameCloud._id` /
   `gameBuild._id` (`engine`, `entrypoint`) out of the SvelteKit SSR
   `kit.start()` data blob, and keep the `anonymousUserId` / `aut` session
   cookies it sets. If the blob no longer carries `gameCloud`/`gameBuild`, the
   probe stops: the platform markup changed again.
2. `POST /embed/api/game-launch` (falling back to `/api/game-launch`) with
   `{"gameSlug":"blood-slayers"}` and those cookies — this is the endpoint the
   player itself calls — and read `playKey`, `userId`, `gameBuild`, `gameCloud`.
   A non-200 (e.g. 403 `Gameplay requires a user` when the cookie is missing)
   or a response without those fields stops the probe. The launch build must
   match the SSR build, else the page and the player disagree on the live build
   and the probe stops rather than guess.
3. `GET https://<gameCloudId>-<fnv32(userId)>-<fnv32(gameBuild._id)>.builds.wavedashcdn.com/embed?entrypoint=…&engine=…&pk=<playKey>&sdkconfig=…`
   → `gameplayJwt`; then every manifest file is fetched with
   `Authorization: Bearer <jwt>` + `X-Wd-Sw: jwt` and sha256-compared.

**Failure mode.** The old rule (`playKey:"…"` in the page HTML) silently
disappeared on 2026-11-01: the origin became a portal and the field moved behind
the launch API. The probe must therefore never treat a missing bootstrap as
"nothing to compare" — every shape dependency is guarded and a broken shape is a
loud exit 2, not an "up to date" report. A probe that cannot resolve the build
must say so.

### 2026-11-01 probe re-point

The origin switched to a SvelteKit portal and stopped server-rendering
`playKey`, so `tools/update.mjs` could no longer find the game build (the
extraction regex matched nothing and the probe exited 2 on every run). The probe
was re-pointed to the launch API (above), strictly read-only — it writes nothing
and creates no `*.tmp`. Re-probed the same day: **the game build is unchanged**
(`fnv32(gameBuild._id)` is still `0a5301b2`, the captured build 20 / v1.1.1) and
`index.html`, `olbaid.js`, `sw-embed.js` and all 410 assets hash identically —
but **three platform embed-runtime files drifted** (`embed` 1776→1776 B but a
new `sessionToken` field and a bumped `?v=` asset version; `embed.css`
9831→9884 B; `embed.js` 732728→766951 B). That drift was **real**, and was
refreshed the same day (see *2026-11-01 refresh* below): the probe now reports
`up to date`.

### 2026-11-01 refresh

The drift above was a **platform embed-runtime** change only — the game build
did not move. The refresh (PLAN §3) was:

1. **Re-probe + stability.** The repaired probe reported `3 changed, 0
   live-missing` of 414 (build `0a5301b2`) on three separate runs, with
   identical live hashes each time.
2. **Trust gate (before any write).** Every still-served file was re-fetched
   with a fresh JWT and re-hashed: **411 files reproduced byte-for-byte**
   (`sha256` equal to the manifest, `index.html`/`olbaid.js`/`sw-embed.js` and
   all 410 assets included) and the only differences were exactly `embed`
   (token-normalized), `embed.css` and `embed.js`. `tools/verify.mjs` confirmed
   the local capture matched the manifest (414, 0 problems) first.
3. **Archive + re-capture.** The superseded bytes were copied to
   `legacy/2026-11-01/` with `SHA256SUMS` before anything was overwritten, then
   the three files were re-captured with the repaired `tools/capture.mjs`
   (`--only embed embed.css embed.js`). No file went upstream-gone (`0
   live-missing`). A PLAN §4 closure scan over the refreshed bundles found 10
   referenced-but-uncaptured path literals, all of which 404 upstream (the
   SDK's default-avatar asset, the glue's dev `olbaid_bg.js`, the cloud-save
   `saves/characters.json`, and semver/feature-detect false positives in
   `embed.js`) — the closure is closed.
4. **Re-cut + re-derive.** `.upstream/manifest.json` was re-cut (414 files, 3
   hashes changed, `generated: 2026-11-01`; `embed` stays `dynamic: true`), and
   `readable/` + `src/` + `split-spec.json` re-derived from the new capture
   (`embed.pretty.js` 23054→24093 lines, `embed.pretty.css` 636→640,
   `embed-inline-1.pretty.js` and `src/embed-inline-1-01.js` re-cut). The
   superseded derived layer is in `legacy/2026-11-01/` too.

Refreshed capture: **414 files, 255,847,170 bytes (244.0 MiB)**, build
`0a5301b2` (unchanged); `node tools/update.mjs` → `up to date: 414 captured
files identical upstream (build 0a5301b2)`.

### 2026-10-13 derivation note

Both derived layers are in place, cut from the recorded capture (capture bytes
untouched — `node tools/verify.mjs` re-hashes all 414 files):

- `readable/` — pinned prettier 3.9.6 (module API, default options, single
  pass verified idempotent — never the CLI, it respects `.gitignore` and can
  silently echo its input) rendered 9 whole-file pretties (olbaid glue, 3
  wasm-bindgen shims, the Wavedash SDK `embed.pretty.js` at 23,054 lines, its
  service worker, `embed.pretty.css`) and 4 inline twins (`index-inline-1`
  style, `index-inline-1`/`2` scripts, `embed-inline-1` config), 11 files in
  total; every pretty is provably not a byte copy of its capture source and
  re-renders byte-exact under the pinned version. Names are repo-root-relative
  with dirs flattened with `__`; the `embed` shell's inline config twins under
  `embed-inline-1` and its byte range + sha256 are recorded in
  `readable/index-inline-map.json`.
- `src/` — 12 statement-aligned slices with the exact 2-line provenance
  header: 5 from the wasm-bindgen glue (`olbaid-01..05`, 5,971 readable lines
  sliced at top-level declaration boundaries, ~250-350-line windows — the
  oversized single declarations stay whole), 2 from the `olbaid_net` SDK
  bridge, 1 each from `inline0`/`olbaid_save`, and 1 each from the three
  inline scripts. 12/12 parse standalone (`node --input-type=module --check -`)
  and round-trip byte-exact to their readable line ranges. This is a
  **loader-only src/ layer** (glue + platform bridge + boot module) and it is
  documented as such: the game's gameplay code is inside `olbaid_bg.wasm`,
  recorded hashed-notRendered per the fleet's engine-build precedent (payloads
  are never prettified or re-encoded; a naive static server serves them raw).
- Vendor/machinery rule — wholeFile sections, never sliced: `embed.js` +
  `sw-embed.js` (third-party Wavedash platform runtime) and `embed.css`.
  One skipped section: a final pure `export {…}` table, if present. The tail
  records the served chunk's own export statement (`olbaid.js`) as its `text`,
  so the public-export-name gate compares the reading copy's rendered table
  against the served chunk instead of reporting that table unchecked; the
  wholeFile sections name the served capture path in `file`, so the gate can
  resolve the text behind them.
- Identifiers in src/ are the glue's own (wasm-bindgen) names — the
  identifier-rename campaign (PLAN §5) is an explicit **open task** for this
  mirror (there is no authored JS app layer to rename beyond the glue).
- §0.4 fork-over-mirror checked 2026-10-13: no public source repo exists for
  Blood Slayers — the game page links only platform pages (the developer
  profile and Wavedash's own org), a GitHub search finds only this mirror, and
  "olbaid" has no matching source project. The mirror stands.
- Network-log-led closure: the platform load, embed boot and the game's own
  fetches were recorded in a browser session, and the assets not reached in
  that instance were recovered from the wasm-embedded tables and probed (this
  is why both `catacomb_*` and generic `floor_*` sets — run-dependent level
  themes — are captured). OOPIF caveat: the game iframe is a cross-origin
  out-of-process frame, so `opencli network` sees only the navigation-level
  requests; the asset burst was recorded with an in-page fetch hook and the
  Service Worker's cache keys (both in `docs/network-log-2026-10-13.jsonl`).
- Gates: `node tools/verify.mjs` → `414 files checked, 0 problems`;
  `node tools/update.mjs` → `up to date: 414 captured files identical upstream
  (build 0a5301b2)`; `node tools/audit.js` → `AUDIT PASS` (12/12 round-trips,
  11/11 pretties re-render byte-exact, 4 inline twins with byte ranges,
  16/17 imports resolve, 1 whitelisted); serve probe — repo root served on
  loopback, `/`, `/embed`, `/olbaid_bg.wasm` (application/wasm) and
  `assets/models/env/floor_a.glb` over HTTP 200, listener killed, port closed
  (netstat). Boot: the mirror renders and plays offline — character creation,
  the Forgotten Ossuary, combat with risen skeletons, death/resurrect; cover
  and boot evidence in `docs/`. Rebuild with `node tools/derive.mjs`.
- (The `update.mjs` line above is the **2026-10-13** result. The origin changed
  shape on 2026-11-01; the probe was re-pointed to the launch API, the
  platform-embed drift it found was refreshed the same day, and the probe again
  reports `up to date: 414 captured files identical upstream` — see
  *Updating from upstream* and *2026-11-01 refresh*.)

## Mirror conventions

- **Capture layer** — the captured files are byte-exact copies of what the
  origin served; nothing in them is edited.
- **Readable layer** — `readable/` is derived (prettified) and never shipped to
  a browser; it exists so the bundles can actually be read.
- **Payload rule** — `olbaid_bg.wasm` and every asset are recorded hashed, never
  rewritten; vendor files stay byte-exact as served.
- **Provenance** — `.upstream/manifest.json` records sha256 for each captured
  artifact, and `tools/verify.mjs` re-checks it.
- **Drift** — `tools/update.mjs` is read-only: it reports what changed upstream
  and never rewrites the capture. It resolves the build from the current markup
  and the launch API; if either changes shape it exits 2 with the missing field
  named rather than reporting a false "up to date".

## Fleet status

<!-- mirror-status:start — feeds _standard/REPO-INDEX.md. Update ONLY your own mirror's block; never edit the shared index (PLAN §8). Rebuild: node _standard/build-index.mjs -->
<!-- cols: cls=classification · ver=verify 0 problems · upd=drift probe · man=manifest · rdbl=readable re-derived · src=reversed src · boot=boot test · top=offline-mirror topic · tag=backup tag · staged=staged not committed -->
| # | repo | cls | ver | upd | man | rdbl | src | boot | top | tag | staged |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 311 | blood-slayers | mirror | ✓ | ✓ 2026-11-01 refresh (platform embed runtime re-captured: embed/embed.css/embed.js; game build 0a5301b2 unchanged; probe now up to date) | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
<!-- mirror-status:end -->
