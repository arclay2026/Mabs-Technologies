/* =====================================================================
   MABS TECHNOLOGIES — MY ACCOUNT / ORDERS (orders.html)
   ---------------------------------------------------------------------
   Account menu plus the orders placed from this browser (localStorage
   "mabs.orders.v1", written by checkout.js), filtered by period, newest
   first. Once there are accounts and a database, load the signed-in
   customer's orders here and switch on the "Soon" menu items.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var esc = M.esc, money = M.money, I = M.icon;
  var host = document.getElementById("orders");
  var period = document.getElementById("period");

  /* ---------- account menu ---------- */
  // items without an href need accounts, so they show as "Soon"
  var MENU = [
    { title: "Orders", icon: I.box, items: [{ label: "Orders", href: "orders.html", current: true }, { label: "Invoices" }, { label: "Returns" }] },
    { title: "Payments & Credit", icon: I.card, items: [{ label: "Coupons & offers" }, { label: "Credit & refunds" }] },
    { title: "Profile", icon: I.user, items: [{ label: "Personal details" }, { label: "Security settings" }, { label: "Address book" }, { label: "Newsletter subscriptions" }] },
    { title: "My Lists", icon: I.heart, items: [{ label: "Wishlist", href: "index.html?wish=1#shop" }] }
  ];
  document.getElementById("account-nav").innerHTML = '<h2 class="account-nav-title">My Account</h2>' +
    MENU.map(function (g) {
      return '<div class="account-group"><h3>' + g.icon + esc(g.title) + "</h3><ul>" + g.items.map(function (it) {
        if (!it.href) return '<li><span class="is-soon" aria-disabled="true">' + esc(it.label) + '<small>Soon</small></span></li>';
        return '<li><a href="' + it.href + '"' + (it.current ? ' aria-current="page"' : "") + ">" + esc(it.label) + "</a></li>";
      }).join("") + "</ul></div>";
    }).join("");

  /* ---------- orders ---------- */
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
    if (o.fulfil === "collect") return "Collect in store";
    var a = o.address || {};
    return "Courier to " + [a.street, a.suburb, a.city, a.province, a.postal].filter(Boolean).map(esc).join(", ");
  }
  function periodLabel() {
    return period.value === "all" ? "" : " in the " + period.options[period.selectedIndex].text.toLowerCase();
  }

  // open cardboard box on a soft brand-blue disc
  var BOX = '<svg class="empty-box" viewBox="0 0 160 160" aria-hidden="true">' +
    '<circle cx="80" cy="80" r="76" fill="#eaf3fd" stroke="#fff" stroke-width="4"/>' +
    '<path d="M40 70l40-16 40 16-40 16z" fill="#b98b5a"/>' +
    '<path d="M40 70v40l40 16V86z" fill="#d9a86f"/><path d="M120 70v40l-40 16V86z" fill="#c4935f"/>' +
    '<path d="M40 70l-12 18 40 16 12-18z" fill="#e7bd86"/><path d="M120 70l12 18-40 16-12-18z" fill="#dcae78"/>' +
    '<path d="M80 54l-14-14-38 14 12 16zM80 54l14-14 38 14-12 16z" fill="#efc993"/>' +
    '<rect x="88" y="100" width="22" height="8" rx="2" fill="#fff" opacity=".85"/><rect x="90" y="102" width="6" height="4" rx="1" fill="#0071e3"/>' +
    "</svg>";

  function render() {
    var days = period.value === "all" ? Infinity : +period.value;
    var since = Date.now() - days * 864e5;
    var list = all.filter(function (o) { return days === Infinity || new Date(o.placed).getTime() >= since; });
    if (!list.length) {
      host.innerHTML = '<div class="account-empty">' + BOX +
        "<p>You have no orders" + (all.length || period.value !== "all" ? periodLabel() : " yet") + "</p>" +
        '<a class="btn btn-primary" href="index.html#shop">Start shopping</a></div>';
      return;
    }
    host.innerHTML = '<p class="orders-intro">Showing ' + list.length + (list.length === 1 ? " order" : " orders") + periodLabel() +
      ". These are orders placed on this device; sign-in and live tracking are coming soon.</p>" +
      '<div class="orders-list">' + list.map(function (o) {
        var count = o.items.reduce(function (n, i) { return n + i.qty; }, 0);
        return '<article class="order" aria-label="Order ' + esc(o.number) + '">' +
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
      }).join("") + "</div>";
  }

  period.addEventListener("change", render);
  render();
})();
