// capture.mjs — (re)fetch the BLOOD SLAYERS build closure into the repo root.
// usage: node tools/capture.mjs [--dry-run] [--only <path> …]
//
// This is the reproducible record of HOW the capture was assembled (2026-10-13)
// and the refresh path (PLAN §3): it boots the same platform session a browser
// would (see tools/update.mjs for the full mechanics write-up), fetches every
// file of the candidate universe and writes it at its served path (repo root =
// the CDN host root). Afterwards re-cut the record:
//
//   node tools/capture.mjs
//   node tools/make-manifest.mjs . .upstream/manifest.json
//   node tools/derive.mjs && node tools/audit.js && node tools/verify.mjs
//
// The candidate universe below was reconstructed from two independent sources
// and is closed against the live build (2026-10-13):
//   1. the runtime network log of a full browser session (the page's own
//      fetch()/resource record: 242 CDN URLs), and
//   2. the game's embedded tables (the Rust wasm carries the campaign region
//      list and the full scene-object name table — 9 themed environment sets
//      plus the generic crypt set, the 17 monster keys, the 29 gear looks and
//      every icon/UI/audio name — compiled in via include_str!).
// Every candidate was probed; 404s are NOT shipped (the probe list includes a
// few deliberate cross-product entries that turned out absent, e.g. the
// theme_wall_c variant exists only for drowned/thorn/foundry/abyss and staves
// exist only for the sorcerer body). `--dry-run` probes without writing.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const DRY = process.argv.includes("--dry-run");
// `--only a b c` restricts the fetch to the named paths (a targeted re-capture);
// no --only means the full candidate universe (the closure refresh).
const onlyAt = process.argv.indexOf("--only");
const ONLY = onlyAt >= 0 ? process.argv.slice(onlyAt + 1) : null;
const ORIGIN = "https://wavedash.com";
const PAGE = "/games/blood-slayers";
const GAME_SLUG = "blood-slayers";
const LAUNCH_ENDPOINTS = ["/embed/api/game-launch", "/api/game-launch"];
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

// ── candidate universe (runtime list ∪ wasm-embedded tables) ────────────
const ENGINE = ["index.html", "olbaid.js", "olbaid_bg.wasm", "embed", "embed.js", "embed.css", "sw-embed.js",
  "snippets/olbaid-abdb8433e54eccc9/inline0.js", "snippets/olbaid-abdb8433e54eccc9/web/olbaid_net.js",
  "snippets/olbaid-abdb8433e54eccc9/web/olbaid_save.js"];
const ENV_GENERIC = ["floor_a", "floor_b", "floor_c", "wall", "wall_b", "wall_low", "wall_door", "pillar", "pillar_low",
  "torch_wall", "brazier", "candles", "chest", "chest_lid", "bones_pile", "rubble", "weapon_rack", "sarcophagus",
  "throne", "iron_gate", "lever", "lever_floor", "lever_handle", "bone_gate", "chest_ornate", "chest_ornate_lid",
  "chest_vault", "chest_vault_lid", "decal_rug", "decal_blood", "decal_cracks", "decal_moss", "decal_roots",
  "decal_ash", "decal_puddle", "decal_seaweed", "decal_petals", "barrel", "crate", "banner", "cavern_pool"];
const THEMES = ["catacomb", "cathedral", "sunken", "hellforge", "cavern", "drowned", "thorn", "foundry", "abyss"];
const THEME_PARTS = ["floor_a", "floor_b", "floor_c", "wall", "wall_b", "wall_c", "wall_low", "pillar", "pillar_low"];
const THEME_EXTRAS = {
  catacomb: ["urn", "skullpile"], cathedral: ["pew", "altar", "statue"], sunken: ["grate", "debris"],
  hellforge: ["anvil", "cauldron", "cage"], cavern: ["stalagmites", "mushrooms", "crystals", "boulders"],
  drowned: ["bell", "anchor", "ribs", "nets", "coral", "statue"], thorn: ["briar", "shrine", "reliquary", "choir", "roses", "censer"],
  foundry: ["crucible", "anvil", "chains", "bellows", "gears", "quench"], abyss: ["crystal", "sealstone", "chains", "shards", "bones", "eye"],
};
const MONSTERS = ["hero", "sorcerer", "skeleton_warrior", "skeleton_archer", "ghoul", "drowned_thrall", "tidecaller",
  "drowned_warden", "thorn_penitent", "weeping_chorister", "weeping_saint", "ash_smith", "cinder_hurler",
  "forgemaster", "hollow_sentinel", "abyss_seer", "void_spawn", "hollow_king", "boss", "skeleton_parts"];
const HERO_LOOKS = ["sword_notched", "sword_runed", "sword_flamberge", "axe_bearded", "axe_double", "axe_skullsplitter",
  "mace_spiked", "mace_hammer", "helm_spangen", "helm_wolf", "helm_horned", "helm_warden_crown", "chest_leather",
  "chest_plate", "chest_scale", "chest_bulwark", "gloves_wraps", "gloves_gauntlet", "gloves_hellforged", "boots_fur",
  "boots_greaves", "boots_stormstride"];
const SORCERER_LOOKS = ["staff_gnarled", "staff_bone", "staff_crystal", "staff_voidstar", "helm_spangen", "helm_wolf",
  "helm_horned", "helm_warden_crown", "helm_cowl", "helm_circlet", "chest_leather", "chest_plate", "chest_scale",
  "chest_mantle", "gloves_wraps", "gloves_gauntlet", "gloves_hellforged", "boots_fur", "boots_greaves", "boots_stormstride"];
const ICON_LOOKS = [...HERO_LOOKS, "staff_gnarled", "staff_bone", "staff_crystal", "staff_voidstar", "helm_cowl", "helm_circlet", "chest_mantle"];
const SKILLS = ["cleave", "whirlwind", "leap_slam", "war_cry", "arcane_bolt", "fireball", "arc_lightning", "blink", "frost_nova"];
const UI = ["orb_frame.png", "hud_bar.png", "skill_slot.png", "panel.png", "tooltip.png", "cursor.png", "worldmap.jpg",
  "worldmap_blank.jpg", "cutscene_seal.jpg", "cutscene_wardens.jpg", "cutscene_drowned.jpg", "cutscene_thorn.jpg",
  "cutscene_foundry.jpg", "cutscene_abyss.jpg", "intro_kingdom.jpg", "intro_binding.jpg", "ending_fall.jpg",
  "ending_dawn.jpg", "map_fog.png", "map_token.png"];
const AUDIO = ["spell_bolt_cast", "spell_bolt_hit", "fireball_cast", "fireball_explode", "lightning_loop", "frost_nova",
  "blink", "mana_empty", "swing_1", "swing_2", "swing_3", "hit_flesh_1", "hit_flesh_2", "hit_flesh_3", "hit_bone_1",
  "hit_bone_2", "hit_bone_3", "bone_break", "footstep_1", "footstep_2", "footstep_3", "footstep_4", "whirlwind_loop",
  "leap_land", "war_cry", "skeleton_attack", "arrow_shoot", "arrow_hit", "ghoul_screech", "boss_roar", "boss_slam",
  "gold_pickup", "item_drop", "legendary_drop", "potion", "level_up", "ui_click", "ui_open", "torch_loop",
  "ambient_loop", "player_death", "stairs", "gate_open", "lever_pull", "chest_open", "vault_unlock", "key_pickup",
  "thrall_attack", "water_bolt", "water_hit", "bell_toll", "penitent_attack", "hymn_bolt", "hymn_hit", "choir_hum",
  "smith_attack", "ember_throw", "ember_hit", "forge_hammer", "sentinel_attack", "spawn_screech", "void_bolt",
  "void_hit", "void_hum"];
const AUDIO_MP3 = ["music_village", "intro_theme", "ending_theme", "cutscene_theme", "music/demons_lair_a", "music/demons_lair_b",
  "music/demons_lair_c", "music/the_pit_a", "music/the_pit_b"];

function candidates() {
  const c = new Set(ENGINE);
  for (const n of ENV_GENERIC) c.add(`assets/models/env/${n}.glb`);
  for (const t of THEMES) {
    for (const p of THEME_PARTS) c.add(`assets/models/env/${t}_${p}.glb`);
    for (const e of THEME_EXTRAS[t]) c.add(`assets/models/env/${t}_${e}.glb`);
  }
  for (const f of ["floor_a", "floor_b", "floor_c"]) c.add(`assets/models/env/${f}_depth.png`);
  for (const m of MONSTERS) c.add(`assets/models/characters/${m}.glb`);
  for (const i of ["ring", "amulet", "gold", "potion"]) c.add(`assets/models/items/${i}.glb`);
  for (const l of HERO_LOOKS) c.add(`assets/models/gear/hero/${l}.glb`);
  for (const l of SORCERER_LOOKS) c.add(`assets/models/gear/sorcerer/${l}.glb`);
  for (const l of new Set(ICON_LOOKS)) c.add(`assets/icons/item_${l}.png`);
  for (const s of SKILLS) c.add(`assets/icons/skill_${s}.png`);
  for (const k of ["barbarian", "sorcerer"]) c.add(`assets/icons/class_${k}.png`);
  for (const u of UI) c.add(`assets/ui/${u}`);
  for (const a of AUDIO) c.add(`assets/audio/${a}.wav`);
  for (const a of AUDIO_MP3) c.add(`assets/audio/${a}.mp3`);
  for (const v of ["01", "02", "03", "04", "05"]) c.add(`assets/audio/voice/${v}.mp3`);
  c.add("assets/fonts/Cinzel.ttf");
  c.add("assets/fonts/CinzelDecorative-Bold.ttf");
  for (const s of ["orb", "fx", "occluder", "spell", "character"]) c.add(`assets/shaders/${s}.wgsl`);
  return [...c].sort();
}

// ── bootstrap (same mechanics as tools/update.mjs — launch API) ─────────
// 2026-11-01: the game page is a SvelteKit portal and no longer server-renders
// `playKey`; the per-load bootstrap (playKey + userId + the authoritative
// gameBuild/gameCloud) is minted by the player's launch endpoint using the
// anonymous session cookies the page load sets. See tools/update.mjs.
async function get(url, headers) {
  const r = await fetch(url, { headers: { ...UA, ...(headers || {}) } });
  return { status: r.status, buf: r.ok ? Buffer.from(await r.arrayBuffer()) : null, headers: r.headers };
}
const setCookies = (h) =>
  typeof h.getSetCookie === "function" ? h.getSetCookie() : [h.get("set-cookie")].filter(Boolean);
const page = await get(ORIGIN + PAGE);
if (page.status !== 200) {
  console.error(`live page -> HTTP ${page.status}`);
  process.exit(2);
}
const html = page.buf.toString("utf8");
const ssrCloudId = /gameCloud:\{.*?_id:"([^"]+)"/.exec(html)?.[1];
const ssrBuildId = /gameBuild:\{.*?_id:"([^"]+)"/.exec(html)?.[1];
const engine = /gameBuild:\{.*?engine:"([^"]+)"/.exec(html)?.[1] || "CUSTOM";
const entrypoint = /gameBuild:\{.*?entrypoint:"([^"]+)"/.exec(html)?.[1] || "index.html";
const cookie = setCookies(page.headers).map((c) => c.split(";")[0]).join("; ");
if (!ssrCloudId || !ssrBuildId || !cookie) {
  console.error("could not read the SSR bootstrap/session cookies from the game page");
  process.exit(2);
}
let launch = null;
for (const ep of LAUNCH_ENDPOINTS) {
  const r = await fetch(ORIGIN + ep, {
    method: "POST",
    headers: { ...UA, "Content-Type": "application/json", Origin: ORIGIN, Referer: ORIGIN + "/embed/games/" + GAME_SLUG, Cookie: cookie },
    body: JSON.stringify({ gameSlug: GAME_SLUG }),
  });
  if (r.status === 200) {
    try { launch = JSON.parse(await r.text()); break; } catch { /* try next endpoint */ }
  }
}
if (!launch || !launch.playKey || !launch.userId || !launch.gameBuild?._id || !launch.gameCloud?._id) {
  console.error("could not mint the per-load bootstrap from the launch API");
  process.exit(2);
}
if (launch.gameBuild._id !== ssrBuildId || launch.gameCloud._id !== ssrCloudId) {
  console.error("launch build does not match the SSR markup — refusing to capture");
  process.exit(2);
}
const playKey = launch.playKey;
const gameCloudId = launch.gameCloud._id;
const gameBuildId = launch.gameBuild._id;
const anon = launch.anonymousUser || {};
const anonId = anon.id || launch.userId;
const anonName = anon.username || "anonymous";
const host = `${gameCloudId}-${fnv32(launch.userId)}-${fnv32(gameBuildId)}.builds.wavedashcdn.com`;
const sdk = JSON.stringify({ convexCloudUrl: "https://convex-api.wavedash.com", wavedashUser: { id: anonId, username: anonName }, gameCloudId, ugcHost: "ugc.wavedashcdn.com", uploadsHost: "uploads.wavedash.com", launchParams: {}, parentOrigin: ORIGIN, initialVolume: 1 });
const embed = await get(`https://${host}/embed?entrypoint=${encodeURIComponent(entrypoint)}&engine=${encodeURIComponent(engine)}&pk=${playKey}&sdkconfig=${encodeURIComponent(sdk)}&gameSlug=${GAME_SLUG}`);
const jwt = embed.status === 200 ? /gameplayJwt":"([^"]+)"/.exec(embed.buf.toString("utf8"))?.[1] : null;
if (!jwt) {
  console.error(`live embed -> HTTP ${embed.status}, no gameplayJwt`);
  process.exit(2);
}
console.log(`build ${fnv32(gameBuildId)} @ ${host}`);

// ── fetch ───────────────────────────────────────────────────────────────
const list = ONLY ? ONLY : candidates();
console.log(`candidates: ${list.length}${ONLY ? " (--only: targeted re-capture)" : ""}${DRY ? " (dry run — no writes)" : ""}`);
const results = [];
let i = 0;
let done = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < list.length) {
    const p = list[i++];
    try {
      const r = await get(`https://${host}/${p}`, { Authorization: `Bearer ${jwt}`, "X-Wd-Sw": "jwt" });
      if (r.status === 200) {
        if (!DRY) {
          const dst = path.join(proj, p);
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.writeFileSync(dst, r.buf);
        }
        results.push({ p, status: 200, bytes: r.buf.length });
      } else results.push({ p, status: r.status });
    } catch (e) {
      results.push({ p, status: 0, err: String(e) });
    }
    if (++done % 50 === 0) console.log(`  ${done}/${list.length}`);
  }
}));
const ok = results.filter((r) => r.status === 200);
const missing = results.filter((r) => r.status !== 200);
console.log(`captured ${ok.length} file(s), ${ok.reduce((a, b) => a + b.bytes, 0)} bytes; ${missing.length} absent:`);
for (const m of missing) console.log(`  ${m.status} ${m.p}`);
console.log("note: `embed` (JWT-bearing shell) and olbaid.js's 404 probe for mock-wavedash.js are expected shapes.");
if (!DRY) console.log("next: node tools/make-manifest.mjs . .upstream/manifest.json && node tools/derive.mjs && node tools/audit.js");
