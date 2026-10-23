/* =====================================================================
   MABS TECHNOLOGIES — MY ACCOUNT / ORDERS (orders.html)
   ---------------------------------------------------------------------
   Orders placed from this browser (localStorage "mabs.orders.v1",
   written by checkout.js), filtered by period, newest first. Every order
   sits at "Placed" until the shop can confirm orders through a database;
   then load the signed-in customer's orders and real statuses here.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS, esc = M.esc, money = M.money, I = M.icon;
  var host = document.getElementById("orders");
  var period = document.getElementById("period");
  var S = M.store;

  M.accountNav("orders");

  var all = M.read("mabs.orders.v1", []).filter(function (o) { return o && o.number && o.items; })
    .sort(function (a, b) { return (b.placed || "").localeCompare(a.placed || ""); });

  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) + ", " +
      d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  }
  function payment(o) {
    if (o.payment === "eft") return "EFT / bank transfer";
    return o.fulfil === "collect" ? "Pay on collection" : "Pay on delivery";
  }
  function fulfilment(o) {
    if (o.fulfil === "collect") return "Collect in store" + (S.address ? " — " + esc(S.address) : "");
    var a = o.address || {};
    return [a.street, a.suburb, a.city, a.province, a.postal].filter(Boolean).map(esc).join(", ");
  }
  function periodLabel() {
    return period.value === "all" ? "" : " in the " + period.options[period.selectedIndex].text.toLowerCase();
  }

  // order progress; step 0 (Placed) until real statuses exist
  function tracker(o, step) {
    var steps = ["Placed", "Confirmed", o.fulfil === "collect" ? "Ready for collection" : "Out for delivery", o.fulfil === "collect" ? "Collected" : "Delivered"];
    return '<ol class="track" aria-label="Order progress">' + steps.map(function (s, i) {
      var state = i < step ? "done" : i === step ? "now" : "todo";
      return '<li class="is-' + state + '"' + (i === step ? ' aria-current="step"' : "") + '><span class="track-dot">' + (i <= step ? I.check : "") + "</span>" + esc(s) + "</li>";
    }).join("") + "</ol>";
  }

  function contact(o) {
    var msg = "Hi Mabs Technologies, I have a question about order " + o.number + ".";
    if (S.whatsapp) return '<a class="order-link" href="https://wa.me/' + esc(S.whatsapp) + "?text=" + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + I.chat + "Contact us about this order</a>";
    if (S.email) return '<a class="order-link" href="mailto:' + esc(S.email) + "?subject=" + encodeURIComponent("Order " + o.number) + '">' + I.chat + "Contact us about this order</a>";
    return "";
  }

  function orderCard(o) {
    var count = o.items.reduce(function (n, i) { return n + i.qty; }, 0);
    return '<article class="order" aria-label="Order ' + esc(o.number) + '">' +
      '<header class="order-head">' +
        '<div class="order-meta"><span>Order number</span><b>' + esc(o.number) + "</b></div>" +
        '<div class="order-meta"><span>Placed</span><b>' + when(o.placed) + "</b></div>" +
        '<div class="order-meta"><span>Total</span><b>' + money(o.total) + "</b></div>" +
        '<span class="order-status">Awaiting confirmation</span>' +
      "</header>" +
      tracker(o, 0) +
      '<div class="order-body">' +
        '<ul class="order-items">' + o.items.map(function (i) {
          var p = M.byId(i.id);
          var media = p ? M.media(p) : "";
          var name = p ? '<a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(i.name) + "</a>" : esc(i.name);
          return '<li><span class="order-thumb">' + media + "</span>" +
            '<span class="order-item-text">' + name + "<small>" + (i.size ? "Size " + esc(i.size) + " · " : "") + "Qty " + i.qty + " · " + money(i.price) + " each</small></span>" +
            '<b class="order-item-total">' + money(i.price * i.qty) + "</b></li>";
        }).join("") + "</ul>" +
        '<div class="order-side">' +
          '<div class="order-fact"><span>' + (o.fulfil === "collect" ? "Collection" : "Delivery address") + "</span><p>" + fulfilment(o) + "</p></div>" +
          '<div class="order-fact"><span>Payment</span><p>' + payment(o) + "</p></div>" +
          '<dl class="totals">' +
            "<div><dt>Subtotal (" + count + (count === 1 ? " item" : " items") + ")</dt><dd>" + money(o.subtotal) + "</dd></div>" +
            "<div><dt>" + (o.fulfil === "collect" ? "Collection" : "Delivery") + "</dt><dd>" + (o.fee ? money(o.fee) : "Free") + "</dd></div>" +
            '<div class="grand"><dt>Total</dt><dd>' + money(o.total) + "</dd></div>" +
          "</dl>" +
        "</div>" +
      "</div>" +
      '<footer class="order-foot">' + contact(o) +
        '<button type="button" class="btn btn-ghost order-again" data-reorder="' + esc(o.number) + '">' + I.cart + "Order again</button>" +
      "</footer>" +
    "</article>";
  }

  function render() {
    var days = period.value === "all" ? Infinity : +period.value;
    var since = Date.now() - days * 864e5;
    var list = all.filter(function (o) { return days === Infinity || new Date(o.placed).getTime() >= since; });
    host.classList.toggle("account-panel-flush", list.length > 0);
    if (!list.length) {
      host.innerHTML = '<div class="account-empty">' + M.emptyBox() +
        '<p class="account-empty-title">No orders' + (all.length || period.value !== "all" ? periodLabel() : " yet") + "</p>" +
        "<p>When you place an order, you can follow it here.</p>" +
        '<a class="btn btn-primary" href="index.html#shop">Start shopping</a></div>';
      return;
    }
    host.innerHTML = '<p class="orders-intro">' + list.length + (list.length === 1 ? " order" : " orders") + periodLabel() +
      ". Orders placed on this device; sign-in and live tracking are coming soon.</p>" +
      '<div class="orders-list">' + list.map(orderCard).join("") + "</div>";
  }

  host.addEventListener("click", function (e) {
    var b = e.target.closest("[data-reorder]"); if (!b) return;
    var o = all.filter(function (x) { return x.number === b.getAttribute("data-reorder"); })[0];
    var added = 0, missing = 0;
    o.items.forEach(function (i) { var p = M.byId(i.id); if (p && p.stock > 0 && M.cart.add(i.id, i.qty, i.size)) added++; else missing++; });
    if (added) M.openCart();
    M.toast(added ? "Items from " + esc(o.number) + " added to your cart." + (missing ? " Some are no longer available." : "") : "These items are no longer available.");
  });
  period.addEventListener("change", render);
  render();
})();
