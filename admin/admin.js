/* =====================================================================
   MABS TECHNOLOGIES — ADMIN PANEL HELPERS (browser)
   Draws the shop's product drawings (js/catalog.js) wherever a page has
   <span class="art" data-art data-kind data-color data-body>, and redraws
   one when the picture or colour beside it changes (inside [data-art-row]).
   ===================================================================== */
(function () {
  "use strict";
  function start() {
    var M = window.MABS;
    if (!M || !M.art) return;
    function paint(el) {
      el.innerHTML = M.art({ kind: el.getAttribute("data-kind"), color: el.getAttribute("data-color") || undefined, body: el.getAttribute("data-body") || undefined });
    }
    document.querySelectorAll("[data-art]").forEach(paint);
    function update(e) {
      var row = e.target.closest && e.target.closest("[data-art-row]");
      var el = row && row.querySelector("[data-art]");
      if (!el) return;
      var name = e.target.name || "";
      if (/kind\]?$/.test(name)) el.setAttribute("data-kind", e.target.value);
      else if (/colou?r\]?$/.test(name)) el.setAttribute("data-color", e.target.value);
      else if (/body\]?$/.test(name)) el.setAttribute("data-body", e.target.value);
      else return;
      paint(el);
    }
    document.addEventListener("input", update);
    document.addEventListener("change", update);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

/* show / hide a password (the admin sign-in) */
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-pw-toggle]");
  if (!b) return;
  var input = document.getElementById(b.getAttribute("data-pw-toggle")), show = input.type === "password";
  input.type = show ? "text" : "password";
  b.setAttribute("aria-pressed", show);
  b.setAttribute("aria-label", show ? "Hide password" : "Show password");
  input.focus();
});
