/* =====================================================================
   MABS TECHNOLOGIES — CHECKOUT (checkout.html)
   ---------------------------------------------------------------------
   When the shop backend is running (js/api.js loaded the catalogue from
   it), orders go to api/orders.php, which rechecks stock, prices every
   line, saves the order and emails the shop and the customer.
   Without the backend (e.g. on GitHub Pages) the order is kept in this
   browser and the confirmation screen lets the customer send it to the
   shop by WhatsApp or email, using the contact details in catalog.js.
   Either way a copy is kept in localStorage "mabs.orders.v1" for the
   Orders page until customer accounts exist.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var esc = M.esc, money = M.money;
  var form = document.getElementById("checkout-form");
  var wrap = document.getElementById("checkout");
  var d = M.store.delivery;

  /* ---------- fulfilment options ---------- */
  document.getElementById("fulfil-options").innerHTML =
    '<label class="option"><input type="radio" name="fulfil" value="delivery" checked>' +
      '<span class="option-body"><b>Courier delivery</b><span id="courier-note"></span></span>' +
      '<span class="option-price" id="courier-price"></span></label>' +
    (d.collect ? '<label class="option"><input type="radio" name="fulfil" value="collect">' +
      '<span class="option-body"><b>Collect in store</b><span>' +
      (M.store.address ? esc(M.store.address) : "We'll let you know when your order is ready") +
      '</span></span><span class="option-price">Free</span></label>' : "");

  function method() { var r = form.querySelector('input[name="fulfil"]:checked'); return r ? r.value : "delivery"; }

  function setMethod() {
    var collect = method() === "collect";
    var addr = document.getElementById("address-fields");
    addr.hidden = collect;
    addr.querySelectorAll("input,select").forEach(function (el) { el.disabled = collect; });
    document.getElementById("pay-on-label").textContent = collect ? "Pay on collection" : "Pay on delivery";
    renderSummary();
  }

  /* ---------- summary ---------- */
  function renderSummary() {
    var lines = M.cart.lines();
    if (!lines.length) return renderEmpty();
    var sub = M.cart.subtotal();
    var fee = M.deliveryFee(sub, method());
    var free = sub >= d.freeOver;
    document.getElementById("courier-note").textContent = free ? "Your order qualifies for free delivery" : "Free on orders over " + money(d.freeOver);
    document.getElementById("courier-price").textContent = free ? "Free" : money(d.courierFee);
    document.getElementById("summary-body").innerHTML =
      '<ul class="lines lines-compact">' + lines.map(function (l) { return M.lineHtml(l); }).join("") + "</ul>" +
      (method() === "delivery" ? M.freeDeliveryNote(sub) : "") +
      '<dl class="totals">' +
        "<div><dt>Subtotal (" + M.cart.count() + (M.cart.count() === 1 ? " item" : " items") + ")</dt><dd>" + money(sub) + "</dd></div>" +
        "<div><dt>" + (method() === "collect" ? "Collection" : "Delivery") + "</dt><dd>" + (fee ? money(fee) : "Free") + "</dd></div>" +
        '<div class="grand"><dt>Total</dt><dd>' + money(sub + fee) + "</dd></div>" +
        '<div class="vat"><dt>Includes VAT of</dt><dd>' + money((sub + fee) * 15 / 115) + "</dd></div>" +
      "</dl>";
  }

  function renderEmpty() {
    wrap.innerHTML = '<div class="empty empty-page"><p class="empty-title">Your cart is empty</p>' +
      "<p>Add a few things to your cart and come back here to check out.</p>" +
      '<a class="btn btn-primary" href="index.html#shop">Start shopping</a></div>';
  }

  /* ---------- validation ---------- */
  var MESSAGES = {
    "c-name": "Please enter your name.",
    "c-phone": "Please enter a valid cellphone number.",
    "c-email": "Please enter a valid email address.",
    "a-street": "Please enter your street address.",
    "a-city": "Please enter your city or town.",
    "a-province": "Please choose your province.",
    "a-postal": "Please enter a 4-digit postal code."
  };
  function check(el) {
    var err = document.getElementById(el.id + "-err");
    var ok = el.disabled || el.checkValidity();
    el.setAttribute("aria-invalid", !ok);
    if (err) {
      err.textContent = ok ? "" : MESSAGES[el.id];
      if (!ok) el.setAttribute("aria-describedby", err.id); else el.removeAttribute("aria-describedby");
    }
    return ok;
  }
  form.querySelectorAll("[required]").forEach(function (el) {
    el.addEventListener("blur", function () { if (el.value) check(el); });
    el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") check(el); });
  });

  /* ---------- placing the order ---------- */
  function orderNumber() {
    var n = new Date();
    var r = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 4294967295);
    return "MB" + String(n.getFullYear()).slice(2) + ("0" + (n.getMonth() + 1)).slice(-2) + ("0" + n.getDate()).slice(-2) + "-" +
      ("000" + (r % 10000)).slice(-4);
  }

  // keep a copy on this device for the Orders page (until customer accounts exist)
  function rememberOrder(order) {
    var orders = M.read("mabs.orders.v1", []);
    orders.push(order);
    M.write("mabs.orders.v1", orders);
  }

  // save the order on the server when this page's catalogue came from it
  // (it rechecks stock and prices); otherwise only on this device, so
  // checkout keeps working without the backend
  function submitOrder(order) {
    if (!M.api || M.api.source !== "server") { rememberOrder(order); return Promise.resolve(order); }
    return M.api.request("orders.php", {
      method: "POST",
      body: {
        items: order.items.map(function (i) { return { id: i.id, qty: i.qty }; }),
        customer: order.customer, fulfil: order.fulfil,
        payment: order.payment === "on-receipt" ? "on_receipt" : order.payment,
        address: order.address, notes: order.notes,
        website: form.elements.website ? form.elements.website.value : ""
      }
    }).then(function (saved) {
      // the server's numbers win: order number, prices, fee and total
      order.number = saved.number;
      order.placed = saved.placed;
      order.items = saved.items.map(function (i) { return { id: i.id, name: i.name, price: +i.price, qty: i.qty }; });
      order.subtotal = +saved.subtotal; order.fee = +saved.fee; order.total = +saved.total;
      order.received = true;
      order.emailed = !!saved.emailed;
      rememberOrder(order);
      M.api.refresh(); // stock changed
      return order;
    });
  }

  function orderError(err) {
    var code = (err && err.code) || "";
    if (code === "OUT_OF_STOCK" || code === "UNKNOWN_PRODUCT") {
      var p = M.byId(err.data && err.data.product);
      M.api.refresh();
      return (p ? "<b>" + esc(p.name) + "</b>" : "One of your items") +
        (code === "OUT_OF_STOCK" ? " doesn't have enough stock left for your order." : " is no longer available.") +
        " Please update your cart and try again.";
    }
    if (code === "MISSING_DETAILS") return "Please check your name, cellphone number and email address.";
    if (code === "MISSING_ADDRESS") return "Please check your delivery address, province and postal code.";
    if (code === "BAD_ITEM") return "One of the quantities in your cart isn't allowed (up to " + (M.store.maxPerItem || 10) + " of each item). Please update your cart.";
    if (code === "TOO_MANY_ORDERS") return "You've placed several orders in the last few minutes. Please wait a little and try again, or contact us.";
    return "We couldn’t place your order just now. Please check your connection and try again.";
  }

  function orderText(o) {
    var t = "New order " + o.number + " — " + M.store.name + "\n\n";
    o.items.forEach(function (i) { t += i.qty + " × " + i.name + " @ " + money(i.price) + " = " + money(i.price * i.qty) + "\n"; });
    t += "\nSubtotal: " + money(o.subtotal) + "\n" + (o.fulfil === "collect" ? "Collection" : "Delivery") + ": " + (o.fee ? money(o.fee) : "Free") +
      "\nTotal: " + money(o.total) + "\n\n";
    t += "Name: " + o.customer.name + "\nPhone: " + o.customer.phone + "\nEmail: " + o.customer.email + "\n";
    if (o.fulfil === "delivery") {
      var a = o.address;
      t += "Deliver to: " + [a.street, a.suburb, a.city, a.province, a.postal].filter(Boolean).join(", ") + "\n";
    } else t += "Collect in store\n";
    t += "Payment: " + (o.payment === "eft" ? "EFT" : o.fulfil === "collect" ? "Pay on collection" : "Pay on delivery") + "\n";
    if (o.notes) t += "Notes: " + o.notes + "\n";
    return t;
  }

  function renderConfirmation(o) {
    var s = M.store;
    var text = orderText(o);
    var send = [];
    if (s.whatsapp) send.push('<a class="btn btn-primary btn-lg" target="_blank" rel="noopener" href="https://wa.me/' + esc(s.whatsapp) + "?text=" + encodeURIComponent(text) + '">Send order on WhatsApp</a>');
    if (s.email) send.push('<a class="btn ' + (send.length ? "btn-ghost" : "btn-primary") + ' btn-lg" href="mailto:' + esc(s.email) + "?subject=" + encodeURIComponent("Order " + o.number) + "&body=" + encodeURIComponent(text) + '">Email order to us</a>');
    wrap.innerHTML =
      '<div class="confirm panel">' +
        '<div class="confirm-tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
        '<h1 tabindex="-1">Thank you, ' + esc(o.customer.name.split(" ")[0]) + "!</h1>" +
        '<p class="lede">Your order reference is <b class="ref">' + esc(o.number) + "</b>.</p>" +
        (o.received ?
          "<p>We've received your order" + (o.emailed ? " and emailed a copy to " + esc(o.customer.email) : "") + ". We'll contact you on " + esc(o.customer.phone) +
            " to confirm stock" + (o.payment === "eft" ? " and share our banking details" : "") + ".</p>" :
        send.length ?
          "<p>To finish, send your order to us below — we'll reply to confirm stock" + (o.payment === "eft" ? " and share our banking details" : "") + ".</p>" +
          '<div class="confirm-actions">' + send.join("") + "</div>" :
          "<p>We'll contact you on " + esc(o.customer.phone) + " to confirm stock" + (o.payment === "eft" ? " and share our banking details" : "") + ".</p>") +
        '<ul class="lines lines-compact">' + o.items.map(function (i) {
          var p = M.byId(i.id);
          return M.lineHtml({ product: p || { id: i.id, name: i.name, price: i.price, art: { kind: "phone" } }, qty: i.qty, total: i.price * i.qty });
        }).join("") + "</ul>" +
        '<dl class="totals">' +
          "<div><dt>Subtotal</dt><dd>" + money(o.subtotal) + "</dd></div>" +
          "<div><dt>" + (o.fulfil === "collect" ? "Collection" : "Delivery") + "</dt><dd>" + (o.fee ? money(o.fee) : "Free") + "</dd></div>" +
          '<div class="grand"><dt>Total</dt><dd>' + money(o.total) + "</dd></div>" +
        "</dl>" +
        '<div class="confirm-actions"><a class="btn btn-ghost" href="orders.html">View your orders</a><a class="btn btn-ghost" href="index.html">Continue shopping</a></div>' +
      "</div>";
    wrap.querySelector("h1").focus();
    window.scrollTo(0, 0);
  }

  form.addEventListener("change", function (e) { if (e.target.name === "fulfil") setMethod(); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = null;
    form.querySelectorAll("[required]").forEach(function (el) { if (!check(el) && !bad) bad = el; });
    if (bad) { bad.focus(); return; }

    var lines = M.cart.lines();
    if (!lines.length) return renderEmpty();
    var f = form.elements;
    var sub = M.cart.subtotal();
    var fee = M.deliveryFee(sub, method());
    var order = {
      number: orderNumber(),
      placed: new Date().toISOString(),
      items: lines.map(function (l) { return { id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }; }),
      subtotal: sub, fee: fee, total: sub + fee,
      fulfil: method(),
      payment: form.querySelector('input[name="payment"]:checked').value,
      customer: { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim() },
      address: method() === "delivery" ? {
        street: f.street.value.trim(), suburb: f.suburb.value.trim(), city: f.city.value.trim(),
        province: f.province.value, postal: f.postal.value.trim()
      } : null,
      notes: f.notes.value.trim()
    };
    var btn = document.getElementById("place-order");
    var alertEl = document.getElementById("order-alert");
    alertEl.hidden = true;
    btn.disabled = true; btn.textContent = "Placing order…";
    submitOrder(order).then(function (saved) {
      M.cart.clear();
      renderConfirmation(saved);
    }, function (err) {
      btn.disabled = false; btn.textContent = "Place order";
      alertEl.innerHTML = orderError(err);
      alertEl.hidden = false;
      alertEl.focus();
    });
  });

  document.addEventListener("cart:change", function () { if (document.getElementById("summary-body")) renderSummary(); });

  setMethod();
})();
