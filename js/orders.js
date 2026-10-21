/* =====================================================================
   MABS TECHNOLOGIES — ORDERS (orders.html)
   ---------------------------------------------------------------------
   Lists the orders placed from this browser (localStorage
   "mabs.orders.v1", written by checkout.js), newest first. Once orders
   live in a database, load the signed-in customer's orders here instead.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var esc = M.esc, money = M.money;
  var host = document.getElementById("orders");
  var orders = M.read("mabs.orders.v1", []).filter(function (o) { return o && o.number && o.items; })
    .sort(function (a, b) { return (b.placed || "").localeCompare(a.placed || ""); });

  if (!orders.length) {
    host.insertAdjacentHTML("beforeend", '<div class="empty empty-page"><p class="empty-title">No orders yet</p>' +
      "<p>When you place an order it will show up here.</p>" +
      '<a class="btn btn-primary" href="index.html#shop">Start shopping</a></div>');
    return;
  }

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
    if (o.fulfil === "collect") return "Collect in store";
    var a = o.address || {};
    return "Courier to " + [a.street, a.suburb, a.city, a.province, a.postal].filter(Boolean).map(esc).join(", ");
  }

  host.insertAdjacentHTML("beforeend",
    '<p class="orders-intro">Orders placed on this device. Sign-in and live order tracking are coming soon.</p>' +
    '<div class="orders-list">' + orders.map(function (o) {
      var count = o.items.reduce(function (n, i) { return n + i.qty; }, 0);
      return '<article class="order panel" aria-label="Order ' + esc(o.number) + '">' +
        '<div class="order-head">' +
          '<div class="order-meta"><span>Order</span><b>' + esc(o.number) + "</b></div>" +
          '<div class="order-meta"><span>Placed</span><b>' + when(o.placed) + "</b></div>" +
          '<div class="order-meta"><span>Total</span><b>' + money(o.total) + "</b></div>" +
          '<span class="order-status">Awaiting confirmation</span>' +
        "</div>" +
        '<div class="order-body">' +
          '<ul class="lines lines-compact">' + o.items.map(function (i) {
            var p = M.byId(i.id) || { id: i.id, name: i.name, price: i.price, art: { kind: "phone" } };
            return M.lineHtml({ product: p, qty: i.qty, total: i.price * i.qty }, true);
          }).join("") + "</ul>" +
          '<div class="order-side">' +
            "<p><b>" + (o.fulfil === "collect" ? "Collection" : "Delivery") + "</b>" + fulfilment(o) + "</p>" +
            "<p><b>Payment</b>" + payment(o) + "</p>" +
            '<dl class="totals">' +
              "<div><dt>Subtotal (" + count + (count === 1 ? " item" : " items") + ")</dt><dd>" + money(o.subtotal) + "</dd></div>" +
              "<div><dt>" + (o.fulfil === "collect" ? "Collection" : "Delivery") + "</dt><dd>" + (o.fee ? money(o.fee) : "Free") + "</dd></div>" +
              '<div class="grand"><dt>Total</dt><dd>' + money(o.total) + "</dd></div>" +
            "</dl>" +
          "</div>" +
        "</div>" +
      "</article>";
    }).join("") + "</div>");
})();
