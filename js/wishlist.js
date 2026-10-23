/* =====================================================================
   MABS TECHNOLOGIES — MY ACCOUNT / WISHLIST (wishlist.html)
   ---------------------------------------------------------------------
   The saved products (localStorage "mabs.wish.v1" via M.wish). Share
   copies a link (wishlist.html?shared=id,id) that opens a read-only copy
   of the list with "Save all to my wishlist".
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS, esc = M.esc, money = M.money, I = M.icon;
  var host = document.getElementById("wishlist");
  var head = document.getElementById("wl-actions");
  var title = document.getElementById("wl-title");
  var shared = (new URLSearchParams(location.search).get("shared") || "").split(",").filter(M.byId);
  var isShared = shared.length > 0;

  M.accountNav(isShared ? "" : "wishlist");
  if (isShared) {
    title.textContent = "Shared wishlist";
    document.title = "Shared wishlist — " + M.store.name;
    document.getElementById("crumb-current").textContent = "Shared wishlist";
  }

  function ids() { return isShared ? shared : M.wish.all(); }
  function products() { return ids().map(M.byId).filter(Boolean); }

  function stock(p) {
    if (p.stock < 1) return '<p class="wl-stock is-out">Sold out</p>';
    if (p.stock <= 5) return '<p class="wl-stock is-low">Only ' + p.stock + " left</p>";
    return '<p class="wl-stock">In stock</p>';
  }

  function row(p) {
    var href = "product.html?id=" + encodeURIComponent(p.id);
    var saving = p.was && p.was > p.price ? p.was - p.price : 0;
    return '<article class="wl-item">' +
      '<a class="wl-media" href="' + href + '" tabindex="-1" aria-hidden="true">' + M.badge(p) + M.media(p) + "</a>" +
      '<div class="wl-info">' +
        '<a class="wl-name" href="' + href + '">' + esc(p.name) + "</a>" +
        '<a class="wl-brand" href="index.html?brand=' + encodeURIComponent(p.brand) + '#shop">' + esc(p.brand) + "</a>" +
        '<p class="wl-specs">' + M.keySpecs(p).slice(0, 2).map(function (s) { return esc(s[1]); }).join(" · ") + "</p>" +
        stock(p) +
      "</div>" +
      '<div class="wl-buy">' +
        '<p class="wl-price">' + M.priceHtml(p) + "</p>" +
        (saving ? '<p class="wl-save">You save ' + money(saving) + "</p>" : "") +
        '<button type="button" class="btn btn-primary wl-add" data-add="' + esc(p.id) + '"' + (p.stock < 1 ? " disabled" : "") + ">" +
          (p.stock < 1 ? "Sold out" : I.cart + (M.sizesOf(p).length ? "Choose size" : "Add to cart")) + "</button>" + // sized: opens its page
        (isShared ? "" : '<button type="button" class="wl-remove" data-wl-remove="' + esc(p.id) + '">' + I.trash + "Remove</button>") +
      "</div>" +
    "</article>";
  }

  function render() {
    var list = products();
    var inStock = list.filter(function (p) { return p.stock > 0; });
    head.innerHTML = list.length ?
      (isShared ? "" : '<button type="button" class="wl-tool" id="wl-share">' + I.share + "Share</button>") +
      '<button type="button" class="btn btn-dark wl-all" data-add-all' + (inStock.length ? "" : " disabled") + ">Add all to cart</button>" : "";
    host.classList.toggle("account-panel-flush", list.length > 0);
    document.getElementById("wl-count").textContent = list.length ? list.length + (list.length === 1 ? " item" : " items") : "";
    if (!list.length) {
      host.innerHTML = '<div class="account-empty">' + M.emptyHeart() +
        '<p class="account-empty-title">Your wishlist is empty</p>' +
        "<p>Tap the heart on any product to save it here for later.</p>" +
        '<a class="btn btn-primary" href="index.html#shop">Start shopping</a></div>';
      return;
    }
    var total = list.reduce(function (n, p) { return n + p.price; }, 0);
    host.innerHTML = '<div class="wl-list">' + list.map(row).join("") + "</div>" +
      '<div class="wl-summary"><p><b>' + list.length + (list.length === 1 ? " item" : " items") + "</b> · " + money(total) + " total</p>" +
      (isShared ? '<button type="button" class="btn btn-ghost" data-save-all>Save all to my wishlist</button>' :
        '<a class="btn btn-ghost" href="index.html#shop">Continue shopping</a>') + "</div>";
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-wl-remove],[data-add-all],[data-save-all],#wl-share");
    if (!t) return;
    if (t.hasAttribute("data-wl-remove")) {
      var p = M.byId(t.getAttribute("data-wl-remove"));
      M.wish.toggle(p.id);
      M.toast("<b>" + esc(p.name) + "</b> removed from your wishlist.");
    } else if (t.hasAttribute("data-add-all")) {
      var added = 0, sized = 0;
      products().forEach(function (p) {
        if (p.stock < 1 || M.cart.qty(p.id) > 0) return;
        if (M.sizesOf(p).length) { sized++; return; } // needs a size chosen on its page
        if (M.cart.add(p.id, 1)) added++;
      });
      var more = sized ? " Choose a size for " + (sized === 1 ? "the clothing item" : "the " + sized + " clothing and shoe items") + " on " + (sized === 1 ? "its page." : "their pages.") : "";
      M.toast(added ? added + (added === 1 ? " item" : " items") + " added to your cart." + more + ' <button type="button" class="toast-link" data-open-cart>View cart</button>' :
        sized ? more.trim() : "Everything here is already in your cart.");
    } else if (t.hasAttribute("data-save-all")) {
      shared.forEach(function (id) { if (!M.wish.has(id)) M.wish.toggle(id); });
      M.toast('Saved to your wishlist. <a class="toast-link" href="wishlist.html">View wishlist</a>');
    } else if (t.id === "wl-share") {
      var url = location.origin + location.pathname + "?shared=" + M.wish.all().join(",");
      if (navigator.share) {
        navigator.share({ title: "My Mabs wishlist", url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { M.toast("Link to your wishlist copied."); }, function () { M.toast("Couldn’t copy the link: " + esc(url)); });
      } else {
        M.toast("Share this link: " + esc(url));
      }
    }
  });
  document.addEventListener("wish:change", function () { if (!isShared) render(); });
  render();
})();
