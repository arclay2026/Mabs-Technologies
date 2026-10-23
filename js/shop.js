/* =====================================================================
   MABS TECHNOLOGIES — STOREFRONT (index.html)
   Brand strip, category tiles, sale rail and the filterable shop grid.
   Shop filters live in the URL (?cat=&q=&brand=&min=&max=&stock=&deals=
   &wish=&sort=, plus product details like &colour=&storage=&screen=) so
   results can be bookmarked and shared.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var esc = M.esc, money = M.money;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- brand logo strip ----------
     One group holds the logos repeated until it is wider than the screen;
     a second identical group follows, and the track slides left by exactly
     one group (-50%) on a loop, so the motion never jumps. Only the first
     set of logos is exposed to keyboards and screen readers. */
  function renderBrands() {
    var track = $("brand-track");
    if (!track || !M.brands) return;
    function logos(copy) {
      return M.brands.map(function (b) {
        var img = '<img src="' + esc(b.logo) + '" alt="' + (copy ? "" : esc(b.name)) + '" style="height:' + b.h + 'px" draggable="false">';
        var stocked = M.products.some(function (p) { return p.brand === b.name; });
        if (!stocked) return '<span class="brand-logo"' + (copy ? ' aria-hidden="true"' : "") + ">" + img + "</span>";
        return '<a class="brand-logo" href="index.html?brand=' + encodeURIComponent(b.name) + '#shop"' +
          (copy ? ' tabindex="-1" aria-hidden="true"' : ' aria-label="Shop ' + esc(b.name) + '"') + ">" + img + "</a>";
      }).join("");
    }
    track.innerHTML = '<div class="marquee-group">' + logos(false) + "</div>";
    var setWidth = track.firstChild.getBoundingClientRect().width;
    if (setWidth < 200) setWidth = 900; // logos not decoded yet; brandsReady() re-measures
    var reps = Math.max(1, Math.ceil(window.innerWidth / setWidth));
    var group = logos(false);
    for (var i = 1; i < reps; i++) group += logos(true);
    var copy = "";
    for (var j = 0; j < reps; j++) copy += logos(true);
    track.innerHTML = '<div class="marquee-group">' + group + '</div><div class="marquee-group" aria-hidden="true">' + copy + "</div>";
    // constant speed whatever the screen size: ~45px per second
    track.style.setProperty("--marquee-time", (setWidth * reps / 45).toFixed(1) + "s");
  }
  var lastW = window.innerWidth, resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (Math.abs(window.innerWidth - lastW) > 80) { lastW = window.innerWidth; renderBrands(); } }, 200);
  });

  /* ---------- homepage carousel ---------- */
  function renderHero() {
    var hero = $("hero");
    var slides = (M.slides || []).filter(function (s) { return s && s.image; });
    if (!slides.length) { // welcome banner until real slides are added
      var pick = function (id) { return M.byId(id) || M.products[0]; };
      hero.classList.add("hero-welcome");
      hero.insertAdjacentHTML("beforeend",
        '<div class="wrap hero-in">' +
          '<div class="hero-copy">' +
            '<p class="hero-kicker">' + esc(M.store.name) + "</p>" +
            '<p class="hero-title">Everything you need, in one place.</p>' +
            '<p class="hero-text">Tech, home and kitchen, fashion, beauty, toys and more from the brands you trust. Delivered across South Africa, or collect in store.</p>' +
            '<div class="hero-cta"><a class="btn btn-primary btn-lg" href="#deals">Shop the deals</a>' +
              '<a class="btn btn-outline-light btn-lg" href="#departments">Browse departments</a></div>' +
          "</div>" +
          '<div class="hero-art" aria-hidden="true">' +
            '<span class="hero-a1">' + M.art(pick("apple-macbook-air-13-m2").art) + "</span>" +
            '<span class="hero-a2">' + M.art(pick("adidas-grand-court-2-sneakers").art) + "</span>" +
            '<span class="hero-a3">' + M.art(pick("russell-hobbs-cordless-kettle").art) + "</span>" +
          "</div>" +
        "</div>");
      return;
    }
    hero.classList.add("hero-slides");
    hero.setAttribute("aria-roledescription", "carousel");
    hero.insertAdjacentHTML("beforeend",
      '<div class="hero-track" id="hero-track" aria-live="off">' + slides.map(function (s, i) {
        var img = '<picture>' + (s.mobile ? '<source media="(max-width: 640px)" srcset="' + esc(s.mobile) + '">' : "") +
          '<img src="' + esc(s.image) + '" alt="' + esc(s.alt || "") + '"' + (i ? ' loading="lazy"' : ' fetchpriority="high"') + "></picture>";
        return '<div class="hero-slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + slides.length + '"' + (i ? ' aria-hidden="true"' : "") + ">" +
          (s.href ? '<a href="' + esc(s.href) + '"' + (i ? ' tabindex="-1"' : "") + ">" + img + "</a>" : img) + "</div>";
      }).join("") + "</div>" +
      (slides.length > 1 ?
        '<button type="button" class="hero-nav hero-prev" data-hero="-1" aria-label="Previous slide">' + M.icon.chevron + "</button>" +
        '<button type="button" class="hero-nav hero-next" data-hero="1" aria-label="Next slide">' + M.icon.chevron + "</button>" +
        '<div class="hero-dots">' + slides.map(function (s, i) {
          return '<button type="button" data-dot="' + i + '" aria-label="Show slide ' + (i + 1) + '"' + (i ? "" : ' aria-current="true"') + "></button>";
        }).join("") + "</div>" : ""));
    if (slides.length < 2) return;

    var track = $("hero-track"), at = 0, timer = null;
    var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function go(i) {
      at = (i + slides.length) % slides.length;
      track.style.transform = "translateX(" + (-100 * at) + "%)";
      track.querySelectorAll(".hero-slide").forEach(function (el, n) {
        if (n === at) el.removeAttribute("aria-hidden"); else el.setAttribute("aria-hidden", "true");
        var a = el.querySelector("a"); if (a) { if (n === at) a.removeAttribute("tabindex"); else a.setAttribute("tabindex", "-1"); }
      });
      hero.querySelectorAll("[data-dot]").forEach(function (d, n) { if (n === at) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
    }
    function play() { if (!still && !timer) timer = setInterval(function () { go(at + 1); }, 6000); }
    function pause() { clearInterval(timer); timer = null; }
    hero.addEventListener("click", function (e) {
      var n = e.target.closest("[data-hero]"), d = e.target.closest("[data-dot]");
      if (n) go(at + +n.getAttribute("data-hero"));
      if (d) go(+d.getAttribute("data-dot"));
    });
    hero.addEventListener("mouseenter", pause);
    hero.addEventListener("mouseleave", play);
    hero.addEventListener("focusin", pause);
    hero.addEventListener("focusout", play);
    hero.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); go(at + (e.key === "ArrowLeft" ? -1 : 1)); }
    });
    var x0 = null;
    hero.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; pause(); }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1));
      x0 = null; play();
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); else play(); });
    play();
  }
  renderHero();

  /* ---------- categories, deals ---------- */
  $("cat-grid").innerHTML = M.categories.map(function (c) {
    var n = M.products.filter(function (p) { return p.category === c.id; }).length;
    return '<a class="cat-tile" href="?cat=' + encodeURIComponent(c.id) + '#shop"' + (c.blurb ? ' title="' + esc(c.blurb) + '"' : "") + ">" +
      '<span class="cat-art" aria-hidden="true">' + M.art(c.art || {}) + "</span>" +
      '<span class="cat-name">' + esc(c.name) + "</span>" +
      '<span class="cat-count">' + n + (n === 1 ? " product" : " products") + "</span></a>";
  }).join("");

  function renderDeals() {
    var off = function (p) { return (p.was - p.price) / p.was; };
    var deals = M.products.filter(function (p) { return p.was && p.was > p.price && p.stock > 0; })
      .sort(function (a, b) { return off(b) - off(a); });
    // take turns between departments, best deal first in each, so the rail shows the whole shop
    var byCat = {}, order = [], mixed = [];
    deals.forEach(function (p) { if (!byCat[p.category]) { byCat[p.category] = []; order.push(p.category); } byCat[p.category].push(p); });
    for (var round = 0; mixed.length < deals.length; round++) {
      order.forEach(function (c) { if (byCat[c][round]) mixed.push(byCat[c][round]); });
    }
    $("deal-rail").innerHTML = mixed.slice(0, 12).map(M.card).join(""); // two rows; "View all deals" shows the rest
  }

  /* ---------- shop state ---------- */
  var params = new URLSearchParams(location.search);
  var state = {
    cat: params.get("cat") || "",
    type: params.get("type") || "",
    q: (params.get("q") || "").trim(),
    brands: (params.get("brand") || "").split(",").filter(Boolean),
    min: params.get("min") || "",
    max: params.get("max") || "",
    stock: params.get("stock") === "1",
    deals: params.get("deals") === "1",
    wish: params.get("wish") === "1",
    sort: params.get("sort") || "featured"
  };
  if (!M.categories.some(function (c) { return c.id === state.cat; })) state.cat = "";
  if (!state.cat || !M.typesOf(state.cat).some(function (t) { return t.type === state.type; })) state.type = "";

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.cat) p.set("cat", state.cat);
    if (state.type) p.set("type", state.type);
    if (state.q) p.set("q", state.q);
    if (state.brands.length) p.set("brand", state.brands.join(","));
    if (state.min) p.set("min", state.min);
    if (state.max) p.set("max", state.max);
    FACETS.forEach(function (f) { if (state.f[f.key]) p.set(f.key, state.f[f.key].join(",")); });
    if (state.stock) p.set("stock", "1");
    if (state.deals) p.set("deals", "1");
    if (state.wish) p.set("wish", "1");
    if (state.sort !== "featured") p.set("sort", state.sort);
    var qs = p.toString();
    // only jump the page to the shop once someone has actually used it
    var hash = qs || touched ? "#shop" : location.hash;
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + hash);
  }

  // `skip` leaves one filter out, to count what ticking its other options would show
  function matches(p, skip) {
    if (state.cat && p.category !== state.cat) return false;
    if (state.type && p.type !== state.type) return false;
    for (var k in state.f) {
      if (k === skip) continue;
      var have = facetValues(p, FACET[k]);
      if (!state.f[k].some(function (v) { return have.indexOf(v) !== -1; })) return false;
    }
    if (skip !== "brand" && state.brands.length && state.brands.indexOf(p.brand) === -1) return false;
    if (state.min !== "" && p.price < +state.min) return false;
    if (state.max !== "" && p.price > +state.max) return false;
    if (skip !== "stock" && state.stock && p.stock < 1) return false;
    if (state.deals && !(p.was && p.was > p.price)) return false;
    if (state.wish && !M.wish.has(p.id)) return false;
    return !state.q || M.matchQuery(p, state.q);
  }

  var SORTS = {
    featured: function (a, b) {
      return (b.stock > 0) - (a.stock > 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || M.products.indexOf(a) - M.products.indexOf(b);
    },
    "price-asc": function (a, b) { return a.price - b.price; },
    "price-desc": function (a, b) { return b.price - a.price; },
    discount: function (a, b) { return ((b.was || b.price) - b.price) - ((a.was || a.price) - a.price); },
    name: function (a, b) { return a.name.localeCompare(b.name); }
  };

  /* ---------- product details filters ----------
     Read from each product's specs ("Colour: Black", "Storage: 256 GB SSD"…),
     so a filter appears only when the products being shown have that detail:
     phones get storage, screen size and headphone jack; laptops get memory
     and processor; and so on. In the admin panel, adding a spec line with
     one of these labels puts the product in the matching filter. */
  var CAP = /(\d+(?:\.\d+)?)\s*(GB|TB)\b/i;
  function capacity(v) { var m = CAP.exec(v); return m ? [+m[1] + " " + m[2].toUpperCase()] : []; }
  function gb(v) { var m = CAP.exec(v); return m ? +m[1] * (/t/i.test(m[2]) ? 1024 : 1) : 0; }
  function first(v) { return [v]; }
  var VOL = /(\d+(?:[.,]\d+)?)\s*(ml|l|litres?|liters?)\b/i;
  function volume(v) { var m = VOL.exec(v); return m ? [m[1].replace(",", ".") + " " + (/^m/i.test(m[2]) ? "ml" : "L")] : []; }
  function ml(v) { var m = VOL.exec(v); return m ? parseFloat(m[1]) * (/^m/i.test(m[2]) ? 1 : 1000) : 0; }
  var SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
  function sizeOrder(v) {
    var i = SIZES.indexOf(v.toUpperCase());
    return i !== -1 ? i : 100 + (parseFloat(v.replace(/^[^\d]+/, "")) || 0);
  }
  function months(v) { var n = parseFloat(v) || 0; return /birth/i.test(v) ? 0 : /month/i.test(v) ? n : n * 12; }
  var SWATCH = { black: "#1d1d1f", white: "#fff", silver: "#c7cbd1", grey: "#8a9099", gray: "#8a9099", blue: "#2f6fd6", navy: "#1e3a6e",
    green: "#3aa66a", teal: "#0f9488", mint: "#9ee0c5", red: "#d0312d", pink: "#f2a7c3", purple: "#8b5cf6", lavender: "#c4b5fd",
    yellow: "#f5cf3b", gold: "#d4b36a", orange: "#f28c28", brown: "#8a5a3b", beige: "#e6d5b8", titanium: "#a8a195", graphite: "#45474d",
    clear: "repeating-conic-gradient(#e3e6ea 0 25%, #fff 0 50%) 50% / 8px 8px", multicolour: "conic-gradient(#f87171,#facc15,#4ade80,#60a5fa,#c084fc,#f87171)" };
  var FACETS = [
    { key: "colour", label: "Colour", specs: ["colour", "color"], swatch: true,
      values: function (v) { return v.split(/\s*[,\/&]\s*|\s+and\s+/i).filter(Boolean).map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase(); }); } },
    { key: "size", label: "Size", prefix: "Size ", specs: ["size", "clothing size", "shoe size"], order: sizeOrder,
      // sizes the item comes in; a screen size like 24" belongs to Screen size instead
      values: function (v) { return /\d\s*("|\u201d|\u2033|inch)/i.test(v) ? [] : v.split(/\s*[,\/]\s*/).filter(Boolean); } },
    { key: "volume", label: "Capacity", specs: ["capacity", "volume"], values: volume, order: ml },
    { key: "storage", label: "Storage capacity", chip: " storage", specs: ["storage", "capacity", "storage capacity"], values: capacity, order: gb },
    { key: "ram", label: "Memory (RAM)", chip: " RAM", specs: ["memory", "ram"], values: capacity, order: gb },
    { key: "cpu", label: "Processor", specs: ["processor", "chip", "cpu"], values: first },
    { key: "screen", label: "Screen size", chip: " screen", specs: ["screen size", "screen", "display", "size"], order: parseFloat,
      values: function (v) { var m = /(\d{1,3}(?:\.\d+)?)\s*(?:"|”|″|-?\s?inch)/i.exec(v); return m ? [Math.round(m[1] * 10) / 10 + '"'] : []; } },
    { key: "network", label: "Network", specs: ["network", "mobile network"],
      values: function (v) { return /5G/i.test(v) ? ["5G"] : /4G|LTE/i.test(v) ? ["4G"] : []; } },
    { key: "jack", label: "Audio jack", specs: ["headphone jack", "audio jack"],
      values: function (v) { return [/^(no|none)\b/i.test(v) ? "No headphone jack" : "3.5 mm headphone jack"]; } },
    { key: "material", label: "Material", specs: ["material", "fabric", "upper"], values: function (v) { return [v.split(/\s*,\s*/)[0]]; } },
    { key: "age", label: "Age", specs: ["age", "suitable for"], values: first, order: months },
    { key: "lens", label: "Lens type", specs: ["lens type", "lens"], values: first },
    { key: "condition", label: "Product condition", specs: ["condition", "product condition"], values: first, fallback: "New",
      order: function (v) { return v === "New" ? 0 : 1; } }
  ];
  var FACET = {};
  FACETS.forEach(function (f) { FACET[f.key] = f; });
  // ticked values per filter, from the URL (?colour=Black,Blue&storage=256 GB)
  state.f = {};
  FACETS.forEach(function (f) {
    var v = (params.get(f.key) || "").split(",").filter(Boolean);
    if (v.length) state.f[f.key] = v;
  });

  // a product's values for one filter (worked out once per product)
  function facetValues(p, f) {
    var cache = p._facets || (p._facets = {});
    if (cache[f.key]) return cache[f.key];
    var out = [];
    (p.specs || []).some(function (s) {
      if (f.specs.indexOf(String(s[0]).trim().toLowerCase()) === -1) return false;
      out = f.values(String(s[1]).trim());
      return out.length > 0;
    });
    if (!out.length && f.fallback) out = [f.fallback];
    return (cache[f.key] = out);
  }

  /* ---------- filters UI ---------- */
  function renderFilters() {
    $("f-cats").innerHTML = [{ id: "", name: "All categories" }].concat(M.categories).map(function (c) {
      return '<label class="check"><input type="radio" name="cat" value="' + c.id + '"' + (state.cat === c.id ? " checked" : "") + "> " + esc(c.name) + "</label>";
    }).join("");
    var types = state.cat ? M.typesOf(state.cat) : [];
    $("f-types-set").hidden = types.length < 2;
    $("f-types").innerHTML = types.length < 2 ? "" : [{ type: "", count: types.reduce(function (n, t) { return n + t.count; }, 0) }].concat(types).map(function (t) {
      return '<label class="check"><input type="radio" name="type" value="' + esc(t.type) + '"' + (state.type === t.type ? " checked" : "") + "> " +
        esc(t.type ? M.plural(t.type) : "All " + M.catName(state.cat)) + ' <span class="n">' + t.count + "</span></label>";
    }).join("");
    // brands available given every other filter, plus any already ticked
    var counts = {};
    M.products.forEach(function (p) { if (matches(p, "brand")) counts[p.brand] = (counts[p.brand] || 0) + 1; });
    state.brands.forEach(function (b) { if (!(b in counts)) counts[b] = 0; });
    var brands = Object.keys(counts).sort();
    $("f-brands").innerHTML = brands.length ? brands.map(function (b) {
      return '<label class="check"><input type="checkbox" name="brand" value="' + esc(b) + '"' + (state.brands.indexOf(b) !== -1 ? " checked" : "") + "> " +
        esc(b) + ' <span class="n">' + counts[b] + "</span></label>";
    }).join("") : '<p class="fine">No brands match.</p>';
    $("f-min").value = state.min;
    $("f-max").value = state.max;
    renderFacets();
    $("f-deals").checked = state.deals;
    $("f-wish").checked = state.wish;
    $("sort").value = state.sort;
  }

  // collapsible sections: Availability, then each product detail the products shown have
  var opened = {}, expanded = {}; // sections opened / lists expanded by the shopper
  var FEW = 6; // options shown before "Show all"
  function section(key, label, on, body) {
    var open = key in opened ? opened[key] : on > 0;
    return '<fieldset class="facet' + (open ? " is-open" : "") + '" data-facet="' + key + '">' +
      '<legend><button type="button" class="facet-head" aria-expanded="' + open + '" aria-controls="fb-' + key + '">' +
        "<span>" + esc(label) + "</span>" + (on ? '<span class="facet-on" aria-label="' + on + ' selected">' + on + "</span>" : "") + M.icon.chevron +
      "</button></legend>" +
      '<div class="facet-body" id="fb-' + key + '"' + (open ? "" : " hidden") + ">" + body + "</div></fieldset>";
  }
  function renderFacets() {
    var inStock = M.products.filter(function (p) { return p.stock > 0 && matches(p, "stock"); }).length;
    var html = section("stock", "Availability", state.stock ? 1 : 0,
      '<label class="check"><input type="checkbox" id="f-stock"' + (state.stock ? " checked" : "") + "> In stock <span class=\"n\">" + inStock + "</span></label>");
    FACETS.forEach(function (f) {
      var counts = {}, picked = state.f[f.key] || [];
      M.products.forEach(function (p) {
        if (matches(p, f.key)) facetValues(p, f).forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
      });
      picked.forEach(function (v) { if (!(v in counts)) counts[v] = 0; });
      var vals = Object.keys(counts);
      if (!vals.length) return; // nothing shown has this detail
      vals.sort(function (a, b) { return f.order ? f.order(a) - f.order(b) || a.localeCompare(b) : a.localeCompare(b); });
      var all = expanded[f.key] || vals.length <= FEW + 1 || vals.slice(FEW).some(function (v) { return picked.indexOf(v) !== -1; });
      html += section(f.key, f.label, picked.length, vals.map(function (v, i) {
        var sw = f.swatch ? '<span class="swatch" style="--sw:' + (SWATCH[v.toLowerCase()] || "conic-gradient(#f87171,#facc15,#4ade80,#60a5fa,#c084fc,#f87171)") + '" aria-hidden="true"></span>' : "";
        return '<label class="check"' + (!all && i >= FEW ? " hidden" : "") + '><input type="checkbox" name="f:' + f.key + '" value="' + esc(v) + '"' +
          (picked.indexOf(v) !== -1 ? " checked" : "") + "> " + sw + esc(v) + ' <span class="n">' + counts[v] + "</span></label>";
      }).join("") + (all ? "" : '<button type="button" class="link-btn facet-more" data-more="' + f.key + '">Show all ' + vals.length + "</button>"));
    });
    $("f-specs").innerHTML = html;
  }

  function activeChips() {
    var chips = [];
    if (state.q) chips.push(["q", "“" + state.q + "”"]);
    if (state.cat) chips.push(["cat", M.catName(state.cat)]);
    if (state.type) chips.push(["type", M.plural(state.type)]);
    state.brands.forEach(function (b) { chips.push(["brand:" + b, b]); });
    FACETS.forEach(function (f) { (state.f[f.key] || []).forEach(function (v) { chips.push(["f:" + f.key + ":" + v, (f.prefix || "") + v + (f.chip || "")]); }); });
    if (state.min !== "" || state.max !== "") {
      chips.push(["price", state.min !== "" && state.max !== "" ? money(state.min) + " – " + money(state.max) :
        state.min !== "" ? "From " + money(state.min) : "Up to " + money(state.max)]);
    }
    if (state.stock) chips.push(["stock", "In stock"]);
    if (state.deals) chips.push(["deals", "On sale"]);
    if (state.wish) chips.push(["wish", "Wishlist"]);
    return chips;
  }

  function title() {
    if (state.wish) return "Your wishlist";
    if (state.q) return "Results for \u201c" + state.q + "\u201d";
    if (state.deals && !state.cat) return "On sale";
    if (state.type) return M.plural(state.type);
    return state.cat ? M.catName(state.cat) : "All products";
  }

  var touched = false;
  var shopEl = document.getElementById("shop");
  var PAGE = 24, shown = PAGE; // products shown before "Show more"
  function render(keepShown) {
    if (!keepShown) shown = PAGE;
    var list = M.products.filter(function (p) { return matches(p); }).sort(SORTS[state.sort] || SORTS.featured);
    $("shop-title").textContent = title();
    $("result-count").textContent = list.length + (list.length === 1 ? " product" : " products");
    var chips = activeChips();
    $("chips").innerHTML = chips.map(function (c) {
      return '<button type="button" class="chip" data-chip="' + esc(c[0]) + '" aria-label="Remove filter: ' + esc(c[1]) + '">' + esc(c[1]) + M.icon.close + "</button>";
    }).join("");
    $("filter-toggle").innerHTML = M.icon.filter + "Filters" + (chips.length ? " (" + chips.length + ")" : "");
    var bar = $("more-bar");
    bar.innerHTML = "";
    if (list.length) {
      // search results get the detailed card; browsing keeps the compact grid
      var rich = !!state.q;
      shopEl.classList.toggle("is-search", rich); // and filters move into a sidebar
      // while searching, the results are the page: banner, brands, departments and deals step aside
      document.body.classList.toggle("is-searching", rich);
      if (rich) { $("shop-title").setAttribute("role", "heading"); $("shop-title").setAttribute("aria-level", "1"); }
      else { $("shop-title").removeAttribute("role"); $("shop-title").removeAttribute("aria-level"); }
      $("grid").classList.toggle("grid-rich", rich);
      $("grid").innerHTML = list.slice(0, shown).map(function (p) { return M.card(p, { rich: rich }); }).join("");
      if (list.length > PAGE) {
        var n = Math.min(shown, list.length);
        bar.innerHTML = '<p>Showing ' + n + " of " + list.length + " products</p>" +
          '<span class="more-progress" aria-hidden="true"><span style="width:' + Math.round(n / list.length * 100) + '%"></span></span>' +
          (n < list.length ? '<button type="button" class="btn btn-ghost" id="show-more">Show more</button>' : "");
      }
    } else {
      $("grid").innerHTML = '<div class="empty empty-wide"><p class="empty-title">' +
        (state.wish && chips.length === 1 ? "Your wishlist is empty" : "No products match") + "</p>" +
        "<p>" + (state.wish && chips.length === 1 ? "Tap the heart on any product to save it here." : "Try a different search or clear some filters.") + "</p>" +
        '<button type="button" class="btn btn-primary" data-clear>Show all products</button></div>';
    }
    renderFilters();
    syncUrl();
  }

  function reset() {
    state.cat = ""; state.type = ""; state.q = ""; state.brands = []; state.min = ""; state.max = ""; state.f = {};
    state.stock = false; state.deals = false; state.wish = false;
    var q = document.getElementById("q"); if (q) q.value = "";
    render();
  }

  /* ---------- events ---------- */
  var filters = $("filters");
  document.querySelector(".shop").addEventListener("click", function () { touched = true; }, true);
  filters.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "cat") { state.cat = t.value; state.type = ""; state.brands = []; state.f = {}; }
    else if (t.name === "type") { state.type = t.value; state.brands = []; state.f = {}; }
    else if (t.name.indexOf("f:") === 0) {
      var key = t.name.slice(2);
      var on = Array.prototype.map.call(filters.querySelectorAll('input[name="f:' + key + '"]:checked'), function (i) { return i.value; });
      if (on.length) state.f[key] = on; else delete state.f[key];
    }
    else if (t.name === "brand") {
      state.brands = Array.prototype.map.call(filters.querySelectorAll('input[name="brand"]:checked'), function (i) { return i.value; });
    }
    else if (t.id === "f-min" || t.id === "f-max") {
      state.min = $("f-min").value === "" ? "" : String(Math.max(0, +$("f-min").value));
      state.max = $("f-max").value === "" ? "" : String(Math.max(0, +$("f-max").value));
    }
    else if (t.id === "f-stock") state.stock = t.checked;
    else if (t.id === "f-deals") state.deals = t.checked;
    else if (t.id === "f-wish") state.wish = t.checked;
    var name = t.name, id = t.id, value = t.value;
    render();
    // the filters are redrawn: keep the keyboard on the same option
    var again = id ? $(id) : filters.querySelector('input[name="' + name + '"][value="' + (window.CSS && CSS.escape ? CSS.escape(value) : value) + '"]');
    if (again && again !== document.activeElement && document.activeElement === document.body) again.focus({ preventScroll: true });
  });
  // open / close a section, show all of a long list
  $("f-specs").addEventListener("click", function (e) {
    var head = e.target.closest(".facet-head"), more = e.target.closest("[data-more]");
    if (head) {
      var set = head.closest(".facet"), open = head.getAttribute("aria-expanded") !== "true";
      opened[set.getAttribute("data-facet")] = open;
      head.setAttribute("aria-expanded", open);
      set.classList.toggle("is-open", open);
      set.querySelector(".facet-body").hidden = !open;
    } else if (more) {
      var key = more.getAttribute("data-more"), body = more.parentNode;
      expanded[key] = true;
      body.querySelectorAll("label[hidden]").forEach(function (l) { l.hidden = false; });
      more.remove();
      body.querySelectorAll("input")[FEW].focus({ preventScroll: true });
    }
  });
  filters.addEventListener("submit", function (e) { e.preventDefault(); });
  $("clear-filters").addEventListener("click", reset);
  $("sort").addEventListener("change", function () { state.sort = this.value; render(); });

  $("chips").addEventListener("click", function (e) {
    var c = e.target.closest("[data-chip]"); if (!c) return;
    var k = c.getAttribute("data-chip");
    if (k === "q") { state.q = ""; var q = document.getElementById("q"); if (q) q.value = ""; }
    else if (k === "cat") { state.cat = ""; state.type = ""; }
    else if (k === "type") { state.type = ""; }
    else if (k.indexOf("f:") === 0) {
      var fk = k.split(":")[1], fv = k.slice(fk.length + 3);
      state.f[fk] = (state.f[fk] || []).filter(function (x) { return x !== fv; });
      if (!state.f[fk].length) delete state.f[fk];
    }
    else if (k.indexOf("brand:") === 0) { var b = k.slice(6); state.brands = state.brands.filter(function (x) { return x !== b; }); }
    else if (k === "price") { state.min = ""; state.max = ""; }
    else state[k] = false;
    render();
    ($("chips").querySelector(".chip") || $("shop-title")).focus();
  });
  $("grid").addEventListener("click", function (e) { if (e.target.closest("[data-clear]")) reset(); });
  $("more-bar").addEventListener("click", function (e) {
    if (!e.target.closest("#show-more")) return;
    var first = shown;
    shown += PAGE;
    render(true);
    var next = $("grid").children[first]; // keep the keyboard on the first new product
    if (next) { var a = next.querySelector("a"); if (a) a.focus({ preventScroll: true }); }
  });
  $("shop-title").setAttribute("tabindex", "-1");

  // filter panel (slides in from the left; a bottom sheet on phones)
  var toggle = $("filter-toggle");
  function setSheet(open) {
    filters.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open);
    document.body.classList.toggle("sheet-open", open);
    if (open) filters.querySelector("input").focus({ preventScroll: true }); else toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener("click", function () { setSheet(!filters.classList.contains("is-open")); });
  $("filters-done").addEventListener("click", function () { setSheet(false); });
  $("filters-close").addEventListener("click", function () { setSheet(false); });
  // clicking the dimmed page closes the panel
  document.addEventListener("click", function (e) {
    if (filters.classList.contains("is-open") && !filters.contains(e.target) && !toggle.contains(e.target)) setSheet(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && filters.classList.contains("is-open")) setSheet(false);
  });

  // wishlist view updates live when hearts are toggled
  document.addEventListener("wish:change", function () { if (state.wish) render(); });

  // measure once the logo files are in, so the loop and speed are exact
  (function brandsReady() {
    if (!M.brands) return;
    var left = M.brands.length;
    var done = function () { if (--left === 0) renderBrands(); };
    M.brands.forEach(function (b) { var img = new Image(); img.onload = img.onerror = done; img.src = b.logo; });
  })();
  renderBrands();
  renderDeals();
  render();
})();
