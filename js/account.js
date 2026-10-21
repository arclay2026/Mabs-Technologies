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

  /* realistic open cardboard box for the empty orders state: floats on a
     soft shadow, flaps sway, dust drifts out of it. Drawn in SVG so it
     stays crisp; the flap and dust motion uses SVG <animate>, which is
     left out when the visitor prefers reduced motion. */
  M.emptyBox = function () {
    var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ease = ' calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" dur="3.2s" repeatCount="indefinite"';
    function flap(open, wide, fill) {
      return '<polygon points="' + open + '" fill="' + fill + '">' +
        (still ? "" : '<animate attributeName="points" values="' + open + ";" + wide + ";" + open + '"' + ease + "/>") + "</polygon>";
    }
    function dust(x, delay) {
      if (still) return "";
      return '<circle cx="' + x + '" cy="96" r="2" fill="#e8d6bf" opacity="0">' +
        '<animate attributeName="cy" values="96;44" dur="3.3s" begin="' + delay + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;.9;0" keyTimes="0;.3;1" dur="3.3s" begin="' + delay + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="r" values="1.6;2.6;1.2" dur="3.3s" begin="' + delay + 's" repeatCount="indefinite"/></circle>';
    }
    return '<span class="empty-box' + (still ? " is-still" : "") + '" aria-hidden="true"><svg viewBox="0 0 200 200">' +
      "<defs>" +
        '<linearGradient id="bx-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ddab71"/><stop offset="1" stop-color="#c58b4f"/></linearGradient>' +
        '<linearGradient id="bx-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3864a"/><stop offset="1" stop-color="#a66c35"/></linearGradient>' +
        '<linearGradient id="bx-f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecc28c"/><stop offset="1" stop-color="#d59e60"/></linearGradient>' +
        '<linearGradient id="bx-b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#a8723c"/><stop offset="1" stop-color="#c99359"/></linearGradient>' +
        '<clipPath id="bx-open"><polygon points="100,70 146,92 100,114 54,92"/></clipPath>' +
      "</defs>" +
      '<ellipse class="empty-box-shadow" cx="100" cy="176" rx="50" ry="8" fill="#22313a"/>' +
      '<g class="empty-box-body">' +
        flap("54,92 100,70 88,40 42,62", "54,92 100,70 84,37 37,60", "url(#bx-b)") +
        flap("100,70 146,92 158,62 112,40", "100,70 146,92 163,60 116,37", "url(#bx-b)") +
        '<polygon points="100,70 146,92 100,114 54,92" fill="#4f3118"/>' +
        '<g clip-path="url(#bx-open)"><polygon points="54,92 100,70 100,124 54,146" fill="#87582b"/><polygon points="100,70 146,92 146,146 100,124" fill="#6f4622"/></g>' +
        dust(92, 0) + dust(106, 1.1) + dust(99, 2.2) +
        '<polygon points="54,92 100,114 100,166 54,144" fill="url(#bx-l)"/>' +
        '<polygon points="100,114 146,92 146,144 100,166" fill="url(#bx-r)"/>' +
        '<path d="M100 114V166" stroke="#fff" stroke-opacity=".22" stroke-width="1.5"/>' +
        '<polygon points="113,128 135,117.5 135,129.5 113,140" fill="#fff" opacity=".92"/>' +
        '<polygon points="116,131 126,126.2 126,129 116,133.8" fill="#0071e3"/>' +
        flap("54,92 100,114 72,122 26,100", "54,92 100,114 70,118 23,96", "url(#bx-f)") +
        flap("100,114 146,92 174,100 128,122", "100,114 146,92 177,96 130,118", "url(#bx-f)") +
      "</g></svg></span>";
  };

  // simple line icon on a soft blue disc, for empty states
  M.emptyIcon = function (icon) { return '<span class="empty-icon" aria-hidden="true">' + icon + "</span>"; };
})();
