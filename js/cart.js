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
  var notices = {}; // line key (product id, plus size) → message shown on that line this visit
  var lastRemoved = null;

  // quantities above what's in stock (or the per-item limit) come down to what's possible
  M.cart.lines().forEach(function (l) {
    var max = M.cart.room(l.product.id, l.size); // sizes of one product share its stock
    if (max > 0 && l.qty > max) {
      M.cart.set(l.product.id, max, l.size);
      notices[l.key] = M.maxQty(l.product) < l.product.stock ?
        "You can order up to " + max + " of this item, so we've updated the quantity." :
        "Only " + max + " left in stock, so we've updated the quantity.";
    }
  });

  // "adidas Grand Court 2.0 Sneakers (size UK 8)"
  function label(l) { return l.product.name + (l.size ? " (size " + l.size + ")" : ""); }
  // the cart line a button or menu belongs to
  function lineOf(key) {
    var lines = M.cart.lines();
    for (var i = 0; i < lines.length; i++) if (lines[i].key === key) return lines[i];
    return null;
  }

  function keyline(p) {
    return [p.brand].concat(M.keySpecs(p).slice(0, 3).map(function (s) { return s[1]; })).map(esc).join(" · ");
  }

  function lineHtml(l) {
    var p = l.product, href = "product.html?id=" + encodeURIComponent(p.id);
    var out = p.stock < 1, max = M.cart.room(p.id, l.size), k = esc(l.key);
    var save = p.was && p.was > p.price ? (p.was - p.price) * l.qty : 0;
    var opts = "";
    for (var n = 1; n <= Math.max(max, l.qty); n++) opts += '<option value="' + n + '"' + (n === l.qty ? " selected" : "") + ">" + n + "</option>";
    var alert = out ? "This item is sold out. Remove it, or move it to your wishlist to buy later." : notices[l.key];
    return '<li class="cl' + (out ? " is-out" : "") + '" data-line="' + k + '">' +
      (alert ? '<p class="cl-alert' + (out ? " is-error" : "") + '" role="status">' + esc(alert) + "</p>" : "") +
      '<div class="cl-main">' +
        '<a class="cl-media" href="' + href + '" tabindex="-1" aria-hidden="true">' + M.media(p) + "</a>" +
        '<div class="cl-info">' +
          '<a class="cl-name" href="' + href + '">' + esc(p.name) + "</a>" +
          (l.size ? '<p class="cl-size">Size <b>' + esc(l.size) + "</b></p>" : "") +
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
        '<button type="button" class="cl-btn" data-cart-remove="' + k + '" aria-label="Remove ' + esc(label(l)) + '">' + I.trash + "<span>Remove</span></button>" +
        '<button type="button" class="cl-btn" data-cart-wish="' + k + '" aria-label="Move ' + esc(label(l)) + ' to wishlist">' + I.heart + "<span>" + (M.wish.has(p.id) ? "Remove from cart (saved)" : "Move to wishlist") + "</span></button>" +
        (out ? "" : '<label class="cl-qty"><span>Qty</span><select data-cart-qty="' + k + '" aria-label="Quantity of ' + esc(label(l)) + '">' + opts + "</select></label>") +
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
        "<li>" + I.shield + "<span><b>Genuine products</b>From brands and suppliers you can trust</span></li>" +
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

  function sel(attr, key) { return "[" + attr + '="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]'; }

  root.addEventListener("change", function (e) {
    var box = e.target.closest("[data-cart-qty]");
    if (!box) return;
    var key = box.getAttribute("data-cart-qty"), l = lineOf(key);
    if (!l) return;
    delete notices[key];
    M.cart.set(l.product.id, parseInt(box.value, 10), l.size);
    var again = root.querySelector(sel("data-cart-qty", key));
    if (again) again.focus();
  });

  root.addEventListener("click", function (e) {
    var dis = e.target.closest(".is-disabled");
    if (dis) { e.preventDefault(); return; }
    var rm = e.target.closest("[data-cart-remove]"), mv = e.target.closest("[data-cart-wish]");
    var key = (rm || mv) && (rm || mv).getAttribute(rm ? "data-cart-remove" : "data-cart-wish");
    var l = key && lineOf(key);
    if (!l) return;
    if (mv) { takeOut(l, true); return; }
    var p = l.product;
    M.confirm({
      title: "Remove this item from your cart?",
      media: M.media(p),
      html: "<b>" + esc(label(l)) + "</b>" + (l.qty > 1 ? " × " + l.qty : "") +
        (p.stock > 0 ? " will be taken out of your cart. You can move it to your wishlist instead to buy it later." : " will be taken out of your cart."),
      confirm: "Remove", cancel: "Keep it", danger: true
    }).then(function (yes) { if (yes) takeOut(l, false); });
  });

  // take a line out of the cart (and onto the wishlist when moving it), with Undo
  function takeOut(l, mv) {
    var id = l.product.id;
    var line = root.querySelector(sel("data-line", l.key));
    lastRemoved = { id: id, size: l.size, qty: l.qty, unwish: !!mv && !M.wish.has(id) };
    var next = line && (line.nextElementSibling || line.previousElementSibling);
    if (mv && !M.wish.has(id)) M.wish.toggle(id);
    M.cart.set(id, 0, l.size);
    var canUndo = l.product.stock > 0; // a sold-out item can't go back in the cart
    if (!canUndo) lastRemoved = null;
    M.toast((mv ? "Moved <b>" + esc(label(l)) + "</b> to your wishlist." : "Removed <b>" + esc(label(l)) + "</b>.") +
      (canUndo ? ' <button type="button" class="toast-link" data-cart-undo>Undo</button>' : ""));
    // keep the keyboard close to where it was
    var target = next && root.querySelector(sel("data-line", next.getAttribute("data-line")) + " .cl-name");
    (target || document.querySelector(".cart-head h1")).focus();
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-cart-undo]") || !lastRemoved) return;
    if (lastRemoved.unwish && M.wish.has(lastRemoved.id)) M.wish.toggle(lastRemoved.id);
    M.cart.set(lastRemoved.id, lastRemoved.qty, lastRemoved.size);
    M.toast("Back in your cart.");
    lastRemoved = null;
  });

  document.addEventListener("cart:change", render);
  document.addEventListener("wish:change", render);
  document.querySelector(".cart-head h1").setAttribute("tabindex", "-1");
  render();
})();
