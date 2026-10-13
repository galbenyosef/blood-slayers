// Local testing: ?mock=1 installs a fake Wavedash SDK so several tabs/iframes can play together.
if (new URLSearchParams(location.search).has("mock") && !window.Wavedash) {
  await import("./mock-wavedash.js");
}
const loader = document.getElementById("loader");
const fill = document.getElementById("fill");
const msg = document.getElementById("msg");
// Called from Rust (src/web.rs) alongside the Wavedash SDK.
window.olbaidProgress = (p) => {
  fill.style.width = `${Math.round(p * 100)}%`;
};
window.olbaidReady = () => {
  loader.style.opacity = "0";
  setTimeout(() => loader.remove(), 700);
  document.getElementById("olbaid-canvas").focus();
};

if (!navigator.gpu) {
  msg.innerHTML =
    "Blood Slayers renders with <b>WebGPU</b>, which this browser doesn't support.<br>" +
    "Please use a current Chrome, Edge or Safari (macOS 26+), or Firefox with WebGPU enabled.";
  fill.style.width = "0%";
} else {
  // Report the (large) wasm download as the first slice of the progress bar.
  window.olbaidProgress(0.02);
  import("./olbaid.js")
    .then(async (m) => {
      try {
        await m.default();
      } catch (e) {
        // winit drives the browser event loop by throwing; that's expected.
        if (!String(e).includes("Using exceptions for control flow")) {
          console.error(e);
          msg.textContent = "Failed to start: " + e;
        }
      }
    })
    .catch((e) => {
      console.error(e);
      msg.textContent = "Failed to load: " + e;
    });
}
