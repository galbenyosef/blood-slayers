// Character saves for Blood Slayers: written to localStorage on every change and uploaded to
// Wavedash cloud saves (Remote Storage) at key moments. On load the newer of the two wins.
// Imported by the game through wasm-bindgen (src/save.rs).

const KEY = "blood_slayers_saves";
const PATH = "saves/characters.json"; // one path form everywhere (no leading slash)
const MIN_UPLOAD_GAP_MS = 20000; // Wavedash allows 30 uploads/min, 300/hour per player

const state = { started: false, done: false, data: null };
let pending = null; // latest save not yet uploaded
let lastUpload = 0;
let timer = null;
let uploading = false;

const W = () => window.Wavedash;
function cloud() {
  const w = W();
  return !!(w && typeof w.uploadRemoteFile === "function" && typeof w.writeLocalFile === "function" && typeof w.downloadRemoteFile === "function");
}
function stamp(json) {
  if (!json) return -1;
  try { return Number(JSON.parse(json).updated) || 0; } catch (_) { return -1; }
}

export function olbaid_save_start() {
  if (state.started) return;
  state.started = true;
  let local = null;
  try { local = localStorage.getItem(KEY); } catch (_) {}
  const finish = (remote) => {
    if (state.done) return;
    state.data = stamp(remote) > stamp(local) ? remote : local;
    state.done = true;
  };
  if (!cloud()) { finish(null); return; }
  // Don't hold the player hostage to a slow network: fall back to the local copy.
  const giveUp = setTimeout(() => finish(null), 7000);
  (async () => {
    let remote = null;
    try {
      const dl = await W().downloadRemoteFile(PATH);
      if (dl && dl.success) {
        const bytes = await W().readLocalFile(PATH);
        if (bytes) remote = new TextDecoder().decode(bytes);
      }
    } catch (e) { console.warn("cloud save: download failed", e); }
    clearTimeout(giveUp);
    finish(remote);
  })();
}

export function olbaid_save_ready() { return state.done; }
export function olbaid_save_data() { return state.data == null ? undefined : state.data; }
export function olbaid_save_cloud() { return cloud(); }

export function olbaid_save_write(json, upload) {
  try { localStorage.setItem(KEY, json); } catch (_) {}
  pending = json;
  if (upload) schedule();
}

function schedule() {
  if (timer || !cloud()) return;
  const wait = Math.max(0, MIN_UPLOAD_GAP_MS - (Date.now() - lastUpload));
  timer = setTimeout(upload, wait);
}

async function upload() {
  timer = null;
  if (uploading || pending == null || !cloud()) return;
  const json = pending;
  uploading = true;
  lastUpload = Date.now();
  try {
    const ok = await W().writeLocalFile(PATH, new TextEncoder().encode(json));
    if (ok) {
      const r = await W().uploadRemoteFile(PATH);
      if (r && r.success) {
        if (pending === json) pending = null;
      } else {
        console.warn("cloud save: upload failed", r && r.message);
      }
    }
  } catch (e) { console.warn("cloud save: upload failed", e); }
  uploading = false;
  if (pending != null && pending !== json) schedule();
}

// Leaving the page: push whatever hasn't reached the cloud yet (small saves go out with keepalive).
function flush() { if (pending != null) upload(); }
window.addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
