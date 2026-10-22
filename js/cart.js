/* =====================================================================
   MABS TECHNOLOGIES — SHOPPING CART (cart.html)
   Full cart: each line with its delivery estimate, savings and stock,
   quantity, Remove (with Undo) and Move to wishlist; an order summary
   with savings, delivery and VAT; suggestions underneath.
   Stock is rechecked on every visit: quantities above what's left are
   lowered, and sold-out items must be removed before checkout.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var esc = M.esc, money = M.money, I = M.icon;
  var root = document.getElementById("cart-root");
  var d = M.store.delivery;
  var RETURN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>';
  var notices = {}; // product id → message shown on its line this visit
  var lastRemoved = null;

  // quantities above what's in stock (or the per-item limit) come down to what's possible
  M.cart.lines().forEach(function (l) {
    var max = M.maxQty(l.product);
    if (max > 0 && l.qty > max) {
      M.cart.set(l.product.id, max);
      notices[l.product.id] = max < l.product.stock ?
        "You can order up to " + max + " of this item, so we've updated the quantity." :
        "Only " + max + " left in stock, so we've updated the quantity.";
    }
  });

  function keyline(p) {
    return [p.brand].concat(p.specs.slice(0, 3).map(function (s) { return s[1]; })).map(esc).join(" · ");
  }

  function lineHtml(l) {
    var p = l.product, href = "product.html?id=" + encodeURIComponent(p.id);
    var out = p.stock < 1, max = M.maxQty(p);
    var save = p.was && p.was > p.price ? (p.was - p.price) * l.qty : 0;
    var opts = "";
    for (var n = 1; n <= Math.max(max, l.qty); n++) opts += '<option value="' + n + '"' + (n === l.qty ? " selected" : "") + ">" + n + "</option>";
    var alert = out ? "This item is sold out. Remove it, or move it to your wishlist to buy later." : notices[p.id];
    return '<li class="cl' + (out ? " is-out" : "") + '" data-line="' + esc(p.id) + '">' +
      (alert ? '<p class="cl-alert' + (out ? " is-error" : "") + '" role="status">' + esc(alert) + "</p>" : "") +
      '<div class="cl-main">' +
        '<a class="cl-media" href="' + href + '" tabindex="-1" aria-hidden="true">' + M.media(p) + "</a>" +
        '<div class="cl-info">' +
          '<a class="cl-name" href="' + href + '">' + esc(p.name) + "</a>" +
          '<p class="cl-meta">' + keyline(p) + "</p>" +
          '<ul class="cl-tags">' +
            (out ? "" : "<li>" + M.stockNote(p) + "</li>") +
            (out ? "" : '<li class="cl-eta">' + I.truck + "<span>Delivery <b>" + M.deliveryEta() + "</b>" + (d.collect ? " or free collection" : "") + "</span></li>") +
            (save ? '<li class="cl-save">' + I.check + "You save " + money(save) + "</li>" : "") +
          "</ul>" +
        "</div>" +
        '<div class="cl-price"><b>' + money(p.price * l.qty) + "</b>" +
          (save ? "<s>" + money(p.was * l.qty) + "</s>" : "") +
          (l.qty > 1 ? "<span>" + money(p.price) + " each</span>" : "") + "</div>" +
      "</div>" +
      '<div class="cl-actions">' +
        '<button type="button" class="cl-btn" data-cart-remove="' + esc(p.id) + '" aria-label="Remove ' + esc(p.name) + '">' + I.trash + "<span>Remove</span></button>" +
        '<button type="button" class="cl-btn" data-cart-wish="' + esc(p.id) + '" aria-label="Move ' + esc(p.name) + ' to wishlist">' + I.heart + "<span>" + (M.wish.has(p.id) ? "Remove from cart (saved)" : "Move to wishlist") + "</span></button>" +
        (out ? "" : '<label class="cl-qty"><span>Qty</span><select data-cart-qty="' + esc(p.id) + '" aria-label="Quantity of ' + esc(p.name) + '">' + opts + "</select></label>") +
      "</div>" +
    "</li>";
  }

  function summaryHtml(lines) {
    var ok = lines.filter(function (l) { return l.product.stock > 0; });
    var count = ok.reduce(function (n, l) { return n + l.qty; }, 0);
    var sub = ok.reduce(function (n, l) { return n + l.total; }, 0);
    var savings = ok.reduce(function (n, l) { var p = l.product; return n + (p.was && p.was > p.price ? (p.was - p.price) * l.qty : 0); }, 0);
    var fee = M.deliveryFee(sub, "delivery");
    var total = sub + fee;
    var blocked = ok.length < lines.length;
    return '<section class="cart-summary" aria-labelledby="sum-title">' +
        '<h2 id="sum-title">Order summary</h2>' +
        M.freeDeliveryNote(sub) +
        '<dl class="cart-totals">' +
          "<div><dt>Subtotal (" + count + " item" + (count === 1 ? "" : "s") + ")</dt><dd>" + money(sub) + "</dd></div>" +
          (savings ? '<div class="is-save"><dt>Your savings</dt><dd>−' + money(savings) + "</dd></div>" : "") +
          "<div><dt>Courier delivery</dt><dd>" + (fee ? money(fee) : "Free") + "</dd></div>" +
          '<div class="grand"><dt>Total</dt><dd>' + money(total) + "</dd></div>" +
        "</dl>" +
        '<p class="fine cart-vat">Includes VAT of ' + money(Math.round(total * 15 / 115)) + "." + (d.collect ? " Collect in store instead and delivery is free." : "") + "</p>" +
        (blocked ? '<p class="cl-alert is-error">Remove sold-out items to continue.</p>' : "") +
        '<a class="btn btn-primary btn-block btn-lg' + (blocked ? " is-disabled" : "") + '" href="checkout.html"' + (blocked ? ' aria-disabled="true" tabindex="-1"' : "") + ">Proceed to checkout</a>" +
      "</section>" +
      '<ul class="cart-trust">' +
        "<li>" + I.card + "<span><b>Flexible payment</b>EFT, or card or cash on delivery</span></li>" +
        "<li>" + I.truck + "<span><b>Nationwide delivery</b>Free over " + money(d.freeOver) + (d.collect ? ", or collect in store" : "") + "</span></li>" +
        "<li>" + RETURN + "<span><b>Easy returns</b>Unused items within 7 days</span></li>" +
        "<li>" + I.shield + "<span><b>Genuine products</b>With the manufacturer's warranty</span></li>" +
      "</ul>" +
      // phones: total and checkout stay in reach at the bottom of the screen
      '<div class="cart-bar"><div><span>Total</span><b>' + money(total) + "</b></div>" +
        '<a class="btn btn-primary' + (blocked ? " is-disabled" : "") + '" href="checkout.html"' + (blocked ? ' aria-disabled="true" tabindex="-1"' : "") + ">Checkout</a></div>";
  }

  function render() {
    var lines = M.cart.lines();
    var n = M.cart.count();
    document.getElementById("cart-count").textContent = n ? "(" + n + " item" + (n === 1 ? "" : "s") + ")" : "";
    if (!lines.length) {
      var wished = M.wish.all().length;
      root.innerHTML = '<div class="cart-empty">' + (M.emptyBox ? M.emptyBox() : "") +
        "<h2>Your cart is empty</h2><p>Browse the shop and add what you like. It will be waiting here.</p>" +
        '<div class="cart-empty-actions"><a class="btn btn-primary btn-lg" href="index.html#shop">Start shopping</a>' +
        (wished ? '<a class="btn btn-ghost btn-lg" href="wishlist.html">View wishlist (' + wished + ")</a>" : "") + "</div></div>";
    } else {
      root.innerHTML = '<div class="cart-layout">' +
        '<ul class="cart-lines" aria-label="Items in your cart">' + lines.map(lineHtml).join("") + "</ul>" +
        '<aside class="cart-side">' + summaryHtml(lines) + "</aside></div>";
    }
    renderRecs(lines);
  }

  function renderRecs(lines) {
    var inCart = {}, cats = {};
    lines.forEach(function (l) { inCart[l.product.id] = 1; cats[l.product.category] = 1; });
    var pool = M.products.filter(function (p) { return !inCart[p.id] && p.stock > 0; });
    var picks = pool.filter(function (p) { return cats[p.category]; });
    if (picks.length < 6) picks = picks.concat(pool.filter(function (p) { return !cats[p.category] && (p.featured || (p.was && p.was > p.price)); }));
    picks = picks.slice(0, 6);
    document.getElementById("recs-title").textContent = lines.length ? "You might also like" : "Popular right now";
    document.getElementById("recs-grid").innerHTML = picks.map(M.card).join("");
    document.getElementById("recs").hidden = !picks.length;
  }

  function name(id) { var p = M.byId(id); return p ? p.name : "Item"; }

  root.addEventListener("change", function (e) {
    var sel = e.target.closest("[data-cart-qty]");
    if (!sel) return;
    var id = sel.getAttribute("data-cart-qty");
    delete notices[id];
    M.cart.set(id, parseInt(sel.value, 10));
    var again = root.querySelector('[data-cart-qty="' + id + '"]');
    if (again) again.focus();
  });

  root.addEventListener("click", function (e) {
    var dis = e.target.closest(".is-disabled");
    if (dis) { e.preventDefault(); return; }
    var rm = e.target.closest("[data-cart-remove]"), mv = e.target.closest("[data-cart-wish]");
    var id = (rm || mv) && (rm || mv).getAttribute(rm ? "data-cart-remove" : "data-cart-wish");
    if (!id) return;
    var line = root.querySelector('[data-line="' + id + '"]');
    lastRemoved = { id: id, qty: M.cart.qty(id), unwish: !!mv && !M.wish.has(id) };
    var next = line && (line.nextElementSibling || line.previousElementSibling);
    if (mv && !M.wish.has(id)) M.wish.toggle(id);
    M.cart.set(id, 0);
    var canUndo = M.byId(id) && M.byId(id).stock > 0; // a sold-out item can't go back in the cart
    if (!canUndo) lastRemoved = null;
    M.toast((mv ? "Moved <b>" + esc(name(id)) + "</b> to your wishlist." : "Removed <b>" + esc(name(id)) + "</b>.") +
      (canUndo ? ' <button type="button" class="toast-link" data-cart-undo>Undo</button>' : ""));
    // keep the keyboard close to where it was
    var target = next && root.querySelector('[data-line="' + next.getAttribute("data-line") + '"] .cl-name');
    (target || document.querySelector(".cart-head h1")).focus();
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-cart-undo]") || !lastRemoved) return;
    if (lastRemoved.unwish && M.wish.has(lastRemoved.id)) M.wish.toggle(lastRemoved.id);
    M.cart.set(lastRemoved.id, lastRemoved.qty);
    M.toast("Back in your cart.");
    lastRemoved = null;
  });

  document.addEventListener("cart:change", render);
  document.addEventListener("wish:change", render);
  document.querySelector(".cart-head h1").setAttribute("tabindex", "-1");
  render();
})();
