/* =====================================================================
   MABS TECHNOLOGIES — PRODUCT PAGE (product.html?id=…)
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var esc = M.esc, money = M.money;
  var host = document.getElementById("product");
  var p = M.byId(new URLSearchParams(location.search).get("id") || "");

  if (!p) {
    document.title = "Product not found — " + M.store.name;
    host.innerHTML = '<div class="empty empty-page"><p class="empty-title">We couldn’t find that product</p>' +
      "<p>It may have sold out or the link may be wrong.</p>" +
      '<a class="btn btn-primary" href="index.html#shop">Browse all products</a></div>';
    return;
  }

  document.title = p.name + " — " + M.store.name;
  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", p.summary);

  var d = M.store.delivery;
  var saving = p.was && p.was > p.price ? p.was - p.price : 0;
  var inStock = p.stock > 0;
  var wished = M.wish.has(p.id);

  host.innerHTML =
    '<nav class="crumbs" aria-label="Breadcrumb"><ol>' +
      '<li><a href="index.html">Home</a></li>' +
      '<li><a href="index.html?cat=' + p.category + '#shop">' + esc(M.catName(p.category)) + "</a></li>" +
      '<li aria-current="page">' + esc(p.name) + "</li>" +
    "</ol></nav>" +
    '<div class="pdp">' +
      '<div class="pdp-media" style="' + M.tileStyle(p) + '">' + M.badge(p) + M.media(p, true) + "</div>" +
      '<div class="pdp-info">' +
        '<p class="card-brand">' + esc(p.brand) + " · " + esc(p.type) + "</p>" +
        "<h1>" + esc(p.name) + "</h1>" +
        '<p class="pdp-price">' + M.priceHtml(p) + (saving ? ' <span class="save">Save ' + money(saving) + "</span>" : "") + "</p>" +
        '<p class="fine">Price includes VAT.</p>' +
        '<p class="pdp-summary">' + esc(p.summary) + "</p>" +
        '<ul class="key-specs">' + p.specs.slice(0, 4).map(function (s) {
          return "<li><span>" + esc(s[0]) + "</span><b>" + esc(s[1]) + "</b></li>";
        }).join("") + "</ul>" +
        M.stockNote(p) +
        (inStock ?
          '<div class="buy-row">' +
            '<div class="stepper" role="group" aria-label="Quantity">' +
              '<button type="button" data-pqty="-1" aria-label="Decrease quantity">' + M.icon.minus + "</button>" +
              '<input id="pdp-qty" type="number" min="1" max="' + p.stock + '" value="1" inputmode="numeric" aria-label="Quantity">' +
              '<button type="button" data-pqty="1" aria-label="Increase quantity">' + M.icon.plus + "</button>" +
            "</div>" +
            '<button type="button" class="btn btn-primary btn-lg" data-add="' + esc(p.id) + '" data-qty-from="#pdp-qty">' + M.icon.cart + "Add to cart</button>" +
            '<button type="button" class="btn btn-dark btn-lg" id="buy-now">Buy now</button>' +
          "</div>" :
          '<div class="buy-row"><button type="button" class="btn btn-primary btn-lg" disabled>Sold out</button></div>') +
        '<button type="button" class="link-btn wish-inline' + (wished ? " is-on" : "") + '" data-wish="' + esc(p.id) + '" aria-pressed="' + wished + '">' +
          M.icon.heart + '<span>' + (wished ? "Saved to wishlist" : "Save to wishlist") + "</span></button>" +
        '<ul class="pdp-perks">' +
          "<li>" + M.icon.truck + "<span><b>Courier delivery</b> " + money(d.courierFee) + ", free on orders over " + money(d.freeOver) + "</span></li>" +
          (d.collect ? "<li>" + M.icon.store + "<span><b>Collect in store</b> Free — we'll let you know when it's ready</span></li>" : "") +
        "</ul>" +
      "</div>" +
    "</div>" +
    '<section class="specs" aria-labelledby="specs-title"><h2 id="specs-title">Specifications</h2>' +
      "<table><tbody>" + p.specs.map(function (s) {
        return '<tr><th scope="row">' + esc(s[0]) + "</th><td>" + esc(s[1]) + "</td></tr>";
      }).join("") +
      '<tr><th scope="row">Brand</th><td>' + esc(p.brand) + "</td></tr>" +
      "</tbody></table></section>";

  /* ---------- quantity & buy now ---------- */
  var qty = document.getElementById("pdp-qty");
  function clampQty() {
    var v = Math.max(1, Math.min(parseInt(qty.value, 10) || 1, p.stock));
    qty.value = v;
    return v;
  }
  if (qty) {
    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pqty]"); if (!b) return;
      qty.value = (parseInt(qty.value, 10) || 1) + parseInt(b.getAttribute("data-pqty"), 10);
      clampQty();
    });
    qty.addEventListener("change", clampQty);
    document.getElementById("buy-now").addEventListener("click", function () {
      var want = clampQty();
      if (M.cart.qty(p.id) < want) M.cart.set(p.id, want);
      location.href = "checkout.html";
    });
  }

  // the inline wishlist button carries a text label
  document.addEventListener("wish:change", function () {
    var b = host.querySelector(".wish-inline span");
    if (b) b.textContent = M.wish.has(p.id) ? "Saved to wishlist" : "Save to wishlist";
  });

  /* ---------- related ---------- */
  var related = M.products.filter(function (x) { return x.id !== p.id && x.category === p.category && x.stock > 0; })
    .sort(function (a, b) { return (b.type === p.type) - (a.type === p.type) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price); })
    .slice(0, 8);
  if (related.length) {
    document.getElementById("related").innerHTML = related.map(M.card).join("");
    document.getElementById("related-section").hidden = false;
  }
})();
