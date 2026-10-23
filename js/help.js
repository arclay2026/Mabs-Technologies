/* =====================================================================
   MABS TECHNOLOGIES — HELP CENTRE (help.html)
   Fees and policy wording come from MABS.store (js/catalog.js, or the
   backend's delivery settings), so this page always matches checkout.
   ===================================================================== */
(function () {
  "use strict";
  var M = window.MABS;
  var esc = M.esc, money = M.money;
  var s = M.store, d = s.delivery, svc = s.service || {};
  var days = svc.deliveryDays || [2, 4];
  var I = M.icon;
  var RETURN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>';

  var contact = [];
  if (s.phone) contact.push("<li><b>Phone</b><a href=\"tel:" + esc(s.phone.replace(/\s/g, "")) + "\">" + esc(s.phone) + "</a></li>");
  if (s.whatsapp) contact.push("<li><b>WhatsApp</b><a href=\"https://wa.me/" + esc(s.whatsapp) + "\" target=\"_blank\" rel=\"noopener\">Chat with us</a></li>");
  if (s.email) contact.push("<li><b>Email</b><a href=\"mailto:" + esc(s.email) + "\">" + esc(s.email) + "</a></li>");
  if (s.address) contact.push("<li><b>Store</b><span>" + esc(s.address) + "</span></li>");
  if (s.hours) contact.push("<li><b>Hours</b><span>" + esc(s.hours) + "</span></li>");

  var topics = [
    { id: "delivery", icon: I.truck, title: "Delivery", body:
      "<p>We deliver by courier to any address in South Africa.</p>" +
      '<dl class="help-facts"><div><dt>Courier fee</dt><dd>' + money(d.courierFee) + " per order</dd></div>" +
      "<div><dt>Free delivery</dt><dd>On orders of " + money(d.freeOver) + " or more</dd></div>" +
      "<div><dt>Delivery time</dt><dd>Usually " + days[0] + "–" + days[1] + " working days</dd></div></dl>" +
      "<p>Orders placed after 15:00, or on a weekend or public holiday, go out the next working day. We'll contact you to confirm stock before anything is sent, and you'll be told if an item is delayed.</p>" },
    d.collect && { id: "collection", icon: I.store, title: "Collect in store", body:
      "<p>Choose <b>Collect in store</b> at checkout. Collection is always free.</p>" +
      "<p>" + esc(svc.collectNote || "We'll let you know when your order is ready.") + " Bring your order number (it starts with MB) and the ID of the person named on the order.</p>" +
      (s.address ? "<p><b>Where:</b> " + esc(s.address) + (s.hours ? "<br><b>When:</b> " + esc(s.hours) : "") + "</p>" : "") },
    { id: "payment", icon: I.card, title: "Payment options", body:
      '<dl class="help-facts"><div><dt>EFT / bank transfer</dt><dd>We send our banking details with your order confirmation. Use your order number as the payment reference.</dd></div>' +
      "<div><dt>Pay on delivery" + (d.collect ? " or collection" : "") + "</dt><dd>Pay by card or cash when you receive your order.</dd></div></dl>" +
      "<p>All prices are in rand and include VAT. Your order is confirmed once we've checked stock with you; EFT orders are sent once the payment reflects.</p>" },
    { id: "returns", icon: RETURN, title: "Returns", body:
      "<p>" + esc(svc.returns || "Return unused items in their original packaging within 7 days.") + "</p>" +
      "<p>If an item is faulty, the Consumer Protection Act lets you return it within six months for a repair, replacement or refund. Contact us first so we can arrange the return, and keep your order number handy.</p>" },
    { id: "warranty", icon: I.shield, title: "Warranty", body:
      "<p>Every product is new and genuine. Electronics, appliances and tools come with the " + esc((svc.warranty || "manufacturer's warranty").replace(/^Manufacturer/, "manufacturer")) + ". Where a product lists its own warranty period, that applies.</p>" +
      "<p>Your order number is your proof of purchase. For a warranty claim, contact us and we'll help you through the supplier's process.</p>" },
    { id: "orders", icon: I.box, title: "Orders", body:
      "<p>You can see the orders placed on this device under <a href=\"orders.html\">My Account → Orders</a>, with their progress and an <b>Order again</b> button.</p>" +
      "<p>Need to change or cancel an order? Contact us as soon as possible with your order number, before it's sent.</p>" },
    { id: "contact", icon: I.chat, title: "Contact us", body:
      (contact.length ? '<ul class="help-contact">' + contact.join("") + "</ul>" :
        "<p>Our contact details will be listed here soon. Until then, you can place your order online and we'll contact you to confirm it.</p>") }
  ].filter(Boolean);

  document.getElementById("help-nav").innerHTML = "<ul>" + topics.map(function (t) {
    return '<li><a href="#' + t.id + '">' + t.icon + "<span>" + t.title + "</span></a></li>";
  }).join("") + "</ul>";
  document.getElementById("help-body").innerHTML = topics.map(function (t) {
    return '<section class="help-topic" id="' + t.id + '" aria-labelledby="h-' + t.id + '">' +
      '<h2 id="h-' + t.id + '"><span class="help-icon" aria-hidden="true">' + t.icon + "</span>" + t.title + "</h2>" +
      '<div class="help-text">' + t.body + "</div></section>";
  }).join("");

  // highlight the topic being read
  var links = document.querySelectorAll("#help-nav a");
  function mark(id) { links.forEach(function (a) { if (a.hash === "#" + id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }); }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    document.querySelectorAll(".help-topic").forEach(function (el) { io.observe(el); });
  }
  mark((location.hash || "#" + topics[0].id).slice(1));
  // content is drawn after load, so jump to the requested topic now
  // (again once the web font has loaded, since that shifts the layout)
  var target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) {
    target.scrollIntoView();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { target.scrollIntoView(); });
  }
})();
