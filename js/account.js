/* =====================================================================
   MABS TECHNOLOGIES — MY ACCOUNT SHELL
   ---------------------------------------------------------------------
   The account menu shared by account.html, orders.html and wishlist.html.
   Items without an href aren't built yet, so they show as "Soon"; the
   profile pages need the shop's server (customer accounts).
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS, esc = M.esc, I = M.icon;

  var MENU = [
    { title: "Orders", icon: I.box, items: [{ key: "orders", label: "Orders", href: "orders.html" }, { label: "Invoices" }, { label: "Returns" }] },
    { title: "My Lists", icon: I.heart, items: [{ key: "wishlist", label: "Wishlist", href: "wishlist.html", count: function () { return M.wish.all().length; } }] },
    { title: "Payments & Credit", icon: I.card, items: [{ label: "Coupons & offers" }, { label: "Credit & refunds" }] },
    { title: "Profile", icon: I.user, items: [
      { key: "details", label: "Personal details", href: "account.html#details", account: true }, { label: "Address book" },
      { key: "security", label: "Security settings", href: "account.html#security", account: true },
      { key: "newsletter", label: "Newsletter", href: "account.html#newsletter", account: true }] }
  ];

  M.accountNav = function (current) {
    var host = document.getElementById("account-nav");
    if (!host) return;
    function draw() {
      var c = M.customer, live = M.account && M.account.available();
      host.innerHTML =
        '<div class="account-user"><span class="account-avatar">' + (c ? esc(c.firstName.charAt(0) + c.lastName.charAt(0)).toUpperCase() : I.user) + "</span>" +
          (c ? "<span><b>" + esc(c.firstName + " " + c.lastName) + "</b><small>" + esc(c.email) + "</small></span>" :
            live ? '<span><b>Guest shopper</b><a class="account-login" href="account.html?tab=signin">Login or register</a></span>' :
            "<span><b>Guest shopper</b><small>Sign-in coming soon</small></span>") + "</div>" +
        MENU.map(function (g) {
          return '<div class="account-group"><h3>' + g.icon + esc(g.title) + "</h3><ul>" + g.items.map(function (it) {
            // profile pages need an account: signed out, they lead to the login
            if (it.account && !live) return '<li><span class="is-soon" aria-disabled="true">' + esc(it.label) + "<small>Soon</small></span></li>";
            if (it.account && !c) return '<li><a href="account.html?tab=signin&amp;next=' + encodeURIComponent(it.href) + '">' + esc(it.label) + "</a></li>";
            if (!it.href) return '<li><span class="is-soon" aria-disabled="true">' + esc(it.label) + "<small>Soon</small></span></li>";
            var n = it.count ? it.count() : 0;
            return '<li><a href="' + it.href + '"' + (it.key === current ? ' aria-current="page"' : "") + ">" + esc(it.label) +
              (n ? '<span class="n">' + n + "</span>" : "") + "</a></li>";
          }).join("") + "</ul></div>";
        }).join("") +
        (c ? '<div class="account-group account-out"><button type="button" class="account-signout" data-sign-out>' + I.close + "Log out</button></div>" : "");
    }
    draw();
    document.addEventListener("wish:change", draw);
    document.addEventListener("account:change", draw);
  };

  // log out from any account page
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sign-out]");
    if (!b) return;
    b.disabled = true;
    M.account.signout().then(function () { location.href = "account.html?tab=signin&out=1"; }, function () { location.href = "account.html?tab=signin&out=1"; });
  });

  /* realistic open cardboard box for the empty orders state: floats on a
     soft shadow, flaps sway, dust drifts out of it. Drawn in SVG so it
     stays crisp; the flap and dust motion uses SVG <animate>, which is
     left out when the visitor prefers reduced motion. */
  // the logo's own shapes (from assets/logo.svg), printed on the box below
  var LOGO_ART = '<path fill="#22313a" d="M670.54,518.17c-7.1-6.41-17.35-9.6-30.74-9.6-5.06,0-9.93.68-14.62,2.03-4.7,1.35-8.93,3.35-12.69,5.99-3.76,2.64-7.04,5.79-9.87,9.43l13.93,10.93c2.58-3.41,5.87-6.11,9.86-8.11,4-1.99,8.22-3,12.69-3,6.45,0,11.66,1.68,15.59,5.03,3.94,3.33,5.91,7.72,5.91,13.12v4.23c-1.41-.7-3.32-1.41-5.73-2.11-2.41-.7-5.17-1.28-8.28-1.76-3.11-.48-6.49-.7-10.13-.7-6.82,0-12.97,1.2-18.49,3.61-5.52,2.41-9.93,5.87-13.21,10.38-3.29,4.53-4.94,9.95-4.94,16.31,0,5.87,1.41,11.09,4.23,15.68,2.83,4.58,6.7,8.12,11.63,10.66,4.93,2.51,10.63,3.78,17.1,3.78,4.23,0,8.04-.62,11.45-1.84,3.4-1.24,6.4-2.83,8.99-4.76,2.58-1.94,4.63-4.03,6.17-6.25h1.23v12.85h20.62v-58.49c0-11.86-3.56-20.98-10.67-27.4ZM657.77,575.44c-1.89,3.57-4.58,6.45-8.11,8.61-3.52,2.19-7.69,3.26-12.51,3.26-5.17,0-9.16-1.25-11.97-3.77-2.83-2.52-4.24-5.74-4.24-9.6,0-4.11,1.48-7.58,4.41-10.39,2.93-2.83,8.04-4.24,15.32-4.24,3.76,0,7.37.42,10.84,1.23,3.46.83,6.49,2,9.08,3.53,0,4-.94,7.77-2.82,11.37Z"/><path fill="#22313a" d="M863.12,558.52c-4.52-4.63-11.19-8.02-19.99-10.13l-13.22-3.17c-3.52-.94-6.54-2.26-9.07-3.96-2.53-1.7-3.79-3.84-3.79-6.43s1.33-4.73,3.96-6.43c2.65-1.7,6.08-2.56,10.31-2.56,3.75,0,7.22.76,10.39,2.29,3.17,1.52,5.75,4.17,7.75,7.93l17.97-7.93c-2-4.46-4.73-8.13-8.19-11.02-3.46-2.87-7.58-5.02-12.34-6.43s-10.01-2.11-15.77-2.11c-6.34,0-12.15,1.09-17.44,3.26-5.29,2.17-9.52,5.26-12.69,9.25-3.17,4-4.76,8.7-4.76,14.1,0,4.82,1.2,9.02,3.61,12.6,2.41,3.59,5.52,6.55,9.34,8.89,3.82,2.35,7.9,4,12.25,4.93l10.75,2.48c2.93.58,5.63,1.35,8.11,2.28,2.47.94,4.49,2.15,6.08,3.61,1.58,1.48,2.37,3.44,2.37,5.91,0,3.52-1.61,6.02-4.85,7.49-3.23,1.47-6.95,2.2-11.18,2.2-4.82,0-9.08-1.17-12.78-3.52-3.69-2.35-6.6-5.82-8.71-10.39l-18.69,8.27c1.65,4.35,4.15,8.35,7.5,11.98,3.34,3.65,7.71,6.58,13.12,8.82,5.41,2.23,11.86,3.34,19.38,3.34,6.93,0,13.21-1.17,18.86-3.52,5.63-2.35,10.12-5.69,13.47-10.04,3.35-4.34,5.02-9.39,5.02-15.15,0-6.58-2.26-12.18-6.78-16.82Z"/><path fill="#22313a" d="M781.78,531.48c-3.83-7.17-8.99-12.78-15.51-16.82-6.52-4.06-13.89-6.09-22.12-6.09-4.46,0-8.51.68-12.16,2.03-3.64,1.35-6.78,3.15-9.43,5.36-2.64,2.25-4.73,4.59-6.25,7.05v-45.11h-20.97v126.15h19.73v-14.27h1.24c1.52,2.48,3.61,4.79,6.25,6.96,2.65,2.18,5.79,3.94,9.43,5.28,3.65,1.35,7.69,2.02,12.16,2.02,8.22,0,15.6-2.02,22.12-6.07,6.52-4.06,11.68-9.68,15.51-16.82,3.82-7.17,5.73-15.45,5.73-24.84s-1.91-17.68-5.73-24.84ZM762.92,571.39c-2.41,4.27-5.54,7.58-9.43,9.86-3.87,2.29-8.1,3.43-12.68,3.43s-8.67-1.17-12.6-3.51c-3.94-2.35-7.11-5.65-9.52-9.87-2.41-4.23-3.61-9.22-3.61-14.97s1.2-10.76,3.61-14.98c2.41-4.23,5.58-7.5,9.52-9.77,3.93-2.29,8.13-3.44,12.6-3.44s8.8,1.15,12.68,3.44c3.89,2.27,7.02,5.52,9.43,9.69,2.41,4.16,3.61,9.19,3.61,15.06s-1.2,10.76-3.61,15.06Z"/><polygon fill="#22313a" points="586.36 477.91 586.36 604.06 564.86 604.06 564.86 515.62 530.51 604.06 513.59 604.06 479.06 515.62 479.06 604.06 457.75 604.06 457.75 477.91 486.28 477.91 521.35 570.23 522.58 570.23 557.82 477.91 586.36 477.91"/><polygon fill="#0071e3" points="301.69 489.56 291.62 520.66 262.33 611.06 217.81 611.06 249.55 513.09 210.09 505.98 254.43 497.98 272.65 494.7 301.69 489.56"/><polygon fill="#0071e3" points="360.05 479.24 317.36 611.06 272.85 611.06 312.84 487.6 360.05 479.24"/><polygon fill="#0071e3" points="418.43 468.93 372.39 611.07 327.88 611.07 371.22 477.28 418.43 468.93"/>';

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
        // logo printed on the right-hand face: skewed to that face's slope (22/46), then fitted to ~34 units wide
        '<g transform="matrix(1 -.4783 0 1 0 0)" opacity=".9"><g transform="translate(106 185.3) scale(.0505) translate(-204 -462)">' + LOGO_ART + "</g></g>" +
        flap("54,92 100,114 72,122 26,100", "54,92 100,114 70,118 23,96", "url(#bx-f)") +
        flap("100,114 146,92 174,100 128,122", "100,114 146,92 177,96 130,118", "url(#bx-f)") +
      "</g></svg></span>";
  };

  /* empty wishlist: a clean outline heart that draws itself in once,
     fills softly, then rests with a very slow pulse (CSS only, so it
     stays still for visitors who prefer reduced motion). */
  M.emptyHeart = function () {
    // starts on the smooth left curve, so the draw-in seam never lands on the tip
    var d = "M2.4 10.8C1.2 7.3 3.5 4 7 4c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.5 0 5.8 3.3 4.6 6.8C19.8 15.8 12 20.5 12 20.5S4.2 15.8 2.4 10.8z";
    return '<span class="empty-heart" aria-hidden="true"><svg viewBox="0 0 24 24">' +
      '<path class="empty-heart-fill" d="' + d + '"/>' +
      '<path class="empty-heart-line" d="' + d + '" pathLength="100"/>' +
      "</svg></span>";
  };

  // simple line icon on a soft blue disc, for empty states
  M.emptyIcon = function (icon) { return '<span class="empty-icon" aria-hidden="true">' + icon + "</span>"; };
})();
