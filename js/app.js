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
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable: keep in memory only */ }
  }
  function emit(name) { document.dispatchEvent(new CustomEvent(name)); }
  M.esc = esc; M.money = money; M.byId = byId; M.catName = catName; M.read = read; M.write = write;

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
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>'
  };
  M.icon = ICON;

  var LOGO = '<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#0f172a"/>' +
    '<path d="M10 28V13l10 9 10-9v15" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="28" r="3" fill="#f97316"/></svg>';
  M.logo = LOGO;

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
    if (p.was && p.was > p.price) return '<span class="badge badge-sale">−' + Math.round((1 - p.price / p.was) * 100) + "%</span>";
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

  M.card = function (p) {
    var href = "product.html?id=" + encodeURIComponent(p.id);
    var wished = M.wish.has(p.id);
    return '<article class="card">' +
      '<a class="card-media" href="' + href + '" style="' + M.tileStyle(p) + '" tabindex="-1" aria-hidden="true">' + M.media(p) + "</a>" +
      badge(p) +
      '<button type="button" class="wish-btn' + (wished ? " is-on" : "") + '" data-wish="' + esc(p.id) + '" aria-pressed="' + wished + '" aria-label="Save ' + esc(p.name) + ' to wishlist">' + ICON.heart + "</button>" +
      '<div class="card-body">' +
        '<p class="card-brand">' + esc(p.brand) + " · " + esc(p.type) + "</p>" +
        '<h3 class="card-title"><a href="' + href + '">' + esc(p.name) + "</a></h3>" +
        '<p class="card-price">' + M.priceHtml(p) + "</p>" +
        M.stockNote(p) +
      "</div>" +
      '<button type="button" class="btn btn-primary btn-block card-add" data-add="' + esc(p.id) + '"' + (p.stock < 1 ? " disabled" : "") + ">" +
        (p.stock < 1 ? "Sold out" : ICON.cart + "Add to cart") + "</button>" +
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

  /* ---------- header / footer / drawer ---------- */
  var page = document.body.getAttribute("data-page");
  var params = new URLSearchParams(location.search);

  function renderHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;
    var d = M.store.delivery;
    var promo = "Free delivery on orders over " + money(d.freeOver) + (d.collect ? " · Free in-store collection" : "");
    var activeCat = page === "home" ? params.get("cat") : null;
    var cats = M.categories.map(function (c) {
      return '<a href="index.html?cat=' + c.id + '#shop"' + (activeCat === c.id ? ' aria-current="page"' : "") + ">" + esc(c.name) + "</a>";
    }).join("");
    host.innerHTML =
      '<a class="skip" href="#main">Skip to content</a>' +
      '<div class="promo-bar"><div class="wrap">' + esc(promo) + "</div></div>" +
      '<header class="masthead"><div class="wrap bar">' +
        '<a class="logo" href="index.html" aria-label="' + esc(M.store.name) + ' home">' + LOGO +
          '<span class="logo-text"><b>Mabs</b><small>Technologies</small></span></a>' +
        '<form class="search" action="index.html" role="search">' +
          '<label class="sr-only" for="q">Search products</label>' +
          '<input id="q" name="q" type="search" placeholder="Search laptops, phones, chargers…" autocomplete="off" value="' + esc(params.get("q") || "") + '">' +
          '<button type="submit" aria-label="Search">' + ICON.search + "</button>" +
        "</form>" +
        '<div class="actions">' +
          '<a class="icon-btn" href="index.html?wish=1#shop" aria-label="Wishlist">' + ICON.heart + '<span class="count" data-wish-count hidden></span></a>' +
          '<button type="button" class="icon-btn cart-btn" data-open-cart aria-label="Open cart">' + ICON.cart + '<span class="count" data-cart-count hidden></span><span class="cart-label">Cart</span></button>' +
        "</div>" +
      "</div>" +
      '<nav class="cat-nav" aria-label="Categories"><div class="wrap">' +
        '<a href="index.html#shop"' + (page === "home" && !activeCat && !params.get("deals") && !params.get("wish") && !params.get("q") && location.hash === "#shop" ? ' aria-current="page"' : "") + ">All products</a>" + cats +
        '<a href="index.html?deals=1#shop" class="deals-link"' + (page === "home" && params.get("deals") ? ' aria-current="page"' : "") + ">On sale</a>" +
      "</div></nav></header>";
    // search submits to the shop section
    host.querySelector(".search").addEventListener("submit", function (e) {
      e.preventDefault();
      var q = this.q.value.trim();
      location.href = "index.html" + (q ? "?q=" + encodeURIComponent(q) : "") + "#shop";
    });
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
      '<div class="footer-brand"><a class="logo" href="index.html">' + LOGO + '<span class="logo-text"><b>Mabs</b><small>Technologies</small></span></a>' +
        "<p>" + esc(s.tagline) + ". Shop online, get it delivered or collect in store.</p></div>" +
      '<div class="footer-col"><h2>Shop</h2>' + M.categories.map(function (c) {
        return '<a href="index.html?cat=' + c.id + '#shop">' + esc(c.name) + "</a>";
      }).join("") + '<a href="index.html?deals=1#shop">On sale</a></div>' +
      '<div class="footer-col"><h2>Your order</h2><a href="checkout.html">Checkout</a><a href="index.html?wish=1#shop">Wishlist</a>' +
        "<p>Courier delivery " + money(s.delivery.courierFee) + ", free over " + money(s.delivery.freeOver) + ".</p></div>" +
      (contact.length ? '<div class="footer-col"><h2>Contact</h2>' + contact.join("") + "</div>" : "") +
      "</div>" +
      '<div class="footer-legal"><div class="wrap"><span>&copy; ' + new Date().getFullYear() + " " + esc(s.name) + ". All prices include VAT.</span>" +
        '<span>Website by Web Graphs Technologies</span></div></div>' +
      "</footer>";
  }

  function renderDrawer() {
    var el = document.createElement("div");
    el.innerHTML =
      '<div class="drawer-scrim" data-close-cart hidden></div>' +
      '<aside class="drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" hidden>' +
        '<div class="drawer-head"><h2 id="cart-title">Your cart</h2>' +
        '<button type="button" class="icon-btn" data-close-cart aria-label="Close cart">' + ICON.close + "</button></div>" +
        '<div class="drawer-body" id="drawer-body"></div>' +
        '<div class="drawer-foot" id="drawer-foot"></div>' +
      "</aside>" +
      '<div class="toast" role="status" aria-live="polite"></div>';
    while (el.firstChild) document.body.appendChild(el.firstChild);
    toastEl = document.querySelector(".toast");
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
        '<a class="btn btn-primary" href="index.html#shop" data-close-cart>Start shopping</a></div>';
      foot.innerHTML = "";
      return;
    }
    var sub = M.cart.subtotal();
    body.innerHTML = M.freeDeliveryNote(sub) + '<ul class="lines">' + lines.map(function (l) { return M.lineHtml(l); }).join("") + "</ul>";
    foot.innerHTML = '<div class="sum-row"><span>Subtotal</span><b>' + money(sub) + "</b></div>" +
      '<p class="fine">Delivery is worked out at checkout.</p>' +
      '<a class="btn btn-primary btn-block btn-lg" href="checkout.html">Checkout</a>' +
      '<button type="button" class="btn btn-ghost btn-block" data-close-cart>Continue shopping</button>';
  }

  function updateCounts() {
    var n = M.cart.count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    var w = M.wish.all().length;
    document.querySelectorAll("[data-wish-count]").forEach(function (el) { el.textContent = w; el.hidden = w === 0; });
    var btn = document.querySelector("[data-open-cart]");
    if (btn) btn.setAttribute("aria-label", "Open cart, " + n + (n === 1 ? " item" : " items"));
  }

  var lastFocus = null;
  M.openCart = function () {
    var d = document.getElementById("cart-drawer");
    if (!d || !d.hidden) return;
    lastFocus = document.activeElement;
    updateDrawer();
    d.hidden = false; document.querySelector(".drawer-scrim").hidden = false;
    requestAnimationFrame(function () { document.body.classList.add("cart-open"); });
    d.querySelector("[data-close-cart]").focus();
  };
  M.closeCart = function () {
    var d = document.getElementById("cart-drawer");
    if (!d || d.hidden) return;
    document.body.classList.remove("cart-open");
    setTimeout(function () { d.hidden = true; document.querySelector(".drawer-scrim").hidden = true; }, 220);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  };

  /* ---------- delegated actions ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-add],[data-wish],[data-qty],[data-remove],[data-open-cart],[data-close-cart]");
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
    } else if (t.hasAttribute("data-close-cart")) {
      M.closeCart();
    }
  });

  document.addEventListener("keydown", function (e) {
    var d = document.getElementById("cart-drawer");
    if (!d || d.hidden) return;
    if (e.key === "Escape") { M.closeCart(); return; }
    if (e.key === "Tab") { // keep focus inside the open drawer
      var f = d.querySelectorAll("a[href],button:not([disabled])");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener("cart:change", function () {
    updateCounts();
    var d = document.getElementById("cart-drawer");
    if (d && !d.hidden) {
      // re-render, then return focus to the control the user just pressed
      var active = document.activeElement;
      var sel = active && active.getAttribute("data-qty") ?
        '[data-qty="' + active.getAttribute("data-qty") + '"][data-step="' + active.getAttribute("data-step") + '"]' : null;
      updateDrawer();
      var again = sel && d.querySelector(sel);
      if (again && !again.disabled) again.focus();
      else if (!d.contains(document.activeElement)) d.querySelector("[data-close-cart]").focus();
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
