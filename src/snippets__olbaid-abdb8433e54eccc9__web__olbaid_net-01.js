// snippets__olbaid-abdb8433e54eccc9__web__olbaid_net 01 — lobbyid
// Lines 1-349 of readable/snippets__olbaid-abdb8433e54eccc9__web__olbaid_net.pretty.js (statement-aligned).
// OLBAID <-> Wavedash SDK bridge: parties, Quick Play matchmaking + P2P transport.
// You always start in your own party (your world, your progress). Invite links put you in a
// friend's party; Quick Play looks for open parties in regions you've reached.
// Rust polls events/messages every frame (see src/net/mod.rs).

// Lobby compatibility key (protocol + gear catalog hash), set by the game on start.
let PROTO = "1";
const MAX_PLAYERS = 4;
const events = [];
let W = null;
let lobbyId = null;
let started = false;
const enc = new TextEncoder();
// Party members (userId -> username); the host publishes them so friends can find the party.
const members = new Map();
let friendsJson = "[]";

// Events are flat strings: fields separated by \x1f, list items by \x1e, pairs by \x1d.
function push(...fields) {
  events.push(
    fields
      .map((f) => (f === undefined || f === null ? "" : String(f)))
      .join("\x1f"),
  );
}

function listen(name, fn) {
  const ev = W.Events && W.Events[name];
  if (!ev) return;
  if (typeof W.on === "function")
    W.on(ev, (p) =>
      fn(p instanceof Event && p.detail !== undefined ? p.detail : p),
    );
  else if (typeof W.addEventListener === "function")
    W.addEventListener(ev, (e) => fn(e.detail));
}

function metaFields(m) {
  m = m || {};
  return [m.seed, m.depth, m.game, m.v];
}

function amHost() {
  try {
    return !!(W && lobbyId && W.getLobbyHostId(lobbyId) === W.getUserId());
  } catch (_) {
    return false;
  }
}

function publishMembers() {
  if (!amHost()) return;
  try {
    W.setLobbyData(lobbyId, "members", [...members.keys()].join(","));
    W.setLobbyData(lobbyId, "hostname", W.getUsername() || "");
  } catch (_) {}
}

function compatible(l) {
  const m = l && l.metadata;
  return (
    !m ||
    m.game === undefined ||
    (m.game === "olbaid" && String(m.v) === String(PROTO))
  );
}

// Quick Play: the regions (indices) we may be matched into; null when not looking.
let allowed = null;

// Is this party one matchmaking may put us in? (has players, has room, same game version,
// open to strangers, and in a region we've reached)
function joinable(l) {
  const m = l && l.metadata;
  return (
    !!l &&
    l.lobbyId !== lobbyId &&
    l.playerCount > 0 &&
    l.playerCount < (l.maxPlayers || MAX_PLAYERS) &&
    compatible(l) &&
    !!m &&
    String(m.open) === "1" &&
    (!allowed || m.region === undefined || allowed.has(String(m.region)))
  );
}

async function listOpen() {
  try {
    const r = await W.listAvailableLobbies(false);
    if (r && r.success && Array.isArray(r.data)) return r.data.filter(joinable);
  } catch (e) {
    console.warn("listAvailableLobbies failed", e);
  }
  return [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let inGame = false; // set by the game: never pull someone out of a dungeon run
let moving = false;
let rematchTimer = null;

/** Leave our lone party for another; if that fails, open a fresh party of our own. */
async function moveTo(target) {
  if (moving) return false;
  moving = true;
  try {
    const old = lobbyId;
    if (old) {
      try {
        await W.leaveLobby(old);
      } catch (_) {}
    }
    try {
      const j = await W.joinLobby(target);
      if (j && j.success) return true;
    } catch (_) {}
    try {
      await W.createLobby(0, MAX_PLAYERS);
    } catch (_) {}
    return false;
  } finally {
    moving = false;
  }
}

/** Quick Play while alone: keep looking for adventurers and go to them. */
async function rematch() {
  if (!lobbyId || moving || inGame || !allowed) return;
  try {
    if (W.getNumLobbyUsers(lobbyId) !== 1) return;
    if (String(W.getLobbyData(lobbyId, "open")) === "0") return; // Fill off: stay put
    const open = await listOpen();
    // Real parties first (fullest); otherwise meet another lone player: we go to anyone
    // already in the dungeon, and between two lone players in the lobby the larger id moves.
    const target =
      open
        .filter((l) => l.playerCount >= 2)
        .sort((a, b) => b.playerCount - a.playerCount)[0] ||
      open.find((l) => l.metadata && String(l.metadata.ingame) === "1") ||
      open.find((l) => String(l.lobbyId) < String(lobbyId));
    if (target && lobbyId && W.getNumLobbyUsers(lobbyId) === 1) {
      push("toast", "Found adventurers — joining their party");
      if (await moveTo(target.lobbyId)) stopMatching();
    }
  } catch (_) {}
}

function keepMatching() {
  if (rematchTimer) return;
  setTimeout(rematch, 2500);
  rematchTimer = setInterval(rematch, 5000);
}

function stopMatching() {
  allowed = null;
  if (rematchTimer) {
    clearInterval(rematchTimer);
    rematchTimer = null;
  }
}

/** Quick Play: join the fullest open party in one of these regions (csv of indices); if there
 *  is none, our party opens to strangers and we keep looking. */
export async function olbaid_net_quick_play(regionsCsv) {
  if (!W || !lobbyId) return;
  allowed = new Set(
    String(regionsCsv || "")
      .split(",")
      .filter((x) => x !== ""),
  );
  push("toast", "Looking for adventurers…");
  const open = (await listOpen()).sort((a, b) => b.playerCount - a.playerCount);
  for (const l of open) {
    if (await moveTo(l.lobbyId)) {
      stopMatching();
      return;
    }
  }
  push(
    "toast",
    "No open parties right now. Your party is open, so others can find you.",
  );
  push("opened");
  keepMatching();
}

async function matchmake() {
  // 1) An invite link / "join" from Wavedash. The page also keeps the *last* lobby in its URL,
  //    which may be long empty, so only go there if that party really has players.
  try {
    const lp =
      typeof W.getLaunchParams === "function" ? W.getLaunchParams() : null;
    if (lp && lp.lobby) {
      let alive = true;
      if (typeof W.getLobby === "function") {
        try {
          const r = await W.getLobby(lp.lobby);
          alive = !!(
            r &&
            r.success &&
            r.data &&
            r.data.playerCount > 0 &&
            r.data.playerCount < (r.data.maxPlayers || MAX_PLAYERS)
          );
        } catch (_) {
          alive = false;
        }
      }
      if (alive) {
        const j = await W.joinLobby(lp.lobby);
        if (j && j.success) return;
      }
    }
  } catch (e) {
    console.warn("launch lobby join failed", e);
  }
  // 2) Otherwise you start in your own party: your world and your progress. It's listed (so
  //    friends and Quick Play can find it). Strangers may join while Fill is on (the default).
  try {
    const c = await W.createLobby(0, MAX_PLAYERS); // PUBLIC
    if (!c || !c.success) push("offline", "create-failed");
  } catch (e) {
    console.warn("createLobby failed", e);
    push("offline", "create-error");
  }
}

/** The game tells us when the player is in a dungeon run (no auto-moving then). */
export function olbaid_net_set_in_game(v) {
  inGame = !!v;
}

export function olbaid_net_start(version) {
  if (version) PROTO = String(version);
  if (started) return;
  started = true;
  W = window.Wavedash;
  if (!W || typeof W.listAvailableLobbies !== "function") {
    push("offline", "no-sdk");
    return;
  }
  listen("LOBBY_JOINED", (p) => {
    lobbyId = p.lobbyId;
    members.clear();
    for (const u of p.users || [])
      members.set(String(u.userId), u.username || "");
    const users = (p.users || [])
      .map((u) => `${u.userId}\x1d${u.username || ""}`)
      .join("\x1e");
    push(
      "joined",
      p.lobbyId,
      p.hostId,
      W.getUserId(),
      ...metaFields(p.metadata),
      users,
      (p.metadata || {}).ingame,
      (p.metadata || {}).region,
    );
    setTimeout(publishMembers, 300);
  });
  listen("LOBBY_USERS_UPDATED", (p) => {
    if (p.changeType === "LEFT") members.delete(String(p.userId));
    else members.set(String(p.userId), p.username || "");
    push("user", p.userId, p.username, p.changeType);
    setTimeout(publishMembers, 300);
  });
  listen("LOBBY_INVITE", (p) => {
    const s = p.sender || {};
    push(
      "invite",
      p.lobbyId,
      s._id || s.userId || "",
      s.username || "A friend",
    );
  });
  listen("LOBBY_DATA_UPDATED", (p) =>
    push("meta", ...metaFields(p), (p || {}).ingame, (p || {}).region),
  );
  listen("LOBBY_KICKED", () => {
    lobbyId = null;
    push("offline", "kicked");
  });
  listen("P2P_CONNECTION_ESTABLISHED", (p) => push("up", p.userId, p.username));
  listen("P2P_PEER_RECONNECTED", (p) => push("up", p.userId, p.username));
  listen("P2P_PEER_DISCONNECTED", (p) => push("down", p.userId));
  listen("P2P_CONNECTION_FAILED", (p) => push("down", p.userId));
  matchmake();
}

export function olbaid_net_poll_event() {
  return events.length ? events.shift() : undefined;
}

export function olbaid_net_self_id() {
  try {
    return W && W.getUserId ? String(W.getUserId()) : "";
  } catch (_) {
    return "";
  }
}

export function olbaid_net_host_id() {
  try {
    return W && lobbyId ? W.getLobbyHostId(lobbyId) || undefined : undefined;
  } catch (_) {
    return undefined;
  }
}

export function olbaid_net_set_meta(key, value) {
  try {
    if (W && lobbyId) W.setLobbyData(lobbyId, key, value);
  } catch (e) {
    console.warn("setLobbyData", e);
  }
}

export function olbaid_net_send(to, channel, reliable, data) {
  if (!W || !lobbyId) return false;
  const copy = data.slice();
  try {
    if (to) return !!W.sendP2PMessage(to, channel, reliable, copy);
    return !!W.broadcastP2PMessage(channel, reliable, copy);
  } catch (e) {
    return false;
  }
}

// Returns [idLen u8][id utf8][payload] or undefined.
export function olbaid_net_recv(channel) {
  if (!W || !lobbyId) return undefined;
  let m = null;
  try {
    m = W.readP2PMessageFromChannel(channel);
  } catch (_) {
    return undefined;
  }
  if (!m) return undefined;
  const id = enc.encode(String(m.fromUserId));
  const p =
    m.payload instanceof Uint8Array ? m.payload : new Uint8Array(m.payload);
  const out = new Uint8Array(1 + id.length + p.length);
  out[0] = id.length;
  out.set(id, 1);
  out.set(p, 1 + id.length);
  return out;
}

