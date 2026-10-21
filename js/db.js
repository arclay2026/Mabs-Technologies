/* =====================================================================
   MABS TECHNOLOGIES — DATABASE CONNECTION (Supabase)
   ---------------------------------------------------------------------
   Loaded on every page right after catalog.js. When MABS.store.supabase
   has a URL and key, it loads the catalogue (products, brands,
   departments, delivery settings) from the database, then starts the
   page's own scripts (listed in this tag's data-load attribute).
   The catalogue is cached for 5 minutes per tab so pages stay quick;
   if the database can't be reached, the built-in catalogue in
   catalog.js is used so the shop never goes blank.
   Talks to Supabase's REST API directly with the publishable key; the
   database's row-level security decides what that key may do.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var cfg = (M.store && M.store.supabase) || {};
  var me = document.currentScript;
  var pageScripts = ((me && me.getAttribute("data-load")) || "").split(/\s+/).filter(Boolean);
  var CACHE_KEY = "mabs.catalogue.v1", CACHE_MS = 5 * 60 * 1000, TIMEOUT_MS = 6000;

  M.db = { enabled: !!(cfg.url && cfg.key), source: "built-in" };

  // call the REST API; rejects with the database's error message (e.g. "OUT_OF_STOCK:jbl-flip-6")
  M.db.api = function (path, opts) {
    opts = opts || {};
    var headers = { apikey: cfg.key, Accept: "application/json" };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(cfg.url.replace(/\/+$/, "") + "/rest/v1/" + path, {
      method: opts.method || "GET", headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined, signal: opts.signal
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { /* not JSON */ }
        if (!r.ok) {
          var err = new Error((data && data.message) || "HTTP " + r.status);
          err.status = r.status; err.data = data;
          throw err;
        }
        return data;
      });
    });
  };

  // forget the cached catalogue (after an order, so stock is fresh)
  M.db.refresh = function () { try { sessionStorage.removeItem(CACHE_KEY); } catch (e) { /* storage unavailable */ } };

  // database rows → the shapes the site already uses
  function apply(d) {
    var brandName = {};
    d.brands.forEach(function (b) { brandName[b.id] = b.name; });
    var art = {};
    M.categories.forEach(function (c) { art[c.id] = c.art; }); // department drawings stay in catalog.js
    M.categories = d.categories.map(function (c) {
      return { id: c.id, name: c.name, blurb: c.blurb || "", art: art[c.id] || { kind: "laptop", color: "#64748b" } };
    });
    M.brands = d.brands.filter(function (b) { return b.logo_url; }).map(function (b) {
      return { name: b.name, logo: b.logo_url, h: b.logo_height || 24 };
    });
    M.products = d.products.map(function (p) {
      return {
        id: p.id, name: p.name, brand: brandName[p.brand_id] || p.brand_id, category: p.category_id, type: p.type,
        price: +p.price, was: p.was_price != null ? +p.was_price : undefined, stock: p.stock,
        featured: !!p.featured, badge: p.badge || undefined, summary: p.summary || "", specs: p.specs || [],
        image: p.image_url || undefined, art: p.art || { kind: "phone", color: "#64748b" }
      };
    });
    if (d.settings) {
      M.store.delivery = { courierFee: +d.settings.courier_fee, freeOver: +d.settings.free_over, collect: !!d.settings.collect };
    }
    M.db.source = "database";
  }

  function loadCatalogue() {
    if (!M.db.enabled || !window.fetch) return Promise.resolve();
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.t < CACHE_MS) { apply(cached.d); return Promise.resolve(); }
    } catch (e) { /* no cache */ }
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    var o = { signal: ctl && ctl.signal };
    return Promise.all([
      M.db.api("products?select=*&active=eq.true&order=sort", o),
      M.db.api("brands?select=*&order=sort", o),
      M.db.api("categories?select=*&order=sort", o),
      M.db.api("store_settings?select=*", o)
    ]).then(function (r) {
      clearTimeout(timer);
      var d = { products: r[0] || [], brands: r[1] || [], categories: r[2] || [], settings: (r[3] || [])[0] };
      if (!d.products.length) throw new Error("no products returned");
      apply(d);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* storage full */ }
    }).catch(function (err) {
      clearTimeout(timer);
      if (window.console) console.warn("Mabs: couldn't reach the database, showing the built-in catalogue.", err);
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
