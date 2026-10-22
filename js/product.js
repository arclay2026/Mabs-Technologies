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

  // up to 4 thumbnails; with more photos the 4th is a blurred "+N" tile that opens the larger view
  var THUMBS = 4;
  function thumbs(cls, limit) {
    if (photos.length < 2) return "";
    var shown = photos.length > limit ? limit - 1 : photos.length;
    var html = photos.slice(0, shown).map(function (src, i) {
      return '<li><button type="button" data-photo="' + i + '"' + (i ? "" : ' aria-current="true"') + ' aria-label="Photo ' + (i + 1) + " of " + photos.length + '">' +
        '<img src="' + esc(src) + '" alt="" loading="lazy"></button></li>';
    }).join("");
    if (shown < photos.length) {
      html += '<li><button type="button" class="thumb-more" data-more="' + shown + '" aria-label="See all ' + photos.length + ' photos">' +
        '<img src="' + esc(photos[shown]) + '" alt="" loading="lazy"><span>+' + (photos.length - shown) + "</span></button></li>";
    }
    return '<ul class="' + cls + '" aria-label="Photos">' + html + "</ul>";
  }

  var gallery =
    '<div class="pdp-gallery' + (photos.length > 1 ? " has-thumbs" : "") + '">' +
      thumbs("pdp-thumbs", THUMBS) +
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
              '<input id="pdp-qty" type="number" min="1" max="' + M.maxQty(p) + '" value="1" inputmode="numeric" aria-label="Quantity">' +
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

  var canReview = !!(M.api && M.api.source === "server"); // reviews live on the shop's server
  function ratingLine() {
    var r = p.rating;
    if (r && r.count) {
      return '<a class="pdp-rating" href="#reviews">' + M.stars(r.avg, "Rated " + r.avg + " out of 5") +
        "<b>" + r.avg.toFixed(1) + "</b><span>" + r.count + " review" + (r.count === 1 ? "" : "s") + "</span></a>";
    }
    return canReview ? '<p class="pdp-rating is-empty">Be the first to <a href="#reviews" data-write-review>write a review</a></p>' : "";
  }

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
          ratingLine() +
          (keyline ? '<ul class="pdp-keyline" aria-label="Key specs">' + keyline + "</ul>" : "") +
          perks +
        "</div>" +
      "</section>" +
      '<aside class="pdp-side">' + buy + "</aside>" +
      about +
      '<section class="pdp-panel pdp-reviews" id="reviews" aria-labelledby="reviews-title"></section>' +
    "</div>";

  // structured data, so search engines can show price and stock
  var ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.summary,
    brand: { "@type": "Brand", name: p.brand }, sku: p.id, image: photos.length ? photos.map(function (x) { return new URL(x, location.href).href; }) : undefined,
    aggregateRating: p.rating && p.rating.count ? { "@type": "AggregateRating", ratingValue: p.rating.avg, reviewCount: p.rating.count } : undefined,
    offers: { "@type": "Offer", priceCurrency: "ZAR", price: p.price, url: new URL(href, location.href).href,
      availability: "https://schema.org/" + (inStock ? "InStock" : "OutOfStock") }
  }).replace(/</g, "\\u003c");
  document.head.appendChild(ld);

  /* ---------- gallery & larger view ---------- */
  var current = 0, box, lastFocus;
  function mark(scope) {
    scope.querySelectorAll("[data-photo]").forEach(function (b) {
      if (+b.getAttribute("data-photo") === current) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
    // a photo behind the "+N" tile lights that tile up instead
    var more = scope.querySelector("[data-more]");
    if (more) more.classList.toggle("is-current", current >= +more.getAttribute("data-more"));
  }
  function show(i) {
    if (!photos.length) return;
    current = (i + photos.length) % photos.length;
    document.getElementById("pdp-stage").innerHTML = stage(current);
    mark(host);
    if (box) {
      box.querySelector(".viewer-img").innerHTML = stage(current);
      box.querySelector(".viewer-count").textContent = (current + 1) + " / " + photos.length;
      mark(box);
      var on = box.querySelector('[data-photo="' + current + '"]');
      if (on) on.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function openViewer(at) {
    if (typeof at === "number") show(at);
    lastFocus = document.activeElement;
    box = document.createElement("div");
    box.className = "viewer";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", p.name);
    box.innerHTML =
      '<div class="viewer-head"><p class="viewer-title">' + esc(p.name) + "</p>" +
        '<span class="viewer-count">' + (photos.length > 1 ? (current + 1) + " / " + photos.length : "") + "</span>" +
        '<button type="button" class="viewer-close" aria-label="Close">' + M.icon.close + "</button></div>" +
      '<div class="viewer-body"><div class="viewer-img">' + stage(current) + "</div>" +
      (photos.length > 1 ? '<button type="button" class="viewer-nav viewer-prev" data-step="-1" aria-label="Previous photo">' + M.icon.chevron + "</button>" +
        '<button type="button" class="viewer-nav viewer-next" data-step="1" aria-label="Next photo">' + M.icon.chevron + "</button>" : "") +
      "</div>" +
      thumbs("viewer-thumbs", Infinity); // every photo in the larger view
    document.body.appendChild(box);
    document.body.style.overflow = "hidden";
    mark(box);
    requestAnimationFrame(function () { box.classList.add("is-open"); });
    box.querySelector(".viewer-close").focus();
    box.addEventListener("click", function (e) {
      var nav = e.target.closest("[data-step]");
      if (nav) { show(current + +nav.getAttribute("data-step")); return; }
      var t = e.target.closest("[data-photo]");
      if (t) { show(+t.getAttribute("data-photo")); return; }
      if (e.target.closest(".viewer-close") || e.target.classList.contains("viewer-body")) closeViewer();
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
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") show(current + (e.key === "ArrowLeft" ? -1 : 1));
    else if (e.key === "Tab") { // keep focus inside the larger view
      var f = Array.prototype.slice.call(box.querySelectorAll("button"));
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  // swipe between photos on touch screens
  var touchX = null;
  document.addEventListener("touchstart", function (e) { touchX = e.target.closest(".viewer-body, .pdp-stage") ? e.touches[0].clientX : null; }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (touchX === null || photos.length < 2) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });
  document.getElementById("pdp-zoom").addEventListener("click", function () { openViewer(); });
  document.getElementById("pdp-stage").addEventListener("click", function () { openViewer(); });

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
    var v = Math.max(1, Math.min(parseInt(qty.value, 10) || 1, M.maxQty(p)));
    qty.value = v;
    return v;
  }
  host.addEventListener("click", function (e) {
    var t = e.target.closest("[data-photo]");
    if (t) { show(+t.getAttribute("data-photo")); return; }
    var more = e.target.closest("[data-more]");
    if (more) { openViewer(+more.getAttribute("data-more")); return; }
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

  /* ---------- reviews ---------- */
  var RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
  var rv = { el: document.getElementById("reviews"), sort: "newest", page: 1, data: null, list: [] };

  function reviewDate(iso) {
    var t = new Date(iso);
    return t.getDate() + " " + MONTHS[t.getMonth()] + " " + t.getFullYear();
  }

  function reviewHtml(r) {
    return '<li class="review">' +
      '<div class="review-top">' + M.stars(r.rating) + (r.title ? "<b>" + esc(r.title) + "</b>" : "") + "</div>" +
      '<p class="review-meta">' + esc(r.name) + " · " + reviewDate(r.date) +
        (r.verified ? ' · <span class="review-verified">' + M.icon.check + "Verified buyer</span>" : "") + "</p>" +
      '<p class="review-body">' + esc(r.body) + "</p>" +
      (r.reply ? '<div class="review-reply"><b>Reply from ' + esc(M.store.name) + "</b><p>" + esc(r.reply) + "</p></div>" : "") +
    "</li>";
  }

  function formHtml() {
    var picker = "";
    for (var n = 5; n >= 1; n--) { // reversed so CSS can light up the stars before the hovered one
      picker += '<input type="radio" name="rating" value="' + n + '" id="rate-' + n + '" required>' +
        '<label for="rate-' + n + '" title="' + RATING_WORDS[n] + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>' +
        '<span class="sr-only">' + n + " star" + (n > 1 ? "s" : "") + ", " + RATING_WORDS[n] + "</span></label>";
    }
    return '<form class="review-form" id="review-form" novalidate hidden>' +
      '<h3>Write a review</h3>' +
      '<fieldset class="rate"><legend>Your rating</legend><div class="rate-stars">' + picker + '</div><span class="rate-word" id="rate-word">Choose 1 to 5 stars</span></fieldset>' +
      '<div class="field"><label for="rv-title">Headline <span class="opt">(optional)</span></label><input id="rv-title" name="title" maxlength="120" placeholder="Sum it up in a few words"></div>' +
      '<div class="field"><label for="rv-body">Your review</label><textarea id="rv-body" name="body" rows="5" maxlength="3000" required minlength="10" placeholder="What did you like or dislike? How are you using it?"></textarea></div>' +
      '<div class="review-form-row">' +
        '<div class="field"><label for="rv-name">Name</label><input id="rv-name" name="name" maxlength="80" required autocomplete="given-name" placeholder="e.g. Thabo M."><span class="hint">Shown with your review</span></div>' +
        '<div class="field"><label for="rv-email">Email</label><input id="rv-email" name="email" type="email" maxlength="190" required autocomplete="email"><span class="hint">Never shown</span></div>' +
      "</div>" +
      '<div class="field"><label for="rv-order">Order number <span class="opt">(optional)</span></label><input id="rv-order" name="order" maxlength="20" placeholder="e.g. MB261022-4821" autocomplete="off"><span class="hint">Bought it here? Add your order number and the email you ordered with, and your review is marked Verified buyer.</span></div>' +
      '<div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="form-alert" id="review-alert" role="alert" tabindex="-1" hidden></p>' +
      '<div class="review-form-actions"><button type="submit" class="btn btn-primary">Submit review</button><button type="button" class="btn btn-ghost" data-cancel-review>Cancel</button></div>' +
      '<p class="fine">Reviews are checked before they appear, usually within a working day.</p>' +
    "</form>";
  }

  function renderReviews() {
    var d = rv.data || { summary: { avg: 0, count: 0, dist: {} } };
    var sum = d.summary, total = sum.count;
    var bars = [5, 4, 3, 2, 1].map(function (n) {
      var c = sum.dist[n] || 0, pct = total ? Math.round(c / total * 100) : 0;
      return '<li><span>' + n + ' star</span><span class="rv-bar"><span style="width:' + pct + '%"></span></span><span>' + c + "</span></li>";
    }).join("");
    rv.el.innerHTML =
      '<div class="reviews-head"><h2 id="reviews-title">Customer reviews</h2>' +
        (total > 1 ? '<label class="reviews-sort">Sort <select id="review-sort">' +
          '<option value="newest">Newest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label>' : "") +
      "</div>" +
      '<div class="reviews-layout">' +
        '<div class="reviews-summary">' +
          (total ?
            '<p class="reviews-avg"><b>' + sum.avg.toFixed(1) + "</b>" + M.stars(sum.avg, "Rated " + sum.avg + " out of 5") + "</p>" +
            '<p class="reviews-count">Based on ' + total + " review" + (total === 1 ? "" : "s") + "</p>" +
            '<ul class="reviews-bars" aria-label="Ratings breakdown">' + bars + "</ul>" :
            '<p class="reviews-none"><b>No reviews yet</b>' + (canReview ? "Bought this? Tell other shoppers what you think." : "Reviews open once the shop is live.") + "</p>") +
          (canReview ? '<button type="button" class="btn btn-ghost btn-block" data-write-review>Write a review</button>' : "") +
        "</div>" +
        '<div class="reviews-main">' + (canReview ? formHtml() : "") +
          '<p class="review-thanks" id="review-thanks" role="status" hidden></p>' +
          (rv.list.length ? '<ul class="review-list">' + rv.list.map(reviewHtml).join("") + "</ul>" : "") +
          (d.more ? '<button type="button" class="btn btn-ghost" id="review-more">Show more reviews</button>' : "") +
        "</div>" +
      "</div>";
    var sortEl = document.getElementById("review-sort");
    if (sortEl) sortEl.value = rv.sort;
  }

  function loadReviews(reset) {
    if (reset) { rv.page = 1; rv.list = []; }
    return M.api.request("reviews.php?product=" + encodeURIComponent(p.id) + "&sort=" + rv.sort + "&page=" + rv.page).then(function (d) {
      rv.data = d;
      rv.list = rv.list.concat(d.reviews || []);
      renderReviews();
    }, function () { renderReviews(); });
  }

  function openForm() {
    var f = document.getElementById("review-form");
    if (!f) return;
    f.hidden = false;
    document.getElementById("review-thanks").hidden = true;
    rv.el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () { f.querySelector('input[name="rating"]').focus({ preventScroll: true }); }, 300);
  }

  function reviewError(err) {
    var code = err && err.code;
    if (code === "BAD_RATING") return "Please choose a star rating.";
    if (code === "SHORT_REVIEW") return "Please write a little more — at least a sentence.";
    if (code === "MISSING_DETAILS") return "Please add your name and a valid email address.";
    if (code === "ALREADY_REVIEWED") return "You've already reviewed this product. Thank you!";
    if (code === "TOO_MANY_REVIEWS") return "You've written several reviews recently. Please try again a little later.";
    return "We couldn’t send your review just now. Please check your connection and try again.";
  }

  rv.el.addEventListener("change", function (e) {
    if (e.target.id === "review-sort") { rv.sort = e.target.value; loadReviews(true); }
    if (e.target.name === "rating") document.getElementById("rate-word").textContent = e.target.value + " out of 5 — " + RATING_WORDS[e.target.value];
  });
  rv.el.addEventListener("click", function (e) {
    if (e.target.closest("#review-more")) { rv.page++; loadReviews(false); }
    if (e.target.closest("[data-cancel-review]")) { document.getElementById("review-form").hidden = true; }
  });
  host.addEventListener("click", function (e) {
    if (e.target.closest("[data-write-review]")) { e.preventDefault(); openForm(); }
  });
  rv.el.addEventListener("submit", function (e) {
    if (e.target.id !== "review-form") return;
    e.preventDefault();
    var f = e.target, el = f.elements, alertEl = document.getElementById("review-alert"), btn = f.querySelector('[type="submit"]');
    var rating = f.querySelector('input[name="rating"]:checked');
    var problem = !rating ? "Please choose a star rating." :
      el.body.value.trim().length < 10 ? "Please write a little more — at least a sentence." :
      !el.name.value.trim() || !el.email.checkValidity() || !el.email.value ? "Please add your name and a valid email address." : "";
    if (problem) { alertEl.textContent = problem; alertEl.hidden = false; alertEl.focus(); return; }
    alertEl.hidden = true;
    btn.disabled = true; btn.textContent = "Sending…";
    M.api.request("reviews.php", { method: "POST", body: {
      product: p.id, rating: +rating.value, title: el.title.value.trim(), body: el.body.value.trim(),
      name: el.name.value.trim(), email: el.email.value.trim(), order: el.order.value.trim(), website: el.website.value
    } }).then(function (res) {
      f.reset(); f.hidden = true;
      var thanks = document.getElementById("review-thanks");
      thanks.innerHTML = M.icon.check + "<span><b>Thank you for your review!</b> It will appear here once we've checked it.</span>";
      thanks.hidden = false;
      btn.disabled = false; btn.textContent = "Submit review";
    }, function (err) {
      btn.disabled = false; btn.textContent = "Submit review";
      alertEl.textContent = reviewError(err); alertEl.hidden = false; alertEl.focus();
    });
  });

  renderReviews();
  if (canReview) loadReviews(true);

  /* ---------- related ---------- */
  var related = M.products.filter(function (x) { return x.id !== p.id && x.category === p.category && x.stock > 0; })
    .sort(function (a, b) { return (b.type === p.type) - (a.type === p.type) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price); })
    .slice(0, 6); // one row of the grid
  if (related.length) {
    document.getElementById("related").innerHTML = related.map(M.card).join("");
    document.getElementById("related-section").hidden = false;
  }
})();
