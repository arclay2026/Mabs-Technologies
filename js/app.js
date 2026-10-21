/* =====================================================================
   MABS TECHNOLOGIES — SHARED STORE SCRIPT
   ---------------------------------------------------------------------
   Loaded on every page after catalog.js. Provides the cart and wishlist
   (kept in localStorage), the header / footer / cart drawer chrome,
   product cards, price formatting and toasts.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  document.body.classList.add("js");

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  // South African style: R12 999 (non-breaking space as thousands separator)
  function money(n) { return "R" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0"); }
  function byId(id) {
    for (var i = 0; i < M.products.length; i++) if (M.products[i].id === id) return M.products[i];
    return null;
  }
  function catName(id) {
    for (var i = 0; i < M.categories.length; i++) if (M.categories[i].id === id) return M.categories[i].name;
    return id;
  }
  // every word of the query must appear somewhere in the product
  function matchQuery(p, q) {
    var hay = (p.name + " " + p.brand + " " + p.type + " " + catName(p.category) + " " + p.summary).toLowerCase();
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      // "laptops" should still find "laptop"
      if (hay.indexOf(w) === -1 && !(w.length > 3 && /s$/.test(w) && hay.indexOf(w.replace(/e?s$/, "")) !== -1)) return false;
    }
    return true;
  }
  // product types in a category, in catalogue order, with counts
  function typesOf(catId) {
    var seen = {}, out = [];
    M.products.forEach(function (p) {
      if (p.category !== catId) return;
      if (!seen[p.type]) { seen[p.type] = { type: p.type, count: 0 }; out.push(seen[p.type]); }
      seen[p.type].count++;
    });
    return out;
  }
  var PLURAL = { Mouse: "Mice", Smartwatch: "Smartwatches", TV: "TVs", Headphones: "Headphones", Earbuds: "Earbuds", Storage: "Storage", Gaming: "Gaming", Networking: "Networking" };
  function plural(t) { return PLURAL[t] || t + "s"; }
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable: keep in memory only */ }
  }
  function emit(name) { document.dispatchEvent(new CustomEvent(name)); }
  M.esc = esc; M.money = money; M.byId = byId; M.catName = catName;
  M.matchQuery = matchQuery; M.typesOf = typesOf; M.plural = plural; M.read = read; M.write = write;

  /* ---------- cart ---------- */
  var CART_KEY = "mabs.cart.v1";
  var cartItems = read(CART_KEY, []).filter(function (it) { return byId(it.id); });

  M.cart = {
    qty: function (id) {
      for (var i = 0; i < cartItems.length; i++) if (cartItems[i].id === id) return cartItems[i].qty;
      return 0;
    },
    set: function (id, qty) {
      var p = byId(id); if (!p) return 0;
      qty = Math.max(0, Math.min(Math.floor(qty) || 0, p.stock));
      cartItems = cartItems.filter(function (it) { return it.id !== id; });
      if (qty > 0) cartItems.push({ id: id, qty: qty });
      write(CART_KEY, cartItems); emit("cart:change");
      return qty;
    },
    add: function (id, qty) {
      var p = byId(id); if (!p || p.stock < 1) return 0;
      var before = this.qty(id);
      // keep the line in its original position when topping it up
      var after = Math.min(before + (qty || 1), p.stock);
      if (before) {
        cartItems.forEach(function (it) { if (it.id === id) it.qty = after; });
        write(CART_KEY, cartItems); emit("cart:change");
      } else {
        this.set(id, after);
      }
      return after - before;
    },
    lines: function () {
      return cartItems.map(function (it) {
        var p = byId(it.id);
        return { product: p, qty: it.qty, total: p.price * it.qty };
      });
    },
    count: function () { return cartItems.reduce(function (n, it) { return n + it.qty; }, 0); },
    subtotal: function () { return this.lines().reduce(function (n, l) { return n + l.total; }, 0); },
    clear: function () { cartItems = []; write(CART_KEY, cartItems); emit("cart:change"); }
  };

  M.deliveryFee = function (subtotal, method) {
    var d = M.store.delivery;
    if (method === "collect" || subtotal === 0 || subtotal >= d.freeOver) return 0;
    return d.courierFee;
  };

  /* ---------- wishlist ---------- */
  var WISH_KEY = "mabs.wish.v1";
  var wish = read(WISH_KEY, []).filter(byId);
  M.wish = {
    has: function (id) { return wish.indexOf(id) !== -1; },
    all: function () { return wish.slice(); },
    toggle: function (id) {
      if (this.has(id)) wish = wish.filter(function (w) { return w !== id; });
      else wish.push(id);
      write(WISH_KEY, wish); emit("wish:change");
      return this.has(id);
    }
  };

  /* ---------- icons ---------- */
  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.8 4 7.2 4c2 0 3.5 1.1 4.8 2.8C13.3 5.1 14.8 4 16.8 4c3.4 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2" fill="#fff"/><circle cx="17" cy="18" r="2" fill="#fff"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 10v10h16V10M3 4h18l-1 6H4zM9 20v-6h6v6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 3.2-1.2 4.9-2.6 6.5C8 10.1 7 11.6 7 14a5 5 0 0 0 10 0c0-1.6-.6-3-1.5-4.1-.2 1.3-.9 2.2-1.9 2.6.4-3.4-.5-7.4-1.6-10.5z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5L12 12l9-4.5M12 12v9"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>'
  };
  M.icon = ICON;

  // official logo; logo-light.svg is for dark backgrounds
  function logoImg(light) {
    return '<img class="logo-img" src="assets/' + (light ? "logo-light" : "logo") + '.svg" alt="' + esc(M.store.name) + '" width="130" height="30">';
  }
  M.logo = logoImg;

  /* ---------- product media & cards ---------- */
  M.media = function (p, eager) {
    if (p.image) {
      return '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="' + (eager ? "eager" : "lazy") + '">';
    }
    return M.art(p.art);
  };
  M.tileStyle = function (p) { return "--tile:" + M.tint((p.art && p.art.color) || "#64748b", 0.9); };

  function badge(p) {
    if (p.stock < 1) return '<span class="badge badge-out">Sold out</span>';
    if (p.was && p.was > p.price) return '<span class="badge badge-sale"><b>' + Math.round((1 - p.price / p.was) * 100) + "%</b> OFF</span>";
    if (p.badge) return '<span class="badge">' + esc(p.badge) + "</span>";
    return "";
  }
  M.badge = badge;

  M.priceHtml = function (p) {
    return '<span class="price">' + money(p.price) + "</span>" +
      (p.was && p.was > p.price ? ' <s class="was"><span class="sr-only">was </span>' + money(p.was) + "</s>" : "");
  };

  M.stockNote = function (p) {
    if (p.stock < 1) return '<span class="stock stock-out">Out of stock</span>';
    if (p.stock <= 5) return '<span class="stock stock-low">Only ' + p.stock + " left</span>";
    return '<span class="stock stock-in">In stock</span>';
  };

  // Takealot-style card: big square image on white, two-line name, price;
  // the whole card opens the product page
  M.card = function (p) {
    var href = "product.html?id=" + encodeURIComponent(p.id);
    var wished = M.wish.has(p.id);
    var note = p.stock < 1 ? '<p class="card-note is-out">Sold out</p>' :
      p.stock <= 5 ? '<p class="card-note">Only ' + p.stock + " left</p>" : "";
    return '<article class="card' + (p.stock < 1 ? " is-sold-out" : "") + '">' +
      '<div class="card-media" aria-hidden="true">' + M.media(p) + "</div>" +
      badge(p) +
      '<button type="button" class="wish-btn' + (wished ? " is-on" : "") + '" data-wish="' + esc(p.id) + '" aria-pressed="' + wished + '" aria-label="Save ' + esc(p.name) + ' to wishlist">' + ICON.heart + "</button>" +
      '<div class="card-body">' +
        '<h3 class="card-title"><a href="' + href + '">' + esc(p.name) + "</a></h3>" +
        '<p class="card-price">' + M.priceHtml(p) + "</p>" + note +
      "</div>" +
    "</article>";
  };

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  M.toast = function (msg) {
    if (!toastEl) return;
    toastEl.innerHTML = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2600);
  };

  /* ---------- header / footer / drawers ---------- */
  var page = document.body.getAttribute("data-page");
  var params = new URLSearchParams(location.search);

  // a compact product row, used in the mega menu and search suggestions
  function mini(p, attrs) {
    return '<a class="mini" href="product.html?id=' + encodeURIComponent(p.id) + '"' + (attrs || "") + ">" +
      '<span class="mini-media" style="' + M.tileStyle(p) + '">' + M.media(p) + "</span>" +
      '<span class="mini-text"><span class="mini-name">' + esc(p.name) + "</span>" +
      '<span class="mini-price">' + M.priceHtml(p) + "</span></span></a>";
  }

  function picksFor(catId, n) {
    return M.products.filter(function (p) { return p.category === catId && p.stock > 0; })
      .sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || ((b.was || b.price) - b.price) - ((a.was || a.price) - a.price); })
      .slice(0, n);
  }

  function megaPanel(c) {
    var types = M.typesOf(c.id);
    return '<div class="mega" id="mega-' + c.id + '" hidden><div class="wrap mega-grid">' +
      '<div class="mega-col"><p class="mega-title">' + esc(c.name) + "</p><ul class=\"mega-types\">" +
        types.map(function (t) {
          return '<li><a href="index.html?cat=' + c.id + "&type=" + encodeURIComponent(t.type) + '#shop">' + esc(M.plural(t.type)) +
            '<span class="n">' + t.count + "</span></a></li>";
        }).join("") + "</ul>" +
        '<a class="mega-all" href="index.html?cat=' + c.id + '#shop">Shop all ' + esc(c.name) + ICON.arrow + "</a></div>" +
      '<div class="mega-col"><p class="mega-title">Popular right now</p><div class="mega-picks">' +
        picksFor(c.id, 4).map(function (p) { return mini(p); }).join("") + "</div></div>" +
      '<a class="mega-feature" href="index.html?cat=' + c.id + '#shop" style="--tile:' + M.tint(c.art.color, 0.86) + '">' +
        '<span class="mega-art">' + M.art(c.art) + "</span>" +
        "<b>" + esc(c.name) + "</b><span>" + esc(c.blurb) + "</span>" +
        '<span class="mega-cta">Browse ' + M.products.filter(function (p) { return p.category === c.id; }).length + " products" + ICON.arrow + "</span></a>" +
    "</div></div>";
  }

  function renderHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;
    var s = M.store, d = s.delivery;
    var dealCount = M.products.filter(function (p) { return p.was && p.was > p.price; }).length;
    var activeCat = page === "home" ? params.get("cat") : page === "product" ? (M.byId(params.get("id") || "") || {}).category : null;
    var perks = [[ICON.truck, "Free delivery on orders over " + money(d.freeOver)]];
    if (d.collect) perks.push([ICON.store, "Free in-store collection"]);
    perks.push([ICON.shield, "Genuine brands you can trust"]);

    host.innerHTML =
      '<a class="skip" href="#main">Skip to content</a>' +
      '<div class="promo-bar"><div class="wrap promo-list">' + perks.map(function (k) {
        return '<p class="promo-item">' + k[0] + "<span>" + esc(k[1]) + "</span></p>";
      }).join("") +
      (s.whatsapp ? '<a class="promo-help" href="https://wa.me/' + esc(s.whatsapp) + '" target="_blank" rel="noopener">' + ICON.chat + "Need help? WhatsApp us</a>" : "") +
      "</div></div>" +
      '<header class="masthead"><div class="wrap bar">' +
        '<button type="button" class="icon-btn menu-btn" data-open-menu aria-controls="menu-drawer" aria-label="Open menu">' + ICON.menu + "</button>" +
        '<a class="logo" href="index.html">' + logoImg() + "</a>" +
        '<div class="search-wrap">' +
          '<form class="search" action="index.html" role="search">' +
            '<label class="sr-only" for="q">Search products</label>' +
            '<input id="q" name="q" type="search" placeholder="Search laptops, phones, chargers…" autocomplete="off" spellcheck="false"' +
              ' role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggest-list" value="' + esc(params.get("q") || "") + '">' +
            '<button type="submit" aria-label="Search">' + ICON.search + "</button>" +
          "</form>" +
          '<div class="suggest" id="suggest" hidden><div class="wrap suggest-body" role="listbox" id="suggest-list" aria-label="Search suggestions"></div></div>' +
        "</div>" +
        '<div class="actions">' +
          '<a class="orders-link" href="orders.html"' + (page === "orders" ? ' aria-current="page"' : "") + ">Orders</a>" +
          '<a class="act wish-link" href="wishlist.html" aria-label="Wishlist"' + (page === "wishlist" ? ' aria-current="page"' : "") + ">" +
            '<span class="act-icon">' + ICON.heart + '</span><span class="act-label">Wishlist</span><span class="count" data-wish-count hidden></span></a>' +
          '<span class="act-sep" aria-hidden="true"></span>' +
          '<button type="button" class="act cart-btn" data-open-cart aria-label="Open cart">' +
            '<span class="act-icon">' + ICON.cart + '</span><span class="act-label">Cart</span><span class="count" data-cart-count hidden></span></button>' +
        "</div>" +
      "</div>" +
      '<nav class="cat-nav" aria-label="Shop by category"><div class="wrap cat-row"><ul class="cat-list">' +
        '<li><a class="cat-link" data-nav="all" href="index.html#shop">All products</a></li>' +
        M.categories.map(function (c) {
          return '<li class="has-mega"><a class="cat-link" data-nav="' + c.id + '" href="index.html?cat=' + c.id + '#shop"' +
            (activeCat === c.id ? ' aria-current="page"' : "") + ">" + esc(c.name) + "</a>" +
            '<button type="button" class="mega-toggle" aria-expanded="false" aria-controls="mega-' + c.id + '" aria-label="' + esc(c.name) + ' menu">' + ICON.chevron + "</button>" +
            megaPanel(c) + "</li>";
        }).join("") +
        "</ul>" +
        '<a class="deals-link" data-nav="deals" href="index.html?deals=1#shop"' + (page === "home" && params.get("deals") ? ' aria-current="page"' : "") + ">" +
          ICON.flame + "On sale" + (dealCount ? '<span class="deals-n">' + dealCount + "</span>" : "") + "</a>" +
      "</div></nav></header>" +
      '<div class="search-scrim" hidden></div>';

    setupSearch(host);
    setupMega(host);
    var mast = host.querySelector(".masthead");
    var onScroll = function () { mast.classList.toggle("is-scrolled", window.scrollY > 40); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* search panel: drops down under the header when the search box is
     focused. Empty box → recent + popular searches and departments;
     typing → live product matches. The input is an ARIA combobox and
     every row in the panel is an option you can reach with the arrows. */
  var RECENT_KEY = "mabs.recent.v1";
  function recentSearches() { return read(RECENT_KEY, []).filter(function (q) { return typeof q === "string" && q; }); }
  function saveRecent(q) {
    q = q.trim(); if (!q) return;
    var list = recentSearches().filter(function (r) { return r.toLowerCase() !== q.toLowerCase(); });
    list.unshift(q);
    write(RECENT_KEY, list.slice(0, 5));
  }

  function setupSearch(host) {
    var wrap = host.querySelector(".search-wrap");
    var form = host.querySelector(".search");
    var input = form.q;
    var panel = host.querySelector("#suggest");
    var body = panel.querySelector(".suggest-body");
    var bar = host.querySelector(".bar");
    var scrim = host.querySelector(".search-scrim");
    var options = [], active = -1, isOpen = false, hideTimer, enterTimer;

    function shopUrl(q) { return "index.html" + (q ? "?q=" + encodeURIComponent(q) : "") + "#shop"; }
    function go(q) { saveRecent(q); location.href = shopUrl(q); }

    function termRow(q, icon, i) {
      return '<a class="sg-term" role="option" id="sg-t' + i + '" aria-selected="false" tabindex="-1" data-term="' + esc(q) + '" href="' + shopUrl(q) + '">' +
        icon + "<span>" + esc(q) + "</span></a>";
    }

    function renderIdle() {
      var recent = recentSearches();
      var popular = (M.store.popularSearches || []).filter(function (q) {
        return !recent.some(function (r) { return r.toLowerCase() === q.toLowerCase(); });
      }).slice(0, 6);
      var n = 0;
      var html = '<div class="sg-cols">';
      if (recent.length) {
        html += '<section class="sg-group" role="group" aria-labelledby="sg-h-recent"><div class="sg-head"><h2 id="sg-h-recent">Recent searches</h2>' +
          '<button type="button" class="sg-clear" data-clear-recent>Clear</button></div>' +
          recent.map(function (q) { return termRow(q, ICON.clock, n++); }).join("") + "</section>";
      }
      if (popular.length) {
        html += '<section class="sg-group" role="group" aria-labelledby="sg-h-pop"><div class="sg-head"><h2 id="sg-h-pop">Popular searches</h2></div>' +
          popular.map(function (q) { return termRow(q, ICON.trend, n++); }).join("") + "</section>";
      }
      html += '<section class="sg-group" role="group" aria-labelledby="sg-h-cat"><div class="sg-head"><h2 id="sg-h-cat">Shop by department</h2></div>' +
        M.categories.map(function (c, i) {
          var n = M.products.filter(function (p) { return p.category === c.id; }).length;
          return '<a class="sg-dept" role="option" id="sg-c' + i + '" aria-selected="false" tabindex="-1" href="index.html?cat=' + c.id + '#shop">' +
            '<span class="sg-dept-text"><span class="sg-dept-name">' + esc(c.name) + '</span><span class="sg-dept-blurb">' + esc(c.blurb) + "</span></span>" +
            '<span class="sg-dept-n">' + n + "</span>" + ICON.arrow + "</a>";
        }).join("") + "</section>";
      body.innerHTML = html + "</div>";
    }

    function renderResults(q) {
      var all = M.products.filter(function (p) { return M.matchQuery(p, q); });
      if (!all.length) {
        body.innerHTML = '<div class="sg-none"><p class="sg-none-title">No products match “' + esc(q) + '”</p>' +
          "<p>Check the spelling, or try a brand or a product type like “laptop” or “charger”.</p></div>";
        return;
      }
      var top = all.slice().sort(function (a, b) { return (b.stock > 0) - (a.stock > 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0); }).slice(0, 8);
      body.innerHTML = '<section class="sg-group" role="group" aria-labelledby="sg-h-prod"><div class="sg-head"><h2 id="sg-h-prod">Products</h2></div>' +
        '<div class="sg-products">' + top.map(function (p, i) {
          return mini(p, ' role="option" id="sg-p' + i + '" aria-selected="false" tabindex="-1" data-term="' + esc(q) + '"');
        }).join("") + "</div>" +
        '<a class="sg-all" role="option" id="sg-all" aria-selected="false" tabindex="-1" data-term="' + esc(q) + '" href="' + shopUrl(q) + '">' +
          "See all " + all.length + (all.length === 1 ? " result" : " results") + " for “" + esc(q) + "”" + ICON.arrow + "</a></section>";
    }

    function render() {
      var q = input.value.trim();
      if (q.length >= 2) renderResults(q); else renderIdle();
      options = Array.prototype.slice.call(body.querySelectorAll('[role="option"]'));
      setActive(-1);
    }

    function setActive(i) {
      options.forEach(function (o, j) { o.classList.toggle("is-active", j === i); o.setAttribute("aria-selected", j === i); });
      active = i;
      if (i >= 0) { input.setAttribute("aria-activedescendant", options[i].id); options[i].scrollIntoView({ block: "nearest" }); }
      else input.removeAttribute("aria-activedescendant");
    }

    function open() {
      clearTimeout(hideTimer);
      render();
      if (isOpen) return;
      isOpen = true;
      panel.style.top = (bar.offsetTop + bar.offsetHeight) + "px"; // sit right under the logo/search row
      panel.hidden = false; scrim.hidden = false;
      input.setAttribute("aria-expanded", "true");
      document.body.classList.add("search-open");
      panel.classList.add("is-entering");
      clearTimeout(enterTimer);
      enterTimer = setTimeout(function () { panel.classList.remove("is-entering"); }, 450);
      requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add("is-open"); scrim.classList.add("is-on"); }); });
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      panel.classList.remove("is-open"); scrim.classList.remove("is-on");
      input.setAttribute("aria-expanded", "false");
      document.body.classList.remove("search-open");
      setActive(-1);
      hideTimer = setTimeout(function () { panel.hidden = true; scrim.hidden = true; }, 260);
    }
    M.closeSearch = close;

    input.addEventListener("focus", open);
    input.addEventListener("click", open);
    input.addEventListener("input", function () { if (isOpen) render(); else open(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!isOpen) open();
        if (!options.length) return;
        e.preventDefault();
        var n = options.length;
        setActive(e.key === "ArrowDown" ? (active + 1) % n : (active <= 0 ? n - 1 : active - 1));
      } else if (e.key === "Enter" && active >= 0) {
        e.preventDefault(); options[active].click();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault(); e.stopPropagation(); close();
      }
    });
    // close once focus leaves the search box and its panel
    wrap.addEventListener("focusout", function (e) { if (!wrap.contains(e.relatedTarget)) close(); });
    // clicks inside the panel shouldn't steal focus from the input
    panel.addEventListener("mousedown", function (e) { if (!e.target.closest("button")) e.preventDefault(); });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("[data-clear-recent]")) {
        write(RECENT_KEY, []); render(); input.focus(); return;
      }
      var opt = e.target.closest("[data-term]");
      if (opt) saveRecent(opt.getAttribute("data-term"));
    });
    scrim.addEventListener("click", function () { close(); input.blur(); });
    window.addEventListener("resize", function () { if (isOpen) panel.style.top = (bar.offsetTop + bar.offsetHeight) + "px"; });
    form.addEventListener("submit", function (e) { e.preventDefault(); go(input.value.trim()); });
  }

  /* category mega menus: hover on desktop, toggle button for touch & keyboard */
  function setupMega(host) {
    var items = host.querySelectorAll(".has-mega");
    var hover = window.matchMedia("(hover: hover) and (min-width: 901px)");
    var current = null, timer;
    function open(li) {
      if (current === li) return;
      close();
      current = li;
      li.classList.add("is-open");
      li.querySelector(".mega").hidden = false;
      li.querySelector(".mega-toggle").setAttribute("aria-expanded", "true");
    }
    function close(refocus) {
      if (!current) return;
      var li = current; current = null;
      li.classList.remove("is-open");
      li.querySelector(".mega").hidden = true;
      var btn = li.querySelector(".mega-toggle");
      btn.setAttribute("aria-expanded", "false");
      if (refocus) btn.focus();
    }
    items.forEach(function (li) {
      li.addEventListener("mouseenter", function () {
        if (!hover.matches) return;
        clearTimeout(timer);
        timer = setTimeout(function () { open(li); }, current ? 0 : 140);
      });
      li.addEventListener("mouseleave", function () {
        if (!hover.matches) return;
        clearTimeout(timer);
        timer = setTimeout(close, 200);
      });
      li.querySelector(".mega-toggle").addEventListener("click", function () {
        clearTimeout(timer);
        if (current === li) close(); else open(li);
      });
      li.addEventListener("focusout", function (e) {
        if (current === li && !li.contains(e.relatedTarget)) close();
      });
    });
    document.addEventListener("click", function (e) { if (current && !current.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && current) close(true); });
  }

  function renderMenu() {
    var s = M.store;
    var dealCount = M.products.filter(function (p) { return p.was && p.was > p.price; }).length;
    return '<aside class="drawer drawer-left" id="menu-drawer" role="dialog" aria-modal="true" aria-labelledby="menu-title" hidden>' +
      '<div class="drawer-head"><a class="logo" href="index.html">' + logoImg() + "</a>" +
        '<h2 id="menu-title" class="sr-only">Menu</h2>' +
        '<button type="button" class="icon-btn" data-close-drawer aria-label="Close menu">' + ICON.close + "</button></div>" +
      '<div class="drawer-body menu-body">' +
        '<a class="menu-link" href="index.html#shop" data-close-drawer>All products' + ICON.arrow + "</a>" +
        M.categories.map(function (c) {
          return '<details class="menu-cat"><summary>' +
            '<span class="menu-art" style="--tile:' + M.tint(c.art.color, 0.86) + '">' + M.art(c.art) + "</span>" +
            '<span class="menu-cat-name">' + esc(c.name) + "<small>" + esc(c.blurb) + "</small></span>" + ICON.chevron + "</summary>" +
            "<ul>" + M.typesOf(c.id).map(function (t) {
              return '<li><a href="index.html?cat=' + c.id + "&type=" + encodeURIComponent(t.type) + '#shop" data-close-drawer>' + esc(M.plural(t.type)) + '<span class="n">' + t.count + "</span></a></li>";
            }).join("") +
            '<li><a class="menu-all" href="index.html?cat=' + c.id + '#shop" data-close-drawer>Shop all ' + esc(c.name) + "</a></li></ul></details>";
        }).join("") +
        '<a class="menu-link menu-deals" href="index.html?deals=1#shop" data-close-drawer>' + ICON.flame + "On sale" +
          (dealCount ? '<span class="deals-n">' + dealCount + "</span>" : "") + "</a>" +
        '<div class="menu-extra">' +
          '<a href="orders.html">' + ICON.box + "Orders</a>" +
          '<a href="wishlist.html">' + ICON.heart + "Wishlist</a>" +
          '<a href="checkout.html">' + ICON.cart + "Checkout</a>" +
          (s.whatsapp ? '<a href="https://wa.me/' + esc(s.whatsapp) + '" target="_blank" rel="noopener">' + ICON.chat + "WhatsApp us</a>" : "") +
          (s.phone ? '<a href="tel:' + esc(s.phone.replace(/\s/g, "")) + '">' + ICON.chat + esc(s.phone) + "</a>" : "") +
        "</div>" +
      "</div></aside>";
  }

  function renderFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    var s = M.store;
    var contact = [];
    if (s.phone) contact.push('<a href="tel:' + esc(s.phone.replace(/\s/g, "")) + '">' + esc(s.phone) + "</a>");
    if (s.whatsapp) contact.push('<a href="https://wa.me/' + esc(s.whatsapp) + '" target="_blank" rel="noopener">WhatsApp us</a>');
    if (s.email) contact.push('<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a>");
    if (s.address) contact.push("<p>" + esc(s.address) + "</p>");
    if (s.hours) contact.push("<p>" + esc(s.hours) + "</p>");
    host.innerHTML = '<footer class="site-footer"><div class="wrap footer-grid">' +
      '<div class="footer-brand"><a class="logo" href="index.html">' + logoImg(true) + "</a>" +
        "<p>" + esc(s.tagline) + ". Shop online, get it delivered or collect in store.</p></div>" +
      '<div class="footer-col"><h2>Shop</h2>' + M.categories.map(function (c) {
        return '<a href="index.html?cat=' + c.id + '#shop">' + esc(c.name) + "</a>";
      }).join("") + '<a href="index.html?deals=1#shop">On sale</a></div>' +
      '<div class="footer-col"><h2>Your order</h2><a href="orders.html">Orders</a><a href="checkout.html">Checkout</a><a href="wishlist.html">Wishlist</a>' +
        "<p>Courier delivery " + money(s.delivery.courierFee) + ", free over " + money(s.delivery.freeOver) + ".</p></div>" +
      (contact.length ? '<div class="footer-col"><h2>Contact</h2>' + contact.join("") + "</div>" : "") +
      "</div>" +
      '<div class="footer-legal"><div class="wrap"><span>&copy; ' + new Date().getFullYear() + " " + esc(s.name) + ". All prices include VAT.</span>" +
        '<span>Website by Web Graphs Technologies</span></div></div>' +
      "</footer>";
  }

  var scrim;
  function renderDrawer() {
    var el = document.createElement("div");
    el.innerHTML =
      '<div class="drawer-scrim" data-close-drawer hidden></div>' + renderMenu() +
      '<aside class="drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" hidden>' +
        '<div class="drawer-head"><h2 id="cart-title">Your cart</h2>' +
        '<button type="button" class="icon-btn" data-close-drawer aria-label="Close cart">' + ICON.close + "</button></div>" +
        '<div class="drawer-body" id="drawer-body"></div>' +
        '<div class="drawer-foot" id="drawer-foot"></div>' +
      "</aside>" +
      '<div class="toast" role="status" aria-live="polite"></div>';
    while (el.firstChild) document.body.appendChild(el.firstChild);
    toastEl = document.querySelector(".toast");
    scrim = document.querySelector(".drawer-scrim");
  }

  M.lineHtml = function (l, compact) {
    var p = l.product;
    var href = "product.html?id=" + encodeURIComponent(p.id);
    return '<li class="line">' +
      '<a class="line-media" href="' + href + '" style="' + M.tileStyle(p) + '" tabindex="-1" aria-hidden="true">' + M.media(p) + "</a>" +
      '<div class="line-info"><a class="line-name" href="' + href + '">' + esc(p.name) + "</a>" +
        '<span class="line-unit">' + money(p.price) + " each</span>" +
        (compact ? '<span class="line-unit">Qty ' + l.qty + "</span>" :
        '<div class="line-controls">' + M.stepper(p, l.qty) +
          '<button type="button" class="link-btn" data-remove="' + esc(p.id) + '" aria-label="Remove ' + esc(p.name) + '">' + ICON.trash + "Remove</button></div>") +
      "</div>" +
      '<span class="line-total">' + money(l.total) + "</span>" +
    "</li>";
  };

  M.stepper = function (p, qty) {
    return '<div class="stepper" role="group" aria-label="Quantity for ' + esc(p.name) + '">' +
      '<button type="button" data-qty="' + esc(p.id) + '" data-step="-1" aria-label="Decrease quantity">' + ICON.minus + "</button>" +
      '<output aria-live="polite">' + qty + "</output>" +
      '<button type="button" data-qty="' + esc(p.id) + '" data-step="1" aria-label="Increase quantity"' + (qty >= p.stock ? " disabled" : "") + ">" + ICON.plus + "</button>" +
    "</div>";
  };

  M.freeDeliveryNote = function (subtotal) {
    var d = M.store.delivery;
    var pct = Math.min(100, Math.round(subtotal / d.freeOver * 100));
    var msg = subtotal >= d.freeOver ? "You've unlocked <b>free delivery</b>." :
      "Add <b>" + money(d.freeOver - subtotal) + "</b> more for free delivery.";
    return '<div class="free-note"><p>' + msg + '</p><div class="meter"><span style="width:' + pct + '%"></span></div></div>';
  };

  function updateDrawer() {
    var body = document.getElementById("drawer-body");
    var foot = document.getElementById("drawer-foot");
    if (!body) return;
    var lines = M.cart.lines();
    if (!lines.length) {
      body.innerHTML = '<div class="empty"><p class="empty-title">Your cart is empty</p><p>Find something you like and it will show up here.</p>' +
        '<a class="btn btn-primary" href="index.html#shop" data-close-drawer>Start shopping</a></div>';
      foot.innerHTML = "";
      return;
    }
    var sub = M.cart.subtotal();
    body.innerHTML = M.freeDeliveryNote(sub) + '<ul class="lines">' + lines.map(function (l) { return M.lineHtml(l); }).join("") + "</ul>";
    foot.innerHTML = '<div class="sum-row"><span>Subtotal</span><b>' + money(sub) + "</b></div>" +
      '<p class="fine">Delivery is worked out at checkout.</p>' +
      '<a class="btn btn-primary btn-block btn-lg" href="checkout.html">Checkout</a>' +
      '<button type="button" class="btn btn-ghost btn-block" data-close-drawer>Continue shopping</button>';
  }

  var lastCount = M.cart.count();
  function updateCounts() {
    var n = M.cart.count();
    var cartBtn = document.querySelector(".cart-btn");
    if (cartBtn && n > lastCount) { // little bump when something is added
      cartBtn.classList.remove("bump"); void cartBtn.offsetWidth; cartBtn.classList.add("bump");
    }
    lastCount = n;
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    var w = M.wish.all().length;
    document.querySelectorAll("[data-wish-count]").forEach(function (el) { el.textContent = w; el.hidden = w === 0; });
    var btn = document.querySelector("[data-open-cart]");
    if (btn) btn.setAttribute("aria-label", "Open cart, " + n + (n === 1 ? " item" : " items") + ", " + money(M.cart.subtotal()));
  }

  /* drawers (cart on the right, menu on the left) share one open/close */
  var openDrawerEl = null, lastFocus = null;
  function openDrawer(id) {
    var d = document.getElementById(id);
    if (!d || openDrawerEl === d) return;
    if (openDrawerEl) closeDrawer(true);
    lastFocus = document.activeElement;
    openDrawerEl = d;
    d.hidden = false; scrim.hidden = false;
    document.body.classList.add("drawer-open");
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add("is-open"); scrim.classList.add("is-on"); }); });
    var opener = document.querySelector('[aria-controls="' + id + '"]');
    if (opener) opener.setAttribute("aria-expanded", "true");
    d.querySelector("[data-close-drawer]").focus();
  }
  function closeDrawer(instant) {
    var d = openDrawerEl;
    if (!d) return;
    openDrawerEl = null;
    d.classList.remove("is-open"); scrim.classList.remove("is-on");
    document.body.classList.remove("drawer-open");
    var opener = document.querySelector('[aria-controls="' + d.id + '"]');
    if (opener) opener.setAttribute("aria-expanded", "false");
    var finish = function () { if (openDrawerEl !== d) { d.hidden = true; if (!openDrawerEl) scrim.hidden = true; } };
    if (instant) finish(); else setTimeout(finish, 240);
    if (!instant && lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  M.openCart = function () { updateDrawer(); openDrawer("cart-drawer"); };
  M.closeCart = function () { if (openDrawerEl && openDrawerEl.id === "cart-drawer") closeDrawer(); };

  /* ---------- delegated actions ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-add],[data-wish],[data-qty],[data-remove],[data-open-cart],[data-open-menu],[data-close-drawer]");
    if (!t) return;
    if (t.hasAttribute("data-add")) {
      var id = t.getAttribute("data-add");
      var p = byId(id);
      var qtyInput = t.getAttribute("data-qty-from") && document.querySelector(t.getAttribute("data-qty-from"));
      var added = M.cart.add(id, qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1);
      if (added) M.toast("<b>" + esc(p.name) + '</b> added to your cart. <button type="button" class="toast-link" data-open-cart>View cart</button>');
      else M.toast("You already have all " + p.stock + " in stock in your cart.");
    } else if (t.hasAttribute("data-wish")) {
      var wid = t.getAttribute("data-wish");
      var on = M.wish.toggle(wid);
      document.querySelectorAll('[data-wish="' + wid + '"]').forEach(function (b) {
        b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on);
      });
      M.toast(on ? "Saved to your wishlist." : "Removed from your wishlist.");
    } else if (t.hasAttribute("data-qty")) {
      var qid = t.getAttribute("data-qty");
      M.cart.set(qid, M.cart.qty(qid) + parseInt(t.getAttribute("data-step"), 10));
    } else if (t.hasAttribute("data-remove")) {
      M.cart.set(t.getAttribute("data-remove"), 0);
    } else if (t.hasAttribute("data-open-cart")) {
      M.openCart();
    } else if (t.hasAttribute("data-open-menu")) {
      openDrawer("menu-drawer");
    } else if (t.hasAttribute("data-close-drawer")) {
      closeDrawer();
    }
  });

  document.addEventListener("keydown", function (e) {
    var d = openDrawerEl;
    if (!d) return;
    if (e.key === "Escape") { closeDrawer(); return; }
    if (e.key === "Tab") { // keep focus inside the open drawer
      var f = Array.prototype.filter.call(d.querySelectorAll("a[href],button:not([disabled]),summary"), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener("cart:change", function () {
    updateCounts();
    var d = document.getElementById("cart-drawer");
    if (d && openDrawerEl === d) {
      // re-render, then return focus to the control the user just pressed
      var active = document.activeElement;
      var sel = active && active.getAttribute("data-qty") ?
        '[data-qty="' + active.getAttribute("data-qty") + '"][data-step="' + active.getAttribute("data-step") + '"]' : null;
      updateDrawer();
      var again = sel && d.querySelector(sel);
      if (again && !again.disabled) again.focus();
      else if (!d.contains(document.activeElement)) d.querySelector("[data-close-drawer]").focus();
    }
  });
  document.addEventListener("wish:change", updateCounts);

  // other tabs changing the cart
  window.addEventListener("storage", function (e) {
    if (e.key === CART_KEY) { cartItems = read(CART_KEY, []).filter(function (it) { return byId(it.id); }); emit("cart:change"); }
    if (e.key === WISH_KEY) { wish = read(WISH_KEY, []).filter(byId); emit("wish:change"); }
  });

  renderHeader();
  renderFooter();
  renderDrawer();
  updateCounts();
})();
