/**
 * Solvio embeddable chat widget loader.
 *
 * Other websites embed the bot with a single tag:
 *
 *   <script src="https://your-app.com/widget.js" async></script>
 *
 * It injects a fixed-position iframe pointing at /embed (same origin as this
 * script) and resizes it in response to postMessage events from that page:
 * small bubble when closed (so the host page stays clickable), full window
 * when open.
 *
 * Single-org with optional per-site knowledge scoping.
 */
(function () {
  "use strict";

  if (window.__solvioWidgetLoaded) return;
  window.__solvioWidgetLoaded = true;

  var WIDGET_MSG_SOURCE = "solvio-widget"; // keep in sync with app/embed/page.tsx

  // Derive the app origin from this script's own URL.
  var current =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();
  var scriptUrl = new URL(current.src);
  var origin = scriptUrl.origin;
  // Optional per-site key from the snippet (widget.js?key=...). Scopes the
  // bot's answers to that site's knowledge; absent ⇒ global behavior.
  var siteKey = scriptUrl.searchParams.get("key") || "";

  // Sized to fit the bubble (56px + padding/shadow) and the chat window.
  // The embedded ChatWindow fills the iframe (minus the /embed page's 16px
  // padding), so these dimensions ARE the widget's on-screen size. maxHeight
  // 100vh keeps it from overflowing short host viewports.
  var CLOSED = { w: "100px", h: "100px" };
  var OPEN = { w: "404px", h: "680px" };

  function px(value, fallback, min, max) {
    var n = Number(value);
    if (!isFinite(n)) n = parseInt(value, 10);
    if (!isFinite(n)) n = fallback;
    n = Math.min(max, Math.max(min, Math.round(n)));
    return n + "px";
  }

  function normalizePosition(position) {
    return position === "bottom-left" ? "bottom-left" : "bottom-right";
  }

  function build() {
    var iframe = document.createElement("iframe");
    // Pass the host origin so the embed page can scope its postMessage calls
    // back to exactly this page instead of "*".
    iframe.src =
      origin +
      "/embed?host=" +
      encodeURIComponent(window.location.origin) +
      (siteKey ? "&key=" + encodeURIComponent(siteKey) : "");
    iframe.title = "Live chat";
    iframe.setAttribute("allow", "clipboard-write");
    var s = iframe.style;
    s.position = "fixed";
    s.bottom = "0";
    s.right = "0";
    s.width = CLOSED.w;
    s.height = CLOSED.h;
    s.maxWidth = "100vw";
    s.maxHeight = "100vh";
    s.border = "0";
    s.background = "transparent";
    // Force light so a dark-mode host OS doesn't make the browser paint a dark
    // base background behind the transparent iframe (black box around the
    // bubble/window). Pair with the transparent background to stay see-through.
    s.colorScheme = "light";
    s.zIndex = "2147483000";
    iframe.allowTransparency = true;
    document.body.appendChild(iframe);

    window.addEventListener("message", function (event) {
      if (event.origin !== origin) return;
      var data = event.data;
      if (!data || data.source !== WIDGET_MSG_SOURCE) return;
      if (data.type === "resize") {
        if (data.widgetWidth || data.widgetHeight) {
          OPEN = {
            w: px(data.widgetWidth, 404, 320, 640),
            h: px(data.widgetHeight, 680, 420, 900),
          };
        }

        if (data.position) {
          if (normalizePosition(data.position) === "bottom-left") {
            iframe.style.left = "0";
            iframe.style.right = "auto";
          } else {
            iframe.style.left = "auto";
            iframe.style.right = "0";
          }
        }

        var dim = data.state === "open" ? OPEN : CLOSED;
        iframe.style.width = dim.w;
        iframe.style.height = dim.h;
      }
    });
  }

  if (document.body) {
    build();
  } else {
    document.addEventListener("DOMContentLoaded", build);
  }
})();
