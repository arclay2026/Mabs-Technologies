/* =====================================================================
   MABS TECHNOLOGIES — PRODUCT PAGE (product.html?id=…)
   Gallery and product details on the left, the buy box on the right,
   then description, specifications and related products.
   Delivery, returns and warranty wording comes from MABS.store.service.
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
  var svc = M.store.service || {};
  var saving = p.was && p.was > p.price ? p.was - p.price : 0;
  var inStock = p.stock > 0;
  var wished = M.wish.has(p.id);
  var href = "product.html?id=" + encodeURIComponent(p.id);
  // photos: `images: [...]` for a gallery, or a single `image`; otherwise the drawing
  var photos = p.images && p.images.length ? p.images : p.image ? [p.image] : [];
  var specValue = function (label) {
    var s = p.specs.filter(function (x) { return x[0].toLowerCase() === label; })[0];
    return s && s[1];
  };
  var ICON_EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  var ICON_RETURN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>';

  /* ---------- delivery estimate: working days, Mon–Fri ---------- */
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function addWorkingDays(from, n) {
    var t = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    while (n > 0) { t.setDate(t.getDate() + 1); if (t.getDay() % 6) n--; }
    return t;
  }
  function day(t) { return DAYS[t.getDay()] + " " + t.getDate() + " " + MONTHS[t.getMonth()]; }
  var span = svc.deliveryDays || [2, 4];
  var start = new Date();
  if (start.getHours() >= 15) start.setDate(start.getDate() + 1); // late orders go out the next day
  var eta = day(addWorkingDays(start, span[0])) + " – " + day(addWorkingDays(start, span[1]));

  /* ---------- pieces ---------- */
  function brandLink() {
    var b = (M.brands || []).filter(function (x) { return x.name === p.brand; })[0];
    var inner = b ? '<img src="' + esc(b.logo.replace("assets/brands/", "assets/brands/dark/")) + '" alt="' + esc(p.brand) + '" style="height:' + Math.round(b.h * 0.75) + 'px">' : esc(p.brand);
    return '<a class="pdp-brand" href="index.html?brand=' + encodeURIComponent(p.brand) + '#shop" title="More from ' + esc(p.brand) + '">' + inner + "</a>";
  }

  function stage(i) {
    return photos.length ? '<img src="' + esc(photos[i]) + '" alt="' + esc(p.name) + (photos.length > 1 ? ", photo " + (i + 1) : "") + '">' : M.art(p.art);
  }

  var gallery =
    '<div class="pdp-gallery' + (photos.length > 1 ? " has-thumbs" : "") + '">' +
      (photos.length > 1 ? '<ul class="pdp-thumbs" aria-label="Photos">' + photos.map(function (src, i) {
        return '<li><button type="button" data-photo="' + i + '"' + (i ? "" : ' aria-current="true"') + ' aria-label="Photo ' + (i + 1) + '">' +
          '<img src="' + esc(src) + '" alt="" loading="lazy"></button></li>';
      }).join("") + "</ul>" : "") +
      '<div class="pdp-stage">' + M.badge(p) +
        '<button type="button" class="pdp-zoom" id="pdp-zoom" aria-label="View larger">' + ICON_EXPAND + "</button>" +
        '<div class="pdp-stage-img" id="pdp-stage">' + stage(0) + "</div>" +
      "</div>" +
    "</div>";

  var keyline = p.specs.slice(0, 5).map(function (s) { return "<li>" + esc(s[1]) + "</li>"; }).join("");

  var perks =
    '<ul class="pdp-perks">' +
      (inStock ? "<li>" + M.icon.truck + "<span><b>Courier delivery</b>Arrives " + eta + ". " +
        (p.price >= d.freeOver ? "Free for this item." : money(d.courierFee) + ", free on orders over " + money(d.freeOver) + ".") + "</span></li>" : "") +
      (d.collect ? "<li>" + M.icon.store + "<span><b>Free in-store collection</b>" + esc(svc.collectNote || "") + "</span></li>" : "") +
      "<li>" + M.icon.shield + "<span><b>Warranty</b>" + esc(specValue("warranty") || svc.warranty || "Manufacturer's warranty") + "</span></li>" +
      (svc.returns ? "<li>" + ICON_RETURN + "<span><b>Returns</b>" + esc(svc.returns) + "</span></li>" : "") +
    "</ul>";

  var buy =
    '<section class="pdp-panel pdp-buy" aria-label="Price and buying options">' +
      '<p class="pdp-price">' + M.priceHtml(p) + "</p>" +
      (saving ? '<p class="pdp-save">You save ' + money(saving) + " (" + Math.round(saving / p.was * 100) + "%)</p>" : "") +
      '<p class="fine">Price includes VAT.</p>' +
      (inStock ? '<p class="pdp-eta">' + ICON_CAL + "<span>Delivery <b>" + eta + "</b></span></p>" : "") +
      '<p class="pdp-free">' + (p.price >= d.freeOver ? "Free delivery <span>on this item</span>" : "Free delivery <span>on orders over " + money(d.freeOver) + "</span>") + "</p>" +
      '<div class="pdp-stock">' + M.stockNote(p) + "</div>" +
      (inStock ?
        '<div class="pdp-actions">' +
          '<div class="pdp-cart-row">' +
            '<div class="stepper" role="group" aria-label="Quantity">' +
              '<button type="button" data-pqty="-1" aria-label="Decrease quantity">' + M.icon.minus + "</button>" +
              '<input id="pdp-qty" type="number" min="1" max="' + p.stock + '" value="1" inputmode="numeric" aria-label="Quantity">' +
              '<button type="button" data-pqty="1" aria-label="Increase quantity">' + M.icon.plus + "</button>" +
            "</div>" +
            '<button type="button" class="btn btn-primary btn-lg" data-add="' + esc(p.id) + '" data-qty-from="#pdp-qty">' + M.icon.cart + "Add to cart</button>" +
          "</div>" +
          '<button type="button" class="btn btn-dark btn-lg" id="buy-now">Buy now</button>' +
        "</div>" :
        '<div class="pdp-actions"><button type="button" class="btn btn-primary btn-lg" disabled>Sold out</button></div>') +
      '<button type="button" class="btn btn-soft btn-lg wish-btn' + (wished ? " is-on" : "") + '" data-wish="' + esc(p.id) + '" aria-pressed="' + wished + '">' +
        M.icon.heart + "<span>" + (wished ? "Saved to wishlist" : "Add to wishlist") + "</span></button>" +
    "</section>" +
    '<section class="pdp-panel pdp-seller">' +
      "<p>Sold and shipped by <b>" + esc(M.store.name) + "</b></p>" +
      '<ul class="pdp-pay" aria-label="Ways to pay">' +
        "<li>" + M.icon.card + "EFT / bank transfer</li>" +
        "<li>" + M.icon.card + "Card or cash on delivery" + (d.collect ? " or collection" : "") + "</li>" +
      "</ul>" +
    "</section>";

  var specRows = p.specs.concat([["Brand", p.brand], ["Type", p.type], ["Department", M.catName(p.category)]]);
  var about =
    '<section class="pdp-panel pdp-about" aria-labelledby="desc-title">' +
      '<h2 id="desc-title">Description</h2>' +
      '<p class="pdp-desc">' + esc(p.summary) + "</p>" +
      '<h2 id="specs-title">Specifications</h2>' +
      '<dl class="pdp-specs" aria-labelledby="specs-title">' + specRows.map(function (s) {
        return "<div><dt>" + esc(s[0]) + "</dt><dd>" + esc(s[1]) + "</dd></div>";
      }).join("") + "</dl>" +
    "</section>";

  host.innerHTML =
    '<div class="pdp-top">' +
      '<nav class="crumbs" aria-label="Breadcrumb"><ol>' +
        '<li><a href="index.html">Home</a></li>' +
        '<li><a href="index.html?cat=' + p.category + '#shop">' + esc(M.catName(p.category)) + "</a></li>" +
        '<li><a href="index.html?cat=' + p.category + "&type=" + encodeURIComponent(p.type) + '#shop">' + esc(M.plural(p.type)) + "</a></li>" +
        '<li aria-current="page">' + esc(p.name) + "</li>" +
      "</ol></nav>" +
      '<button type="button" class="link-btn pdp-share" id="pdp-share">' + M.icon.share + "Share</button>" +
    "</div>" +
    '<div class="pdp">' +
      '<section class="pdp-panel pdp-hero">' + gallery +
        '<div class="pdp-info">' + brandLink() +
          "<h1>" + esc(p.name) + "</h1>" +
          (keyline ? '<ul class="pdp-keyline" aria-label="Key specs">' + keyline + "</ul>" : "") +
          perks +
        "</div>" +
      "</section>" +
      '<aside class="pdp-side">' + buy + "</aside>" +
      about +
    "</div>";

  // structured data, so search engines can show price and stock
  var ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.summary,
    brand: { "@type": "Brand", name: p.brand }, sku: p.id, image: photos.length ? photos.map(function (x) { return new URL(x, location.href).href; }) : undefined,
    offers: { "@type": "Offer", priceCurrency: "ZAR", price: p.price, url: new URL(href, location.href).href,
      availability: "https://schema.org/" + (inStock ? "InStock" : "OutOfStock") }
  }).replace(/</g, "\\u003c");
  document.head.appendChild(ld);

  /* ---------- gallery & larger view ---------- */
  var current = 0;
  function show(i) {
    current = (i + photos.length) % photos.length;
    document.getElementById("pdp-stage").innerHTML = stage(current);
    host.querySelectorAll("[data-photo]").forEach(function (b) {
      if (+b.getAttribute("data-photo") === current) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
  }

  var box, lastFocus;
  function openViewer() {
    lastFocus = document.activeElement;
    box = document.createElement("div");
    box.className = "viewer";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", p.name);
    box.innerHTML =
      '<div class="viewer-img">' + stage(current) + "</div>" +
      '<button type="button" class="viewer-close" aria-label="Close">' + M.icon.close + "</button>" +
      (photos.length > 1 ? '<button type="button" class="viewer-nav viewer-prev" data-step="-1" aria-label="Previous photo">' + M.icon.chevron + "</button>" +
        '<button type="button" class="viewer-nav viewer-next" data-step="1" aria-label="Next photo">' + M.icon.chevron + "</button>" : "");
    document.body.appendChild(box);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { box.classList.add("is-open"); });
    box.querySelector(".viewer-close").focus();
    box.addEventListener("click", function (e) {
      var nav = e.target.closest("[data-step]");
      if (nav) { show(current + +nav.getAttribute("data-step")); box.querySelector(".viewer-img").innerHTML = stage(current); return; }
      if (e.target.closest(".viewer-close") || e.target === box) closeViewer();
    });
  }
  function closeViewer() {
    if (!box) return;
    box.remove(); box = null;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("keydown", function (e) {
    if (!box) return;
    if (e.key === "Escape") closeViewer();
    else if (e.key === "Tab") { e.preventDefault(); box.querySelector(".viewer-close").focus(); }
    else if (photos.length > 1 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      show(current + (e.key === "ArrowLeft" ? -1 : 1)); box.querySelector(".viewer-img").innerHTML = stage(current);
    }
  });
  document.getElementById("pdp-zoom").addEventListener("click", openViewer);
  document.getElementById("pdp-stage").addEventListener("click", openViewer);

  /* ---------- share ---------- */
  document.getElementById("pdp-share").addEventListener("click", function () {
    var url = new URL(href, location.href).href;
    if (navigator.share) { navigator.share({ title: p.name, url: url }).catch(function () { /* closed */ }); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
      M.toast("Link copied. Paste it anywhere to share.");
    }, function () { window.prompt("Copy this link:", url); });
  });

  /* ---------- quantity, thumbnails & buy now ---------- */
  var qty = document.getElementById("pdp-qty");
  function clampQty() {
    var v = Math.max(1, Math.min(parseInt(qty.value, 10) || 1, p.stock));
    qty.value = v;
    return v;
  }
  host.addEventListener("click", function (e) {
    var t = e.target.closest("[data-photo]");
    if (t) { show(+t.getAttribute("data-photo")); return; }
    var b = e.target.closest("[data-pqty]");
    if (b && qty) {
      qty.value = (parseInt(qty.value, 10) || 1) + parseInt(b.getAttribute("data-pqty"), 10);
      clampQty();
    }
  });
  if (qty) {
    qty.addEventListener("change", clampQty);
    document.getElementById("buy-now").addEventListener("click", function () {
      var want = clampQty();
      if (M.cart.qty(p.id) < want) M.cart.set(p.id, want);
      location.href = "checkout.html";
    });
  }

  // the wishlist button carries a text label
  document.addEventListener("wish:change", function () {
    var b = host.querySelector(".wish-btn span");
    if (b) b.textContent = M.wish.has(p.id) ? "Saved to wishlist" : "Add to wishlist";
  });

  /* ---------- related ---------- */
  var related = M.products.filter(function (x) { return x.id !== p.id && x.category === p.category && x.stock > 0; })
    .sort(function (a, b) { return (b.type === p.type) - (a.type === p.type) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price); })
    .slice(0, 6); // one row of the grid
  if (related.length) {
    document.getElementById("related").innerHTML = related.map(M.card).join("");
    document.getElementById("related-section").hidden = false;
  }
})();
