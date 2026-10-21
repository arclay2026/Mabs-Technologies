/* =====================================================================
   MABS TECHNOLOGIES — STOREFRONT (index.html)
   Hero, perks, category tiles, sale rail and the filterable shop grid.
   Shop filters live in the URL (?cat=&q=&brand=&min=&max=&stock=&deals=
   &wish=&sort=) so results can be bookmarked and shared.
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
        return '<a class="brand-logo" href="index.html?brand=' + encodeURIComponent(b.name) + '#shop"' +
          (copy ? ' tabindex="-1" aria-hidden="true"' : ' aria-label="Shop ' + esc(b.name) + '"') + ">" +
          '<img src="' + esc(b.logo) + '" alt="' + (copy ? "" : esc(b.name)) + '" style="height:' + b.h + 'px" draggable="false"></a>';
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

  /* ---------- perks, categories, deals ---------- */
  var d = M.store.delivery;
  var perks = [
    [M.icon.truck, "Fast delivery", "Free on orders over " + money(d.freeOver)],
    d.collect ? [M.icon.store, "Collect in store", "Order online, pick up for free"] : null,
    [M.icon.shield, "Trusted brands", "Samsung, Apple, HP, Lenovo & more"],
    [M.icon.chat, "Real advice", "Help choosing the right device"]
  ].filter(Boolean);
  $("perks").innerHTML = perks.map(function (k) {
    return '<div class="perk">' + k[0] + "<div><b>" + esc(k[1]) + "</b><span>" + esc(k[2]) + "</span></div></div>";
  }).join("");

  $("cat-grid").innerHTML = M.categories.map(function (c) {
    var n = M.products.filter(function (p) { return p.category === c.id; }).length;
    return '<a class="cat-tile" href="?cat=' + c.id + '#shop" style="--tile:' + M.tint(c.art.color, 0.88) + '">' +
      '<span class="cat-art">' + M.art(c.art) + "</span>" +
      '<span class="cat-text"><b>' + esc(c.name) + "</b><span>" + esc(c.blurb) + "</span>" +
      '<span class="cat-count">' + n + " products</span></span></a>";
  }).join("");

  function renderDeals() {
    var deals = M.products.filter(function (p) { return p.was && p.was > p.price && p.stock > 0; })
      .sort(function (a, b) { return (b.was - b.price) - (a.was - a.price); });
    $("deal-rail").innerHTML = deals.map(M.card).join("");
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
    if (state.stock) p.set("stock", "1");
    if (state.deals) p.set("deals", "1");
    if (state.wish) p.set("wish", "1");
    if (state.sort !== "featured") p.set("sort", state.sort);
    var qs = p.toString();
    // only jump the page to the shop once someone has actually used it
    var hash = qs || touched ? "#shop" : location.hash;
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + hash);
    // keep the header category links in step with the shop
    var current = state.q || state.wish ? "" : state.deals && !state.cat ? "deals" :
      state.cat && !state.deals ? state.cat : !state.cat && !state.deals && hash === "#shop" ? "all" : "";
    document.querySelectorAll(".cat-nav [data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === current) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  function matches(p, skipBrand) {
    if (state.cat && p.category !== state.cat) return false;
    if (state.type && p.type !== state.type) return false;
    if (!skipBrand && state.brands.length && state.brands.indexOf(p.brand) === -1) return false;
    if (state.min !== "" && p.price < +state.min) return false;
    if (state.max !== "" && p.price > +state.max) return false;
    if (state.stock && p.stock < 1) return false;
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
    M.products.forEach(function (p) { if (matches(p, true)) counts[p.brand] = (counts[p.brand] || 0) + 1; });
    state.brands.forEach(function (b) { if (!(b in counts)) counts[b] = 0; });
    var brands = Object.keys(counts).sort();
    $("f-brands").innerHTML = brands.length ? brands.map(function (b) {
      return '<label class="check"><input type="checkbox" name="brand" value="' + esc(b) + '"' + (state.brands.indexOf(b) !== -1 ? " checked" : "") + "> " +
        esc(b) + ' <span class="n">' + counts[b] + "</span></label>";
    }).join("") : '<p class="fine">No brands match.</p>';
    $("f-min").value = state.min;
    $("f-max").value = state.max;
    $("f-stock").checked = state.stock;
    $("f-deals").checked = state.deals;
    $("f-wish").checked = state.wish;
    $("sort").value = state.sort;
  }

  function activeChips() {
    var chips = [];
    if (state.q) chips.push(["q", "“" + state.q + "”"]);
    if (state.cat) chips.push(["cat", M.catName(state.cat)]);
    if (state.type) chips.push(["type", M.plural(state.type)]);
    state.brands.forEach(function (b) { chips.push(["brand:" + b, b]); });
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
    if (state.q) return "Search results";
    if (state.deals && !state.cat) return "On sale";
    if (state.type) return M.plural(state.type);
    return state.cat ? M.catName(state.cat) : "All products";
  }

  var touched = false;
  function render() {
    var list = M.products.filter(function (p) { return matches(p); }).sort(SORTS[state.sort] || SORTS.featured);
    $("shop-title").textContent = title();
    $("result-count").textContent = list.length + (list.length === 1 ? " product" : " products");
    var chips = activeChips();
    $("chips").innerHTML = chips.map(function (c) {
      return '<button type="button" class="chip" data-chip="' + esc(c[0]) + '" aria-label="Remove filter: ' + esc(c[1]) + '">' + esc(c[1]) + M.icon.close + "</button>";
    }).join("");
    $("filter-toggle").innerHTML = M.icon.filter + "Filters" + (chips.length ? " (" + chips.length + ")" : "");
    if (list.length) {
      $("grid").innerHTML = list.map(M.card).join("");
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
    state.cat = ""; state.type = ""; state.q = ""; state.brands = []; state.min = ""; state.max = "";
    state.stock = false; state.deals = false; state.wish = false;
    var q = document.getElementById("q"); if (q) q.value = "";
    render();
  }

  /* ---------- events ---------- */
  var filters = $("filters");
  document.querySelector(".shop").addEventListener("click", function () { touched = true; }, true);
  filters.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "cat") { state.cat = t.value; state.type = ""; state.brands = []; }
    else if (t.name === "type") { state.type = t.value; state.brands = []; }
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
    render();
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
    else if (k.indexOf("brand:") === 0) { var b = k.slice(6); state.brands = state.brands.filter(function (x) { return x !== b; }); }
    else if (k === "price") { state.min = ""; state.max = ""; }
    else state[k] = false;
    render();
    ($("chips").querySelector(".chip") || $("shop-title")).focus();
  });
  $("grid").addEventListener("click", function (e) { if (e.target.closest("[data-clear]")) reset(); });
  $("shop-title").setAttribute("tabindex", "-1");

  // mobile filter sheet
  var toggle = $("filter-toggle");
  function setSheet(open) {
    filters.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open);
    document.body.classList.toggle("sheet-open", open);
    if (open) filters.querySelector("input").focus(); else toggle.focus();
  }
  toggle.addEventListener("click", function () { setSheet(!filters.classList.contains("is-open")); });
  $("filters-done").addEventListener("click", function () { setSheet(false); });
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
