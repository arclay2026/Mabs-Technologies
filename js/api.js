/* =====================================================================
   MABS TECHNOLOGIES — SHOP BACKEND CONNECTION (PHP + MySQL, see api/)
   ---------------------------------------------------------------------
   Loaded on every page right after catalog.js. It loads the live
   catalogue (products, stock, prices, brands, departments, delivery
   settings) from api/catalogue.php, then starts the page's own scripts
   (listed in this tag's data-load attribute).
   The catalogue is cached for 5 minutes per tab so pages stay quick.
   If the backend can't be reached, or the site is on a host that can't
   run PHP (e.g. GitHub Pages), the built-in catalogue in catalog.js is
   used so the shop never goes blank.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var base = (M.store && M.store.api) || "";
  var me = document.currentScript;
  // page scripts get the same ?v= as this tag, so a new release never mixes old and new files
  var version = ((me && me.getAttribute("src")) || "").split("?")[1] || "";
  var pageScripts = ((me && me.getAttribute("data-load")) || "").split(/\s+/).filter(Boolean)
    .map(function (src) { return version ? src + "?" + version : src; });
  var CACHE_KEY = "mabs.catalogue.v2", CACHE_MS = 5 * 60 * 1000, TIMEOUT_MS = 6000;

  M.api = { enabled: !!base && !!window.fetch, source: "built-in" };

  // call an endpoint; rejects with err.code set to the server's error (e.g. "OUT_OF_STOCK")
  M.api.request = function (path, opts) {
    opts = opts || {};
    var headers = { Accept: "application/json" };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(base.replace(/\/*$/, "/") + path, {
      method: opts.method || "GET", headers: headers, credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined, signal: opts.signal
    }).then(function (r) {
      var json = /json/.test(r.headers.get("Content-Type") || "");
      return r.text().then(function (t) {
        var data = null;
        try { data = json && t ? JSON.parse(t) : null; } catch (e) { /* not JSON */ }
        if (!r.ok || !data) {
          var err = new Error((data && data.error) || "HTTP " + r.status);
          err.status = r.status; err.code = data && data.error; err.data = data;
          throw err;
        }
        return data;
      });
    });
  };

  // forget the cached catalogue (after an order, so stock is fresh)
  M.api.refresh = function () { try { sessionStorage.removeItem(CACHE_KEY); } catch (e) { /* storage unavailable */ } };

  function valid(d) {
    return d && Array.isArray(d.products) && d.products.length && Array.isArray(d.brands) && Array.isArray(d.categories);
  }

  function apply(d) {
    var art = {};
    M.categories.forEach(function (c) { art[c.id] = c.art; }); // department drawings stay in catalog.js
    M.categories = d.categories.map(function (c) {
      return { id: c.id, name: c.name, blurb: c.blurb || "", art: art[c.id] || { kind: "laptop", color: "#64748b" } };
    });
    M.brands = d.brands;
    M.products = d.products;
    if (d.delivery) M.store.delivery = d.delivery;
    M.api.source = "server";
  }

  function loadCatalogue() {
    if (!M.api.enabled) return Promise.resolve();
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.t < CACHE_MS && valid(cached.d)) { apply(cached.d); return Promise.resolve(); }
    } catch (e) { /* no cache */ }
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    return M.api.request("catalogue.php", { signal: ctl && ctl.signal }).then(function (d) {
      clearTimeout(timer);
      if (!valid(d)) throw new Error("unexpected catalogue");
      apply(d);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* storage full */ }
    }).catch(function (err) {
      clearTimeout(timer);
      if (window.console) console.info("Mabs: shop backend not available, showing the built-in catalogue.", err.message);
    });
  }

  /* ---------- loading skeletons ----------
     Grey placeholder shapes in the page's main areas while the catalogue
     loads; each page's script replaces them with the real content. */
  function sk(cls) { return '<span class="sk ' + cls + '"></span>'; }
  function skCard(rich) {
    return '<div class="sk-card" aria-hidden="true">' + sk("sk-media") + '<div class="sk-body">' +
      sk("sk-line") + sk("sk-line sk-w60") + (rich ? sk("sk-line sk-w35") : "") + sk("sk-line sk-price") +
      (rich ? sk("sk-line sk-w50") + sk("sk-line sk-w45") + sk("sk-btn") : "") + "</div></div>";
  }
  function fill(id, html) {
    var el = document.getElementById(id);
    if (el && !el.children.length) { el.innerHTML = html; el.setAttribute("aria-busy", "true"); }
  }
  function repeat(n, f) { var out = ""; for (var i = 0; i < n; i++) out += f(i); return out; }
  var searching = /[?&]q=[^&]/.test(location.search);
  function paintSkeletons() {
    var grid = document.getElementById("grid");
    if (grid && searching) { // the search layout, as the results will use: sidebar + detailed cards
      grid.classList.add("grid-rich");
      var shop = document.getElementById("shop");
      if (shop) shop.classList.add("is-search");
      document.body.classList.add("is-searching");
      fill("f-cats", repeat(4, function () { return sk("sk-line sk-w70 sk-filter"); }));
      fill("f-brands", repeat(6, function () { return sk("sk-line sk-w60 sk-filter"); }));
    }
    fill("grid", '<p class="sr-only" role="status">Loading products…</p>' + repeat(12, function () { return skCard(searching); }));
    fill("brand-track", repeat(9, function () { return sk("sk-logo"); }));
    fill("deal-rail", repeat(6, function () { return skCard(false); }));
    fill("cat-grid", repeat(4, function () { return '<div class="sk-tile" aria-hidden="true">' + sk("sk-tile-art") + '<div class="sk-body">' + sk("sk-line sk-w50") + sk("sk-line sk-w70") + "</div></div>"; }));
    fill("product", '<p class="sr-only" role="status">Loading product…</p><div class="sk-crumbs">' + sk("sk-line sk-w20") + "</div>" +
      '<div class="pdp" aria-hidden="true"><section class="pdp-panel pdp-hero">' + sk("sk-square") +
        '<div class="sk-stack">' + sk("sk-line sk-w20") + sk("sk-title") + sk("sk-line sk-w70") + sk("sk-gap") +
          repeat(4, function () { return sk("sk-line sk-w80"); }) + "</div></section>" +
        '<aside class="pdp-side"><section class="pdp-panel sk-stack">' + sk("sk-title sk-w50") + sk("sk-line sk-w70") + sk("sk-block") +
          sk("sk-btn") + sk("sk-btn") + sk("sk-btn") + "</section></aside></div>");
    fill("cart-root", '<p class="sr-only" role="status">Loading your cart…</p><div class="cart-layout" aria-hidden="true"><div class="cart-lines">' +
      repeat(2, function () { return '<div class="sk-row">' + sk("sk-thumb") + '<div class="sk-stack">' + sk("sk-line sk-w60") + sk("sk-line sk-w40") + sk("sk-line sk-w50") + "</div></div>"; }) +
      '</div><div class="cart-side"><div class="sk-row sk-stack">' + sk("sk-title sk-w50") + sk("sk-block") + sk("sk-line") + sk("sk-line") + sk("sk-btn") + "</div></div></div>");
  }
  paintSkeletons();
  var paintedAt = Date.now();

  // run the page's scripts in order once the catalogue is ready
  function startPage() {
    var i = 0;
    (function next() {
      if (i >= pageScripts.length) { // page drawn: the skeletons are gone
        document.querySelectorAll("[aria-busy]").forEach(function (el) { el.removeAttribute("aria-busy"); });
        return;
      }
      var s = document.createElement("script");
      s.src = pageScripts[i++];
      s.onload = s.onerror = next;
      document.body.appendChild(s);
    })();
  }

  // search results keep their skeleton for a moment, so the change of results is
  // seen even when the catalogue comes straight from the cache
  function whenReady() {
    var wait = searching ? Math.max(0, 350 - (Date.now() - paintedAt)) : 0;
    setTimeout(startPage, wait);
  }
  loadCatalogue().then(whenReady, whenReady);
})();
