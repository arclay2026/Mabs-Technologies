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
  // product type → menu heading: "Kettle" → "Kettles", "Smartwatch" → "Smartwatches";
  // already plural or uncountable types ("Headphones", "Cookware", "Gaming") stay as they are
  var PLURAL = { Mouse: "Mice", TV: "TVs" };
  function plural(t) {
    if (PLURAL[t]) return PLURAL[t];
    if (/(s|ware|wear|ing|ery|care|age|ment|ure|food)$/i.test(t)) return t;
    if (/(x|z|ch|sh)$/i.test(t)) return t + "es";
    if (/[^aeiou]y$/i.test(t)) return t.slice(0, -1) + "ies";
    return t + "s";
  }
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable: keep in memory only */ }
  }
  function emit(name) { document.dispatchEvent(new CustomEvent(name)); }
  M.esc = esc; M.money = money; M.byId = byId; M.catName = catName;
  M.matchQuery = matchQuery; M.typesOf = typesOf; M.plural = plural; M.read = read; M.write = write;

  /* ---------- sizes ----------
     A product whose specs list two or more sizes ("Size: S, M, L, XL" or
     "Shoe size: UK 6, UK 7, UK 8") asks the shopper to choose one. Each size
     is its own cart line; stock is shared between them. */
  var SIZE_SPECS = ["size", "clothing size", "shoe size"];
  M.sizesOf = function (p) {
    if (!p) return [];
    if (p._sizes) return p._sizes;
    var out = [];
    (p.specs || []).some(function (s) {
      var v = String(s[1]);
      if (SIZE_SPECS.indexOf(String(s[0]).trim().toLowerCase()) === -1 || /\d\s*("|\u201d|\u2033|inch)/i.test(v)) return false; // 24" is a screen
      out = v.split(/\s*[,\/]\s*/).filter(Boolean);
      return true;
    });
    return (p._sizes = out.length > 1 ? out : []);
  };
  // specs for one-line summaries: the size list is left out when there's a size picker
  M.keySpecs = function (p) {
    var sized = M.sizesOf(p).length;
    return (p.specs || []).filter(function (s) { return !(sized && SIZE_SPECS.indexOf(String(s[0]).trim().toLowerCase()) !== -1); });
  };
  // a cart line's own name: the product id, plus the size when it has one
  M.lineKey = function (id, size) { return size ? id + "|" + size : id; };

  /* ---------- cart ---------- */
  var CART_KEY = "mabs.cart.v1";
  // keep lines whose product still exists, with a size it still comes in (or none, if it has no sizes)
  var cartItems = read(CART_KEY, []).filter(function (it) {
    var p = byId(it.id), sizes = M.sizesOf(p);
    return p && (sizes.length ? sizes.indexOf(it.size) !== -1 : !it.size);
  });

  // the most of a product one order may have: what's in stock, up to the shop's per-item limit
  M.maxQty = function (p) { return Math.min(p.stock, M.store.maxPerItem || 10); };

  function units(id) { return cartItems.reduce(function (n, it) { return n + (it.id === id ? it.qty : 0); }, 0); }
  function lineAt(id, size) {
    for (var i = 0; i < cartItems.length; i++) if (cartItems[i].id === id && (cartItems[i].size || "") === (size || "")) return i;
    return -1;
  }

  M.cart = {
    // qty(id): all of a product, whatever the size; qty(id, size): one line
    qty: function (id, size) {
      if (size === undefined) return units(id);
      var i = lineAt(id, size);
      return i === -1 ? 0 : cartItems[i].qty;
    },
    // the most one line can hold: the product's limit, less what its other sizes take
    room: function (id, size) {
      var p = byId(id);
      return p ? Math.max(0, M.maxQty(p) - units(id) + this.qty(id, size || "")) : 0;
    },
    set: function (id, qty, size) {
      var p = byId(id); if (!p) return 0;
      var sizes = M.sizesOf(p);
      size = sizes.length ? size || "" : "";
      if (sizes.length && sizes.indexOf(size) === -1) return 0; // must be one of its sizes
      qty = Math.max(0, Math.min(Math.floor(qty) || 0, this.room(id, size)));
      var i = lineAt(id, size);
      if (i === -1) { if (qty > 0) cartItems.push(size ? { id: id, qty: qty, size: size } : { id: id, qty: qty }); }
      else if (qty > 0) cartItems[i].qty = qty; // keeps its place in the cart
      else cartItems.splice(i, 1);
      write(CART_KEY, cartItems); emit("cart:change");
      return qty;
    },
    add: function (id, qty, size) {
      var p = byId(id); if (!p || p.stock < 1) return 0;
      var before = this.qty(id, size || "");
      var after = this.set(id, before + (qty || 1), size);
      return Math.max(0, after - before);
    },
    lines: function () {
      return cartItems.map(function (it) {
        var p = byId(it.id);
        return { product: p, qty: it.qty, total: p.price * it.qty, size: it.size || "", key: M.lineKey(it.id, it.size) };
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
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l1.6-2.2h6.8L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.4"/></svg>',
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

  // brand logo for the top corner of a card, in the site's dark slate
  // (assets/brands/dark/); brands without a logo show their name instead
  function brandMark(name) {
    var b = (M.brands || []).filter(function (x) { return x.name === name; })[0];
    if (b) return '<span class="card-brandmark"><img src="' + esc(b.logo.replace("assets/brands/", "assets/brands/dark/")) + '" alt="' + esc(name) + '" style="height:' + Math.round(b.h * 0.6) + 'px" loading="lazy"></span>';
    return '<span class="card-brandmark is-text">' + esc(name) + "</span>";
  }

  // five stars filled to the rating (e.g. 4.3), for cards, the product page and reviews
  var STAR = '<path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z"/>';
  M.stars = function (rating, label) {
    var row = "";
    for (var i = 0; i < 5; i++) row += '<svg viewBox="0 0 24 24" aria-hidden="true">' + STAR + "</svg>";
    var pct = Math.max(0, Math.min(100, rating / 5 * 100));
    return '<span class="stars" role="img" aria-label="' + esc(label || rating + " out of 5 stars") + '">' +
      '<span class="stars-off">' + row + '</span><span class="stars-on" style="width:' + pct + '%">' + row + "</span></span>";
  };

  // Takealot-style card: big square image on white, two-line name, price;
  // the whole card opens the product page
  // little camera with the number of photos, when a product has more than one
  function photosBadge(p) {
    var n = p.images ? p.images.length : 0;
    return n > 1 ? '<span class="card-photos">' + ICON.camera + n + "</span>" : "";
  }

  // M.card(p) for grids; M.card(p, { rich: true }) adds brand, stock, delivery,
  // wishlist and Add to cart (used for search results)
  M.card = function (p, opts) {
    if (opts && opts.rich) return richCard(p);
    var href = "product.html?id=" + encodeURIComponent(p.id);
    var note = p.stock < 1 ? '<p class="card-note is-out">Sold out</p>' :
      p.stock <= 5 ? '<p class="card-note">Only ' + p.stock + " left</p>" : "";
    return '<article class="card' + (p.stock < 1 ? " is-sold-out" : "") + '">' +
      '<div class="card-media" aria-hidden="true">' + M.media(p) + photosBadge(p) + "</div>" +
      badge(p) +
      brandMark(p.brand) +
      '<div class="card-body">' +
        '<h3 class="card-title"><a href="' + href + '">' + esc(p.name) + "</a></h3>" +
        '<p class="card-price">' + M.priceHtml(p) + "</p>" +
        (p.rating && p.rating.count ? '<p class="card-rating">' + M.stars(p.rating.avg, "Rated " + p.rating.avg + " out of 5") +
          '<span>(' + p.rating.count + ")</span></p>" : "") + note +
      "</div>" +
    "</article>";
  };

  /* ---------- confirmation pop-up ----------
     M.confirm({ title, text, media, confirm: "Remove", cancel: "Cancel", danger: true })
     → Promise<boolean>. Escape, the backdrop and Cancel all answer false. */
  M.confirm = function (o) {
    return new Promise(function (resolve) {
      var back = document.activeElement;
      var el = document.createElement("div");
      el.className = "modal";
      el.innerHTML =
        '<div class="modal-scrim" data-modal-no></div>' +
        '<div class="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-text">' +
          (o.media ? '<div class="modal-media" aria-hidden="true">' + o.media + "</div>" : "") +
          '<h2 id="modal-title">' + esc(o.title) + "</h2>" +
          '<p id="modal-text">' + (o.html || esc(o.text || "")) + "</p>" +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-ghost" data-modal-no>' + esc(o.cancel || "Cancel") + "</button>" +
            '<button type="button" class="btn ' + (o.danger ? "btn-danger" : "btn-primary") + '" data-modal-yes>' + esc(o.confirm || "OK") + "</button>" +
          "</div>" +
        "</div>";
      document.body.appendChild(el);
      document.body.classList.add("modal-open");
      requestAnimationFrame(function () { el.classList.add("is-open"); });
      // the safe choice has the focus, so Enter by habit doesn't delete anything
      var no = el.querySelector(".modal-actions [data-modal-no]"), yes = el.querySelector("[data-modal-yes]");
      no.focus();
      function done(answer) {
        document.removeEventListener("keydown", keys, true);
        el.remove();
        document.body.classList.remove("modal-open");
        if (back && back.isConnected) back.focus();
        resolve(answer);
      }
      function keys(e) {
        if (e.key === "Escape") { e.preventDefault(); done(false); }
        else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === no ? yes : no).focus(); } // stay inside
      }
      document.addEventListener("keydown", keys, true);
      el.addEventListener("click", function (e) {
        if (e.target.closest("[data-modal-yes]")) done(true);
        else if (e.target.closest("[data-modal-no]")) done(false);
      });
    });
  };

  function richCard(p) {
    var href = "product.html?id=" + encodeURIComponent(p.id);
    var out = p.stock < 1, wished = M.wish.has(p.id), d = M.store.delivery;
    var save = p.was && p.was > p.price ? p.was - p.price : 0;
    return '<article class="card card-rich' + (out ? " is-sold-out" : "") + '">' +
      '<div class="card-media" aria-hidden="true">' + M.media(p) + photosBadge(p) + "</div>" +
      badge(p) +
      '<button type="button" class="card-wish' + (wished ? " is-on" : "") + '" data-wish="' + esc(p.id) + '" aria-pressed="' + wished + '" aria-label="Save ' + esc(p.name) + ' to wishlist">' + ICON.heart + "</button>" +
      '<div class="card-body">' +
        '<h3 class="card-title"><a href="' + href + '">' + esc(p.name) + "</a></h3>" +
        '<a class="card-brandlink" href="index.html?brand=' + encodeURIComponent(p.brand) + '#shop">' + esc(p.brand) + "</a>" +
        (p.rating && p.rating.count ? '<p class="card-rating">' + M.stars(p.rating.avg, "Rated " + p.rating.avg + " out of 5") + "<span>" + p.rating.avg.toFixed(1) + " (" + p.rating.count + ")</span></p>" : "") +
        '<p class="card-price">' + M.priceHtml(p) + "</p>" +
        '<p class="card-save">' + (save ? "Save " + money(save) : "") + "</p>" + // kept when empty so rows line up
        '<ul class="card-facts">' +
          "<li>" + M.stockNote(p) + "</li>" +
          (out ? "" : '<li class="card-eta">' + ICON.truck + "<span>" + (p.price >= d.freeOver ? "Free delivery" : "Delivery") + " by <b>" + M.deliveryBy() + "</b></span></li>") +
        "</ul>" +
        '<div class="card-buy">' +
          (out ? '<button type="button" class="btn card-add" disabled>Sold out</button>' :
            M.sizesOf(p).length ? '<a class="btn card-add" href="' + href + '#size">' + ICON.cart + "<span>Choose size</span></a>" : // sizes are picked on the product page
            '<button type="button" class="btn card-add" data-add="' + esc(p.id) + '">' + ICON.cart + "<span>Add to cart</span></button>") +
        "</div>" +
      "</div>" +
    "</article>";
  }

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

  // a compact product row, used in the search suggestions
  function mini(p, attrs) {
    return '<a class="mini" href="product.html?id=' + encodeURIComponent(p.id) + '"' + (attrs || "") + ">" +
      '<span class="mini-media" style="' + M.tileStyle(p) + '">' + M.media(p) + "</span>" +
      '<span class="mini-text"><span class="mini-name">' + esc(p.name) + "</span>" +
      '<span class="mini-price">' + M.priceHtml(p) + "</span></span></a>";
  }

  // "Shop by department" dropdown beside the logo: departments down the left,
  // the one pointed at (or focused) shows its product types and top picks on the right
  function deptMenu() {
    var deals = M.products.filter(function (p) { return p.was && p.was > p.price; }).length;
    var rail = "", panes = "";
    M.categories.forEach(function (c, i) {
      var items = M.products.filter(function (p) { return p.category === c.id; });
      var href = "index.html?cat=" + encodeURIComponent(c.id) + "#shop";
      var picks = items.filter(function (p) { return p.stock > 0; })
        .sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || ((b.was || b.price) - b.price) - ((a.was || a.price) - a.price); }).slice(0, 3);
      rail += '<li><a class="dept-link' + (i ? "" : " is-active") + '" href="' + href + '" data-dept="' + esc(c.id) + '">' +
        '<span class="dept-ico" aria-hidden="true">' + M.art(c.art || {}) + "</span>" + esc(c.name) + ICON.chevron + "</a></li>";
      panes += '<section class="dept-pane" data-pane="' + esc(c.id) + '"' + (i ? " hidden" : "") + ">" +
        '<div class="dept-pane-head"><a class="dept-title" href="' + href + '">' + esc(c.name) + "</a>" +
          (c.blurb ? "<p>" + esc(c.blurb) + "</p>" : "") + "</div>" +
        '<div class="dept-pane-body"><ul class="dept-types">' +
          M.typesOf(c.id).map(function (t) {
            return '<li><a href="index.html?cat=' + encodeURIComponent(c.id) + "&type=" + encodeURIComponent(t.type) + '#shop">' + esc(M.plural(t.type)) + '<span class="n">' + t.count + "</span></a></li>";
          }).join("") +
          '<li><a class="dept-all" href="' + href + '">Shop all ' + items.length + (items.length === 1 ? " product" : " products") + ICON.arrow + "</a></li></ul>" +
        (picks.length ? '<div class="dept-picks"><p class="dept-picks-title">Popular in ' + esc(c.name) + "</p>" + picks.map(function (p) { return mini(p); }).join("") + "</div>" : "") +
        "</div></section>";
    });
    return '<div class="has-mega dept-menu">' +
      '<button type="button" class="mega-toggle dept-btn" aria-expanded="false" aria-controls="mega-dept">Shop by department' + ICON.chevron + "</button>" +
      '<div class="mega dept-panel" id="mega-dept" hidden><div class="wrap dept-wrap">' +
        '<nav class="dept-rail" aria-label="Departments"><ul>' + rail + "</ul>" +
          '<div class="dept-rail-foot"><a class="dept-every" href="index.html#shop">All products<span class="n">' + M.products.length + "</span></a>" +
          '<a class="deals-link" href="index.html?deals=1#shop">' + ICON.flame + "On sale" + (deals ? '<span class="deals-n">' + deals + "</span>" : "") + "</a></div></nav>" +
        '<div class="dept-panes">' + panes + "</div>" +
      "</div></div></div>";
  }
  // pointing at or focusing a department shows its panel
  function setupDeptMenu(host) {
    var panel = host.querySelector(".dept-panel");
    if (!panel) return;
    var timer;
    function show(link) {
      var id = link.getAttribute("data-dept");
      panel.querySelectorAll(".dept-link").forEach(function (l) { l.classList.toggle("is-active", l === link); });
      panel.querySelectorAll(".dept-pane").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== id; });
    }
    panel.addEventListener("mouseover", function (e) {
      var link = e.target.closest(".dept-link");
      clearTimeout(timer);
      // a short pause, so moving across to the panel doesn't switch departments on the way
      if (link && !link.classList.contains("is-active")) timer = setTimeout(function () { show(link); }, 90);
    });
    panel.addEventListener("focusin", function (e) { var link = e.target.closest(".dept-link"); if (link) show(link); });
    panel.addEventListener("keydown", function (e) {
      var link = e.target.closest(".dept-link");
      if (!link || ["ArrowDown", "ArrowUp", "ArrowRight"].indexOf(e.key) === -1) return;
      e.preventDefault();
      if (e.key === "ArrowRight") { var first = panel.querySelector(".dept-pane:not([hidden]) a"); if (first) first.focus(); return; }
      var links = Array.prototype.slice.call(panel.querySelectorAll(".dept-link"));
      var next = links[links.indexOf(link) + (e.key === "ArrowDown" ? 1 : -1)];
      if (next) next.focus();
    });
  }

  function renderHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;
    var s = M.store, d = s.delivery;
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
        deptMenu() +
        '<div class="search-wrap">' +
          '<form class="search" action="index.html" role="search">' +
            '<label class="sr-only" for="q">Search products</label>' +
            '<input id="q" name="q" type="search" placeholder="Search for products, brands and more…" autocomplete="off" spellcheck="false"' +
              ' role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggest-list" value="' + esc(params.get("q") || "") + '">' +
            '<button type="submit" aria-label="Search">' + ICON.search + "</button>" +
          "</form>" +
          '<div class="suggest" id="suggest" hidden><div class="wrap suggest-body" role="listbox" id="suggest-list" aria-label="Search suggestions"></div></div>' +
        "</div>" +
        '<div class="actions">' +
          '<a class="orders-link" href="orders.html"' + (page === "orders" ? ' aria-current="page"' : "") + ">Orders</a>" +
          '<span class="links-sep" aria-hidden="true"></span>' +
          '<a class="orders-link" href="orders.html">My Account</a>' +
          '<a class="act wish-link" href="wishlist.html" aria-label="Wishlist"' + (page === "wishlist" ? ' aria-current="page"' : "") + ">" +
            '<span class="act-icon">' + ICON.heart + '</span><span class="act-label">Wishlist</span><span class="count" data-wish-count hidden></span></a>' +
          '<span class="act-sep" aria-hidden="true"></span>' +
          '<a class="act cart-btn" href="cart.html" aria-label="Cart"' + (page === "cart" ? ' aria-current="page"' : "") + ">" +
            '<span class="act-icon">' + ICON.cart + '</span><span class="act-label">Cart</span><span class="count" data-cart-count hidden></span></a>' +
        "</div>" +
      "</div>" +
      "</header>" +
      '<div class="search-scrim" hidden></div>';

    setupSearch(host);
    setupMega(host);
    setupDeptMenu(host);
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
      html += '<section class="sg-group" role="group" aria-labelledby="sg-h-cat"><div class="sg-head"><h2 id="sg-h-cat">Shop by department</h2></div><div class="sg-depts">' +
        M.categories.map(function (c, i) {
          var n = M.products.filter(function (p) { return p.category === c.id; }).length;
          return '<a class="sg-dept" role="option" id="sg-c' + i + '" aria-selected="false" tabindex="-1" href="index.html?cat=' + encodeURIComponent(c.id) + '#shop"' + (c.blurb ? ' title="' + esc(c.blurb) + '"' : "") + ">" +
            '<span class="sg-dept-ico" aria-hidden="true">' + M.art(c.art || {}) + "</span>" +
            '<span class="sg-dept-name">' + esc(c.name) + "</span>" +
            '<span class="sg-dept-n">' + n + "</span></a>";
        }).join("") + "</div></section>";
      body.innerHTML = html + "</div>";
    }

    function renderResults(q) {
      var all = M.products.filter(function (p) { return M.matchQuery(p, q); });
      if (!all.length) {
        body.innerHTML = '<div class="sg-none"><p class="sg-none-title">No products match “' + esc(q) + '”</p>' +
          "<p>Check the spelling, or try a brand or a product type like “kettle” or “sneakers”.</p></div>";
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
          '<a href="orders.html">' + ICON.user + "My Account</a>" +
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
    var s = M.store, d = s.delivery, svc = s.service || {};
    var RETURN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>';
    var contact = [];
    if (s.phone) contact.push('<a href="tel:' + esc(s.phone.replace(/\s/g, "")) + '">' + esc(s.phone) + "</a>");
    if (s.whatsapp) contact.push('<a href="https://wa.me/' + esc(s.whatsapp) + '" target="_blank" rel="noopener">WhatsApp us</a>');
    if (s.email) contact.push('<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a>");
    if (s.address) contact.push("<p>" + esc(s.address) + "</p>");
    if (s.hours) contact.push("<p>" + esc(s.hours) + "</p>");
    var promise = function (icon, title, text, href) {
      return '<a class="promise" href="' + href + '">' + icon + "<span><b>" + title + "</b>" + text + "</span></a>";
    };
    host.innerHTML = '<footer class="site-footer">' +
      '<div class="footer-promises"><div class="wrap">' +
        promise(ICON.truck, "Nationwide delivery", "Free on orders over " + money(d.freeOver), "help.html#delivery") +
        (d.collect ? promise(ICON.store, "Free collection", "Collect in store at no cost", "help.html#collection") : "") +
        promise(ICON.shield, "Genuine products", "From brands and suppliers you can trust", "help.html#warranty") +
        promise(RETURN, "Easy returns", "Unused items within 7 days", "help.html#returns") +
      "</div></div>" +
      '<div class="wrap footer-grid">' +
        '<div class="footer-brand"><a class="logo" href="index.html">' + logoImg(true) + "</a>" +
          "<p>" + esc(s.tagline) + ". Shop online, get it delivered anywhere in South Africa or collect in store.</p>" +
          (contact.length ? '<div class="footer-contact">' + contact.join("") + "</div>" : "") + "</div>" +
        '<div class="footer-col"><h2>Help</h2><a href="help.html#delivery">Delivery</a>' + (d.collect ? '<a href="help.html#collection">Collect in store</a>' : "") +
          '<a href="help.html#payment">Payment options</a><a href="help.html#returns">Returns</a><a href="help.html#warranty">Warranty</a><a href="help.html#contact">Contact us</a></div>' +
        '<div class="footer-col"><h2>Your account</h2><a href="orders.html">Orders</a><a href="wishlist.html">Wishlist</a><a href="checkout.html">Checkout</a></div>' +
        '<div class="footer-col"><h2>We accept</h2><ul class="pay-list"><li>EFT / bank transfer</li><li>Card on delivery</li><li>Cash on delivery</li></ul></div>' +
      "</div>" +
      '<div class="footer-legal"><div class="wrap"><span>&copy; ' + new Date().getFullYear() + " " + esc(s.name) + ". All prices in rand and include VAT.</span>" +
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

  // a cart line for the side cart and checkout; quantities are changed on the cart page
  M.lineHtml = function (l) {
    var p = l.product;
    var href = "product.html?id=" + encodeURIComponent(p.id);
    return '<li class="line">' +
      '<a class="line-media" href="' + href + '" style="' + M.tileStyle(p) + '" tabindex="-1" aria-hidden="true">' + M.media(p) + "</a>" +
      '<div class="line-info"><a class="line-name" href="' + href + '">' + esc(p.name) + "</a>" +
        (l.size ? '<span class="line-size">Size ' + esc(l.size) + "</span>" : "") +
        '<span class="line-unit">' + money(p.price) + " each</span>" +
        '<span class="line-unit">Qty ' + l.qty + "</span>" +
      "</div>" +
      '<span class="line-total">' + money(l.total) + "</span>" +
    "</li>";
  };

  /* ---------- courier delivery estimate, in working days (Mon–Fri) ---------- */
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  M.MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function addWorkingDays(from, n) {
    var t = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    while (n > 0) { t.setDate(t.getDate() + 1); if (t.getDay() % 6) n--; }
    return t;
  }
  function shortDay(t) { return DAYS[t.getDay()] + " " + t.getDate() + " " + M.MONTHS[t.getMonth()]; }
  // e.g. "Mon 26 Oct – Wed 28 Oct"; orders after 15:00 go out the next day
  // the latest expected delivery day, e.g. "Thu 29 Oct"
  M.deliveryBy = function () { return M.deliveryEta().split(" – ")[1]; };
  M.deliveryEta = function () {
    var span = (M.store.service && M.store.service.deliveryDays) || [2, 4];
    var start = new Date();
    if (start.getHours() >= 15) start.setDate(start.getDate() + 1);
    return shortDay(addWorkingDays(start, span[0])) + " – " + shortDay(addWorkingDays(start, span[1]));
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
      '<a class="btn btn-ghost btn-block" href="cart.html">View cart</a>';
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
    var btn = document.querySelector(".cart-btn");
    if (btn) btn.setAttribute("aria-label", "Cart, " + n + (n === 1 ? " item" : " items") + ", " + money(M.cart.subtotal()));
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

  /* ---------- "open products in new tab" (switch above the homepage carousel) ---------- */
  var NEWTAB_KEY = "mabs.newtab.v1";
  M.newTab = !!read(NEWTAB_KEY, false);
  var newTabSwitch = document.getElementById("newtab-switch");
  if (newTabSwitch) {
    newTabSwitch.setAttribute("aria-checked", M.newTab);
    newTabSwitch.addEventListener("click", function () {
      M.newTab = !M.newTab;
      write(NEWTAB_KEY, M.newTab);
      newTabSwitch.setAttribute("aria-checked", M.newTab);
      M.toast(M.newTab ? "Products will open in a new tab." : "Products will open in this tab.");
    });
  }
  // applied when a product link is clicked, so it covers every card on every page
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="product.html"]');
    if (!a) return;
    if (M.newTab) { a.target = "_blank"; a.rel = "noopener"; }
    else if (a.target === "_blank") { a.removeAttribute("target"); a.removeAttribute("rel"); }
  }, true);

  /* ---------- delegated actions ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-add],[data-wish],[data-open-cart],[data-open-menu],[data-close-drawer]");
    if (!t) return;
    if (t.hasAttribute("data-add")) {
      var id = t.getAttribute("data-add"), size = t.getAttribute("data-size") || "";
      var p = byId(id);
      if (M.sizesOf(p).length && !size) {
        // no size chosen yet: the product page's size picker asks for one; elsewhere, go there
        var picker = document.querySelector('[data-size-for="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
        if (picker) picker.dispatchEvent(new CustomEvent("size:needed"));
        else location.href = "product.html?id=" + encodeURIComponent(id) + "#size";
        return;
      }
      var added = M.cart.add(id, 1, size);
      if (added) M.toast("<b>" + esc(p.name) + "</b>" + (size ? " (size " + esc(size) + ")" : "") + ' added to your cart. <button type="button" class="toast-link" data-open-cart>View cart</button>');
      else M.toast(M.maxQty(p) < p.stock ? "You can order up to " + M.maxQty(p) + " of this item per order" + (M.sizesOf(p).length ? ", in any sizes." : ".") : "You already have all " + p.stock + " in stock in your cart.");
    } else if (t.hasAttribute("data-wish")) {
      var wid = t.getAttribute("data-wish");
      var on = M.wish.toggle(wid);
      document.querySelectorAll('[data-wish="' + wid + '"]').forEach(function (b) {
        b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on);
      });
      M.toast(on ? "Saved to your wishlist." : "Removed from your wishlist.");

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
    if (d && openDrawerEl === d) updateDrawer();
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
