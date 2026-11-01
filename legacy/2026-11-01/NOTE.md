# legacy/2026-11-01 — superseded bytes (platform embed-runtime refresh)

Rollback copy of every file this refresh replaced. Previous commits plus this
directory are the rollback path; nothing here is deleted from history.

The **game build did not change** (`fnv32(gameBuild._id)` still `0a5301b2`,
build 20 / v1.1.1): `index.html`, `olbaid.js`, `sw-embed.js`, `olbaid_bg.wasm`
and all 410 assets reproduce byte-for-byte. Only the **platform embed runtime**
drifted (wavedash.com became a SvelteKit portal and the embed shell gained a
`sessionToken` and a +34 KB SDK):

| path | bytes (old -> new) | sha256 (old) |
|---|---|---|
| `embed` | 1776 -> 1776 | `b2943f7b…` (dynamic: rotating JWT/sessionToken) |
| `embed.css` | 9831 -> 9884 | `ab8c6ec5…` |
| `embed.js` | 732728 -> 766951 | `0c3bd2aa…` |

Derived layers re-cut from the new capture are archived here too:

- `readable/embed.pretty.js` (23054 -> 24093 lines)
- `readable/embed.pretty.css` (636 -> 640 lines)
- `readable/embed-inline-1.pretty.js`
- `readable/index-inline-map.json`
- `src/embed-inline-1-01.js`
- `split-spec.json`

`SHA256SUMS` records the sha256 of every archived file (`sha256sum -c` verifies
them). Paths mirror the repo layout.
