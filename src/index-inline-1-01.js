// index-inline-1 01 — addeventlistener
// Lines 1-29 of readable/index-inline-1.pretty.js (statement-aligned).
// iOS: block pinch/double-tap zoom gestures inside the game.
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault());
document
  .getElementById("rotate")
  .addEventListener("click", (e) => e.currentTarget.classList.remove("on"));
// Browsers (iOS especially) start audio suspended until a user gesture: resume every
// AudioContext the engine creates on the first touch/click/key.
(function () {
  const ctxs = [];
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const Patched = function (...a) {
    const c = new AC(...a);
    ctxs.push(c);
    return c;
  };
  Patched.prototype = AC.prototype;
  window.AudioContext = Patched;
  if (window.webkitAudioContext) window.webkitAudioContext = Patched;
  const unlock = () => {
    ctxs.forEach((c) => {
      if (c.state !== "running") c.resume().catch(() => {});
    });
  };
  ["touchend", "pointerup", "keydown", "click"].forEach((ev) =>
    document.addEventListener(ev, unlock, { capture: true, passive: true }),
  );
})();
