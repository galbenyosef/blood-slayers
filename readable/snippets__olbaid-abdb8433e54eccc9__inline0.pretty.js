export function wavedash_update_progress(p) {
  if (window.Wavedash && window.Wavedash.updateLoadProgressZeroToOne) {
    window.Wavedash.updateLoadProgressZeroToOne(p);
  }
  if (window.olbaidProgress) {
    window.olbaidProgress(p);
  }
}
export function wavedash_init() {
  if (window.olbaidReady) {
    window.olbaidReady();
  }
  if (window.Wavedash && window.Wavedash.init) {
    window.Wavedash.init({
      debug: false,
      p2p: { messageSize: 16384, maxIncomingMessages: 1024 },
    });
  }
}
export function wavedash_achievement(id) {
  try {
    if (window.Wavedash && window.Wavedash.setAchievement) {
      window.Wavedash.setAchievement(id, true);
    }
  } catch (e) {
    console.warn(e);
  }
}
export function olbaid_url_param(k) {
  try {
    return new URLSearchParams(location.search).get(k) || undefined;
  } catch (_) {
    return undefined;
  }
}
export function olbaid_is_mobile() {
  const ua = navigator.userAgent || "";
  const touch = (navigator.maxTouchPoints || 0) > 1;
  return (
    touch &&
    (/iPhone|iPad|iPod|Android|Mobile/i.test(ua) || /Macintosh/.test(ua))
  );
}
export function olbaid_store_get(k) {
  try {
    return window.localStorage.getItem(k) || undefined;
  } catch (_) {
    return undefined;
  }
}
export function olbaid_store_set(k, v) {
  try {
    window.localStorage.setItem(k, v);
  } catch (_) {}
}
export function olbaid_now() {
  return Date.now();
}
