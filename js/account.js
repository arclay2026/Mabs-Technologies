/* =====================================================================
   MABS TECHNOLOGIES — MY ACCOUNT SHELL
   ---------------------------------------------------------------------
   The account menu shared by orders.html and wishlist.html. Items
   without an href need customer accounts (a database), so they show as
   "Soon" until those features exist.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS, esc = M.esc, I = M.icon;

  var MENU = [
    { title: "Orders", icon: I.box, items: [{ key: "orders", label: "Orders", href: "orders.html" }, { label: "Invoices" }, { label: "Returns" }] },
    { title: "My Lists", icon: I.heart, items: [{ key: "wishlist", label: "Wishlist", href: "wishlist.html", count: function () { return M.wish.all().length; } }] },
    { title: "Payments & Credit", icon: I.card, items: [{ label: "Coupons & offers" }, { label: "Credit & refunds" }] },
    { title: "Profile", icon: I.user, items: [{ label: "Personal details" }, { label: "Address book" }, { label: "Security settings" }, { label: "Newsletter" }] }
  ];

  M.accountNav = function (current) {
    var host = document.getElementById("account-nav");
    if (!host) return;
    function draw() {
      host.innerHTML =
        '<div class="account-user"><span class="account-avatar">' + I.user + "</span>" +
          '<span><b>Guest shopper</b><small>Sign-in coming soon</small></span></div>' +
        MENU.map(function (g) {
          return '<div class="account-group"><h3>' + g.icon + esc(g.title) + "</h3><ul>" + g.items.map(function (it) {
            if (!it.href) return '<li><span class="is-soon" aria-disabled="true">' + esc(it.label) + "<small>Soon</small></span></li>";
            var n = it.count ? it.count() : 0;
            return '<li><a href="' + it.href + '"' + (it.key === current ? ' aria-current="page"' : "") + ">" + esc(it.label) +
              (n ? '<span class="n">' + n + "</span>" : "") + "</a></li>";
          }).join("") + "</ul></div>";
        }).join("");
    }
    draw();
    document.addEventListener("wish:change", draw);
  };

  // simple line icon on a soft blue disc, for empty states
  M.emptyIcon = function (icon) { return '<span class="empty-icon" aria-hidden="true">' + icon + "</span>"; };
})();
