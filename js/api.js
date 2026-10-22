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
  var pageScripts = ((me && me.getAttribute("data-load")) || "").split(/\s+/).filter(Boolean);
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

  // run the page's scripts in order once the catalogue is ready
  function startPage() {
    var i = 0;
    (function next() {
      if (i >= pageScripts.length) return;
      var s = document.createElement("script");
      s.src = pageScripts[i++];
      s.onload = s.onerror = next;
      document.body.appendChild(s);
    })();
  }

  loadCatalogue().then(startPage, startPage);
})();
