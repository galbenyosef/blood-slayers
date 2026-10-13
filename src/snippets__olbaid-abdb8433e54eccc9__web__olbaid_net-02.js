// snippets__olbaid-abdb8433e54eccc9__web__olbaid_net 02 — lobbyid
// Lines 350-494 of readable/snippets__olbaid-abdb8433e54eccc9__web__olbaid_net.pretty.js (statement-aligned).
export function olbaid_net_leave() {
  const id = lobbyId;
  lobbyId = null;
  started = false;
  if (W && id) {
    try {
      W.leaveLobby(id);
    } catch (_) {}
  }
}

export function olbaid_username(id) {
  try {
    return (
      (W && W.getUsername
        ? id
          ? W.getUsername(id)
          : W.getUsername()
        : null) || undefined
    );
  } catch (_) {
    return undefined;
  }
}

// ---- Party & friends ----

/** Leave the current party and join another (a friend's party, an invite). */
export function olbaid_net_join(target) {
  if (!W || !target || target === lobbyId) return;
  (async () => {
    const old = lobbyId;
    try {
      if (old) await W.leaveLobby(old);
    } catch (_) {}
    try {
      const j = await W.joinLobby(target);
      if (j && j.success) return;
      push("toast", "Couldn't join that party");
    } catch (e) {
      push("toast", "Couldn't join that party");
    }
    // Fall back to a party of our own.
    try {
      await W.createLobby(0, MAX_PLAYERS);
    } catch (_) {}
  })();
}

/** Leave the party and start a fresh one of your own. */
export function olbaid_net_new_party() {
  if (!W) return;
  (async () => {
    try {
      if (lobbyId) await W.leaveLobby(lobbyId);
    } catch (_) {}
    try {
      await W.createLobby(0, MAX_PLAYERS);
    } catch (e) {
      push("offline", "create-error");
    }
  })();
}

export function olbaid_net_invite(userId) {
  if (!W || !lobbyId || typeof W.inviteUserToLobby !== "function") return false;
  W.inviteUserToLobby(lobbyId, userId)
    .then((r) =>
      push("toast", r && r.success ? "Invite sent" : "Invite failed"),
    )
    .catch(() => push("toast", "Invite failed"));
  return true;
}

export function olbaid_net_invite_link() {
  if (!W || !lobbyId || typeof W.getLobbyInviteLink !== "function")
    return false;
  W.getLobbyInviteLink(true)
    .then((r) =>
      push(
        "toast",
        r && r.success ? "Invite link copied" : "Couldn't copy the link",
      ),
    )
    .catch(() => {});
  return true;
}

export function olbaid_net_presence(status) {
  try {
    if (W && typeof W.updateUserPresence === "function")
      W.updateUserPresence({ status });
  } catch (_) {}
}

/** Fetch friends and which (compatible) parties they're in; pushes "friends" when done. */
export function olbaid_net_friends_refresh() {
  if (!W || typeof W.listFriends !== "function") return;
  (async () => {
    let list = [];
    try {
      const r = await W.listFriends();
      if (r && r.success && Array.isArray(r.data)) list = r.data;
    } catch (_) {}
    let lobbies = [];
    try {
      const r = await W.listAvailableLobbies(true);
      if (r && r.success && Array.isArray(r.data))
        lobbies = r.data.filter(compatible);
    } catch (_) {}
    const where = new Map();
    for (const l of lobbies) {
      const ids = String((l.metadata && l.metadata.members) || "")
        .split(",")
        .filter(Boolean);
      for (const id of ids) where.set(id, l);
    }
    const out = list.map((f) => {
      const l = where.get(String(f.userId));
      return {
        id: String(f.userId),
        name: f.username || "Friend",
        online: !!f.isOnline,
        lobby: l ? String(l.lobbyId) : "",
        count: l ? l.playerCount : 0,
        max: l ? l.maxPlayers || MAX_PLAYERS : 0,
      };
    });
    out.sort(
      (a, b) =>
        b.online - a.online ||
        (b.lobby ? 1 : 0) - (a.lobby ? 1 : 0) ||
        a.name.localeCompare(b.name),
    );
    friendsJson = JSON.stringify(out);
    push("friends");
  })();
}

export function olbaid_net_friends() {
  return friendsJson;
}
export function olbaid_net_lobby_id() {
  return lobbyId || undefined;
}
