/* =====================================================================
   MABS TECHNOLOGIES — STORE CONFIG & CATALOGUE
   ---------------------------------------------------------------------
   Everything the shop knows about the business and its stock lives in
   this file. Edit the config to switch on contact details and order
   hand-off, and edit `products` to change what is for sale.
   Prices are in South African rand (ZAR), VAT inclusive.
   ===================================================================== */
(function () {
  "use strict";
  var MABS = window.MABS = window.MABS || {};

  MABS.store = {
    name: "Mabs Technologies",
    tagline: "Computers, phones, accessories & electronics",
    // Fill these in to show them in the footer and to let customers send
    // their order straight to the shop from the confirmation screen.
    email: "",      // e.g. "orders@mabstech.co.za"
    whatsapp: "",   // international format, digits only, e.g. "27821234567"
    phone: "",      // as displayed, e.g. "082 123 4567"
    address: "",    // e.g. "12 Main Road, Johannesburg"
    hours: "",      // e.g. "Mon–Sat 9:00–18:00"
    // shown under "Popular searches" when someone opens the search box;
    // swap for real trending searches once searches are logged in a database
    popularSearches: ["Laptops", "Samsung Galaxy", "iPhone", "Power bank", "Smart TV", "Wireless headphones"],
    delivery: {
      courierFee: 120,   // flat courier fee per order
      freeOver: 1500,    // orders at or above this subtotal ship free
      collect: true      // offer free in-store collection
    }
  };

  // logo strip under the homepage carousel; `h` is the display height in px,
  // set per logo so wide wordmarks and square marks look the same size
  MABS.brands = [
    { name: "Samsung", logo: "assets/brands/samsung.svg", h: 16 },
    { name: "Apple", logo: "assets/brands/apple.svg", h: 30 },
    { name: "Lenovo", logo: "assets/brands/lenovo.svg", h: 21 },
    { name: "HP", logo: "assets/brands/hp.svg", h: 30 },
    { name: "JBL", logo: "assets/brands/jbl.svg", h: 25 },
    { name: "Dell", logo: "assets/brands/dell.svg", h: 30 }
  ];

  MABS.categories = [
    { id: "computers", name: "Computers", blurb: "Laptops, desktops & monitors", art: { kind: "laptop", color: "#2563eb", body: "silver" } },
    { id: "phones", name: "Phones & Tablets", blurb: "Smartphones & tablets", art: { kind: "phone", color: "#7c3aed" } },
    { id: "accessories", name: "Accessories", blurb: "Chargers, audio, storage & more", art: { kind: "headphones", color: "#0d9488" } },
    { id: "electronics", name: "Electronics", blurb: "TVs, speakers, wearables & gaming", art: { kind: "tv", color: "#ea580c" } }
  ];

  // stock: units on hand (0 = sold out). was: previous price, shows a sale badge.
  // art: drawn illustration until real product photos are added —
  // set `image: "assets/products/<file>.jpg"` on a product to use a photo instead.
  MABS.products = [
    /* ---------- computers ---------- */
    {
      id: "lenovo-ideapad-slim-3", name: "Lenovo IdeaPad Slim 3 15\"", brand: "Lenovo", category: "computers", type: "Laptop",
      price: 8999, was: 10499, stock: 14, featured: true,
      art: { kind: "laptop", color: "#2563eb", body: "silver" },
      summary: "A thin, light everyday laptop for study, office work and streaming.",
      specs: [["Processor", "Intel Core i5"], ["Memory", "8 GB RAM"], ["Storage", "512 GB SSD"], ["Display", "15.6\" Full HD"], ["OS", "Windows 11 Home"]]
    },
    {
      id: "hp-250-g10", name: "HP 250 G10 Notebook", brand: "HP", category: "computers", type: "Laptop",
      price: 7499, stock: 20,
      art: { kind: "laptop", color: "#0ea5e9", body: "dark" },
      summary: "Dependable business notebook with a full-size keyboard and plenty of ports.",
      specs: [["Processor", "Intel Core i3"], ["Memory", "8 GB RAM"], ["Storage", "256 GB SSD"], ["Display", "15.6\" Full HD"], ["OS", "Windows 11 Home"]]
    },
    {
      id: "dell-inspiron-14", name: "Dell Inspiron 14", brand: "Dell", category: "computers", type: "Laptop",
      price: 13999, stock: 6,
      art: { kind: "laptop", color: "#4f46e5", body: "silver" },
      summary: "Compact 14-inch performer for multitasking, design work and video calls.",
      specs: [["Processor", "Intel Core i7"], ["Memory", "16 GB RAM"], ["Storage", "512 GB SSD"], ["Display", "14\" FHD+"], ["OS", "Windows 11 Home"]]
    },
    {
      id: "apple-macbook-air-13-m2", name: "Apple MacBook Air 13\" (M2)", brand: "Apple", category: "computers", type: "Laptop",
      price: 18999, was: 20999, stock: 4, featured: true,
      art: { kind: "laptop", color: "#64748b", body: "silver" },
      summary: "Silent, fanless and all-day battery — the go-anywhere Mac.",
      specs: [["Chip", "Apple M2"], ["Memory", "8 GB unified"], ["Storage", "256 GB SSD"], ["Display", "13.6\" Liquid Retina"], ["OS", "macOS"]]
    },
    {
      id: "asus-tuf-gaming-f15", name: "ASUS TUF Gaming F15", brand: "ASUS", category: "computers", type: "Laptop",
      price: 17999, stock: 3, badge: "Gaming",
      art: { kind: "laptop", color: "#dc2626", body: "dark" },
      summary: "Military-grade build with dedicated graphics and a fast 144 Hz screen.",
      specs: [["Processor", "Intel Core i5"], ["Graphics", "NVIDIA GeForce RTX 3050"], ["Memory", "16 GB RAM"], ["Storage", "512 GB SSD"], ["Display", "15.6\" FHD 144 Hz"]]
    },
    {
      id: "hp-pro-tower-290", name: "HP Pro Tower 290 Desktop", brand: "HP", category: "computers", type: "Desktop",
      price: 9999, stock: 5,
      art: { kind: "desktop", color: "#0284c7", body: "dark" },
      summary: "Space-saving office tower, ready for a monitor, keyboard and mouse.",
      specs: [["Processor", "Intel Core i5"], ["Memory", "8 GB RAM"], ["Storage", "512 GB SSD"], ["Connectivity", "Wi-Fi, Bluetooth, Gigabit LAN"], ["OS", "Windows 11 Pro"]]
    },
    {
      id: "samsung-24-fhd-monitor", name: "Samsung 24\" FHD Monitor", brand: "Samsung", category: "computers", type: "Monitor",
      price: 2299, was: 2699, stock: 18,
      art: { kind: "monitor", color: "#0ea5e9", body: "dark" },
      summary: "Borderless Full HD IPS panel — a great second screen for home or office.",
      specs: [["Size", "24\""], ["Resolution", "1920 × 1080"], ["Panel", "IPS"], ["Refresh rate", "75 Hz"], ["Inputs", "HDMI, VGA"]]
    },
    {
      id: "lg-27-ultragear", name: "LG 27\" UltraGear Gaming Monitor", brand: "LG", category: "computers", type: "Monitor",
      price: 4999, stock: 7,
      art: { kind: "monitor", color: "#e11d48", body: "dark" },
      summary: "Fast refresh and low response time for smooth, competitive gaming.",
      specs: [["Size", "27\""], ["Resolution", "2560 × 1440"], ["Panel", "IPS"], ["Refresh rate", "165 Hz"], ["Inputs", "HDMI, DisplayPort"]]
    },

    /* ---------- phones & tablets ---------- */
    {
      id: "samsung-galaxy-a55", name: "Samsung Galaxy A55 5G 128GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 8499, was: 9499, stock: 22, featured: true,
      art: { kind: "phone", color: "#6366f1", body: "silver" },
      summary: "Premium-feel mid-ranger with a bright AMOLED display and great cameras.",
      specs: [["Storage", "128 GB"], ["Display", "6.6\" Super AMOLED"], ["Network", "5G, dual SIM"], ["Main camera", "50 MP"], ["Battery", "5000 mAh"]]
    },
    {
      id: "samsung-galaxy-s24", name: "Samsung Galaxy S24 256GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 18999, stock: 6, badge: "New",
      art: { kind: "phone", color: "#a855f7", body: "dark" },
      summary: "Compact flagship with Galaxy AI features and a pro-grade camera system.",
      specs: [["Storage", "256 GB"], ["Display", "6.2\" Dynamic AMOLED 2X"], ["Network", "5G"], ["Main camera", "50 MP"], ["Battery", "4000 mAh"]]
    },
    {
      id: "apple-iphone-15", name: "Apple iPhone 15 128GB", brand: "Apple", category: "phones", type: "Smartphone",
      price: 17999, stock: 8, featured: true,
      art: { kind: "phone", color: "#ec4899", body: "light" },
      summary: "Dynamic Island, a 48 MP main camera and USB-C charging.",
      specs: [["Storage", "128 GB"], ["Display", "6.1\" Super Retina XDR"], ["Network", "5G"], ["Main camera", "48 MP"], ["Port", "USB-C"]]
    },
    {
      id: "xiaomi-redmi-note-13", name: "Xiaomi Redmi Note 13 256GB", brand: "Xiaomi", category: "phones", type: "Smartphone",
      price: 4499, was: 4999, stock: 30,
      art: { kind: "phone", color: "#14b8a6", body: "dark" },
      summary: "Big storage and a smooth 120 Hz AMOLED screen at a friendly price.",
      specs: [["Storage", "256 GB"], ["Display", "6.67\" AMOLED 120 Hz"], ["Network", "4G, dual SIM"], ["Main camera", "108 MP"], ["Battery", "5000 mAh"]]
    },
    {
      id: "samsung-galaxy-a15", name: "Samsung Galaxy A15 128GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 3299, stock: 25,
      art: { kind: "phone", color: "#0ea5e9", body: "dark" },
      summary: "Reliable everyday phone with a big screen and two-day battery life.",
      specs: [["Storage", "128 GB"], ["Display", "6.5\" Super AMOLED"], ["Network", "4G, dual SIM"], ["Main camera", "50 MP"], ["Battery", "5000 mAh"]]
    },
    {
      id: "apple-ipad-10", name: "Apple iPad (10th gen) 64GB Wi-Fi", brand: "Apple", category: "phones", type: "Tablet",
      price: 8999, stock: 9,
      art: { kind: "tablet", color: "#3b82f6", body: "silver" },
      summary: "All-screen iPad for notes, school work and entertainment.",
      specs: [["Storage", "64 GB"], ["Display", "10.9\" Liquid Retina"], ["Connectivity", "Wi-Fi"], ["Port", "USB-C"]]
    },
    {
      id: "samsung-galaxy-tab-a9-plus", name: "Samsung Galaxy Tab A9+ 64GB", brand: "Samsung", category: "phones", type: "Tablet",
      price: 4299, was: 4799, stock: 11,
      art: { kind: "tablet", color: "#8b5cf6", body: "dark" },
      summary: "Large 11-inch screen with quad speakers — perfect for the family.",
      specs: [["Storage", "64 GB"], ["Display", "11\" 90 Hz"], ["Connectivity", "Wi-Fi"], ["Audio", "Quad speakers"]]
    },

    /* ---------- accessories ---------- */
    {
      id: "anker-20w-usb-c-charger", name: "Anker 20W USB-C Fast Charger", brand: "Anker", category: "accessories", type: "Charger",
      price: 299, stock: 60,
      art: { kind: "charger", color: "#0ea5e9", body: "white" },
      summary: "Compact fast charger for phones and tablets with USB-C Power Delivery.",
      specs: [["Output", "20 W USB-C PD"], ["Plug", "SA 2-pin adapter included"], ["Compatible", "iPhone, Samsung, iPad & more"]]
    },
    {
      id: "volkano-braided-usb-c-cable", name: "Volkano Braided USB-C Cable 1.8m", brand: "Volkano", category: "accessories", type: "Cable",
      price: 149, stock: 80,
      art: { kind: "cable", color: "#f97316" },
      summary: "Tough nylon-braided cable for charging and data, built to last.",
      specs: [["Connectors", "USB-C to USB-C"], ["Length", "1.8 m"], ["Jacket", "Braided nylon"]]
    },
    {
      id: "romoss-20000mah-power-bank", name: "Romoss 20000mAh Power Bank", brand: "Romoss", category: "accessories", type: "Power bank",
      price: 499, was: 599, stock: 35, featured: true,
      art: { kind: "powerbank", color: "#22c55e", body: "white" },
      summary: "Several full phone charges — essential for load shedding and travel.",
      specs: [["Capacity", "20 000 mAh"], ["Ports", "USB-C, 2 × USB-A"], ["Fast charge", "Yes"]]
    },
    {
      id: "logitech-m185-wireless-mouse", name: "Logitech M185 Wireless Mouse", brand: "Logitech", category: "accessories", type: "Mouse",
      price: 249, stock: 40,
      art: { kind: "mouse", color: "#2563eb", body: "dark" },
      summary: "Plug-and-play wireless mouse with a tiny USB receiver.",
      specs: [["Connection", "2.4 GHz USB receiver"], ["Battery", "1 × AA"], ["Compatible", "Windows, macOS, ChromeOS"]]
    },
    {
      id: "logitech-mk270-combo", name: "Logitech MK270 Keyboard & Mouse", brand: "Logitech", category: "accessories", type: "Keyboard",
      price: 599, stock: 15,
      art: { kind: "keyboard", color: "#2563eb", body: "dark" },
      summary: "Wireless keyboard and mouse combo with one shared receiver.",
      specs: [["Connection", "2.4 GHz USB receiver"], ["Layout", "US QWERTY"], ["Extras", "8 hotkeys"]]
    },
    {
      id: "sony-wh-ch520", name: "Sony WH-CH520 Wireless Headphones", brand: "Sony", category: "accessories", type: "Headphones",
      price: 999, was: 1199, stock: 12, featured: true,
      art: { kind: "headphones", color: "#0d9488", body: "dark" },
      summary: "Lightweight on-ear headphones with up to 50 hours of battery.",
      specs: [["Connection", "Bluetooth 5.2"], ["Battery", "Up to 50 hours"], ["Mic", "Built-in for calls"]]
    },
    {
      id: "jbl-tune-buds", name: "JBL Tune Buds Earbuds", brand: "JBL", category: "accessories", type: "Earbuds",
      price: 1299, stock: 0,
      art: { kind: "earbuds", color: "#f97316", body: "dark" },
      summary: "True wireless earbuds with noise cancelling and JBL Pure Bass.",
      specs: [["Connection", "Bluetooth 5.3"], ["Noise cancelling", "Active (ANC)"], ["Water resistance", "IP54"]]
    },
    {
      id: "clear-case-galaxy-a55", name: "Clear Shockproof Case — Galaxy A55", brand: "Volkano", category: "accessories", type: "Case",
      price: 199, stock: 50,
      art: { kind: "case", color: "#6366f1" },
      summary: "Slim clear case with reinforced corners that shows off your phone.",
      specs: [["Fits", "Samsung Galaxy A55"], ["Material", "TPU"], ["Corners", "Air-cushion reinforced"]]
    },
    {
      id: "sandisk-ultra-128gb-usb", name: "SanDisk Ultra 128GB USB 3.0 Flash Drive", brand: "SanDisk", category: "accessories", type: "Storage",
      price: 229, stock: 45,
      art: { kind: "flash", color: "#dc2626" },
      summary: "Pocket storage for documents, photos and school projects.",
      specs: [["Capacity", "128 GB"], ["Interface", "USB 3.0"]]
    },
    {
      id: "samsung-t7-1tb-ssd", name: "Samsung T7 1TB Portable SSD", brand: "Samsung", category: "accessories", type: "Storage",
      price: 1899, stock: 9,
      art: { kind: "ssd", color: "#0ea5e9" },
      summary: "Credit-card-sized SSD for fast backups and big file transfers.",
      specs: [["Capacity", "1 TB"], ["Interface", "USB 3.2 Gen 2, USB-C"], ["Includes", "USB-C to C and C to A cables"]]
    },

    /* ---------- electronics ---------- */
    {
      id: "hisense-43-smart-tv", name: "Hisense 43\" Full HD Smart TV", brand: "Hisense", category: "electronics", type: "TV",
      price: 4999, was: 5799, stock: 10, featured: true,
      art: { kind: "tv", color: "#ea580c", body: "dark" },
      summary: "Smart TV with built-in streaming apps — Netflix, YouTube and more.",
      specs: [["Size", "43\""], ["Resolution", "Full HD"], ["Smart platform", "VIDAA"], ["Inputs", "2 × HDMI, 2 × USB"]]
    },
    {
      id: "samsung-55-crystal-uhd", name: "Samsung 55\" Crystal UHD 4K Smart TV", brand: "Samsung", category: "electronics", type: "TV",
      price: 9999, stock: 4,
      art: { kind: "tv", color: "#2563eb", body: "dark" },
      summary: "Sharp 4K picture and slim design for the main lounge.",
      specs: [["Size", "55\""], ["Resolution", "4K UHD"], ["HDR", "HDR10+"], ["Inputs", "3 × HDMI, USB"]]
    },
    {
      id: "jbl-flip-6", name: "JBL Flip 6 Bluetooth Speaker", brand: "JBL", category: "electronics", type: "Speaker",
      price: 1999, stock: 16,
      art: { kind: "speaker", color: "#0d9488" },
      summary: "Bold, waterproof sound you can take anywhere.",
      specs: [["Connection", "Bluetooth"], ["Battery", "Up to 12 hours"], ["Water resistance", "IP67"]]
    },
    {
      id: "samsung-galaxy-watch6", name: "Samsung Galaxy Watch6 40mm", brand: "Samsung", category: "electronics", type: "Smartwatch",
      price: 4499, was: 5499, stock: 7,
      art: { kind: "watch", color: "#0ea5e9", body: "dark", round: true },
      summary: "Health, sleep and fitness tracking on a bright round display.",
      specs: [["Case", "40 mm"], ["Connectivity", "Bluetooth, Wi-Fi"], ["Tracking", "Heart rate, sleep, workouts"]]
    },
    {
      id: "sony-playstation-5-slim", name: "Sony PlayStation 5 Slim", brand: "Sony", category: "electronics", type: "Gaming",
      price: 11999, stock: 2, badge: "Hot",
      art: { kind: "console", color: "#2563eb" },
      summary: "Next-gen gaming with ultra-fast loading and the DualSense controller.",
      specs: [["Storage", "1 TB SSD"], ["Drive", "Ultra HD Blu-ray"], ["Includes", "DualSense wireless controller"]]
    },
    {
      id: "tp-link-archer-c6", name: "TP-Link Archer C6 Wi-Fi Router", brand: "TP-Link", category: "electronics", type: "Networking",
      price: 799, stock: 20,
      art: { kind: "router", color: "#22c55e", body: "dark" },
      summary: "Dual-band Wi-Fi with four antennas for reliable whole-home coverage.",
      specs: [["Wi-Fi", "AC1200 dual-band"], ["Ports", "4 × Gigabit LAN, 1 × WAN"], ["Antennas", "4 external"]]
    },
    {
      id: "hp-smart-tank-580", name: "HP Smart Tank 580 All-in-One Printer", brand: "HP", category: "electronics", type: "Printer",
      price: 3499, stock: 6,
      art: { kind: "printer", color: "#0284c7", body: "light" },
      summary: "Refillable ink tanks for low-cost printing, scanning and copying.",
      specs: [["Functions", "Print, scan, copy"], ["Connectivity", "Wi-Fi, USB"], ["Ink", "Refillable tanks"]]
    }
  ];

  /* ---------- product illustrations ----------
     Simple inline SVG drawings so every product has a picture before
     real photography is supplied. Drawn on a 320 × 240 canvas. */
  var BODY = { dark: "#1e293b", silver: "#cbd5e1", light: "#e2e8f0", white: "#f8fafc" };
  var seq = 0;

  function mix(hex, amt) { // amt 0..1 toward white
    var n = parseInt(hex.slice(1), 16);
    var r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  MABS.tint = mix;

  var DRAW = {
    laptop: function (c, b, s) {
      return '<rect x="66" y="38" width="188" height="122" rx="9" fill="' + b + '"/>' +
        '<rect x="74" y="46" width="172" height="106" rx="3" fill="' + s + '"/>' +
        '<path d="M44 162H276L290 180Q292 188 283 188H37Q28 188 30 180Z" fill="' + b + '" opacity=".85"/>' +
        '<rect x="138" y="162" width="44" height="5" rx="2.5" fill="#000" opacity=".15"/>';
    },
    desktop: function (c, b, s) {
      return '<rect x="40" y="44" width="160" height="106" rx="7" fill="' + b + '"/>' +
        '<rect x="47" y="51" width="146" height="92" rx="3" fill="' + s + '"/>' +
        '<rect x="110" y="150" width="20" height="24" fill="' + b + '" opacity=".8"/>' +
        '<rect x="84" y="172" width="72" height="8" rx="4" fill="' + b + '"/>' +
        '<rect x="216" y="56" width="62" height="124" rx="7" fill="' + b + '"/>' +
        '<circle cx="247" cy="76" r="5" fill="' + c + '"/>' +
        '<path d="M230 140H264M230 150H264M230 160H264" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>';
    },
    monitor: function (c, b, s) {
      return '<rect x="42" y="32" width="236" height="142" rx="7" fill="' + b + '"/>' +
        '<rect x="49" y="39" width="222" height="124" rx="3" fill="' + s + '"/>' +
        '<path d="M148 174H172L178 196H142Z" fill="' + b + '" opacity=".8"/>' +
        '<rect x="112" y="194" width="96" height="9" rx="4.5" fill="' + b + '"/>';
    },
    phone: function (c, b, s) {
      return '<rect x="158" y="32" width="80" height="182" rx="16" fill="' + b + '"/>' +
        '<rect x="168" y="44" width="32" height="56" rx="11" fill="#000" opacity=".2"/>' +
        '<circle cx="184" cy="59" r="8" fill="#0f172a"/><circle cx="184" cy="84" r="8" fill="#0f172a"/>' +
        '<rect x="84" y="22" width="84" height="196" rx="16" fill="#0f172a"/>' +
        '<rect x="89" y="27" width="74" height="186" rx="12" fill="' + s + '"/>' +
        '<circle cx="126" cy="38" r="3.5" fill="#0f172a"/>';
    },
    tablet: function (c, b, s) {
      return '<rect x="56" y="34" width="208" height="164" rx="16" fill="' + b + '"/>' +
        '<rect x="66" y="44" width="188" height="144" rx="6" fill="' + s + '"/>';
    },
    watch: function (c, b, s, a) {
      var face = a.round ?
        '<circle cx="160" cy="120" r="54" fill="' + b + '"/><circle cx="160" cy="120" r="45" fill="' + s + '"/>' :
        '<rect x="114" y="66" width="92" height="108" rx="24" fill="' + b + '"/><rect x="122" y="74" width="76" height="92" rx="18" fill="' + s + '"/>';
      return '<rect x="134" y="14" width="52" height="212" rx="14" fill="' + b + '" opacity=".75"/>' + face +
        '<rect x="' + (a.round ? 212 : 205) + '" y="108" width="7" height="22" rx="3" fill="' + b + '"/>';
    },
    headphones: function (c, b) {
      return '<path d="M86 146V116A74 74 0 0 1 234 116V146" fill="none" stroke="' + b + '" stroke-width="14" stroke-linecap="round"/>' +
        '<rect x="62" y="126" width="48" height="80" rx="20" fill="' + b + '"/>' +
        '<rect x="210" y="126" width="48" height="80" rx="20" fill="' + b + '"/>' +
        '<rect x="102" y="138" width="10" height="56" rx="5" fill="' + c + '"/>' +
        '<rect x="208" y="138" width="10" height="56" rx="5" fill="' + c + '"/>';
    },
    earbuds: function (c, b) {
      return '<rect x="96" y="104" width="128" height="100" rx="40" fill="' + b + '"/>' +
        '<path d="M100 140H220" stroke="#000" stroke-opacity=".25" stroke-width="2"/>' +
        '<circle cx="160" cy="176" r="4" fill="' + c + '"/>' +
        '<circle cx="128" cy="62" r="20" fill="' + b + '"/><rect x="118" y="62" width="14" height="40" rx="7" fill="' + b + '"/><circle cx="128" cy="62" r="8" fill="' + c + '"/>' +
        '<circle cx="192" cy="62" r="20" fill="' + b + '"/><rect x="188" y="62" width="14" height="40" rx="7" fill="' + b + '"/><circle cx="192" cy="62" r="8" fill="' + c + '"/>';
    },
    speaker: function (c, b, s) {
      return '<rect x="58" y="78" width="204" height="90" rx="45" fill="' + s + '"/>' +
        '<ellipse cx="72" cy="123" rx="14" ry="42" fill="#0f172a" opacity=".85"/>' +
        '<ellipse cx="248" cy="123" rx="14" ry="42" fill="#0f172a" opacity=".85"/>' +
        '<rect x="136" y="111" width="48" height="24" rx="6" fill="#fff" opacity=".85"/>' +
        '<rect x="96" y="172" width="128" height="8" rx="4" fill="#000" opacity=".1"/>';
    },
    mouse: function (c, b) {
      return '<ellipse cx="160" cy="124" rx="52" ry="80" fill="' + b + '"/>' +
        '<path d="M160 44V108" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>' +
        '<rect x="154" y="66" width="12" height="26" rx="6" fill="' + c + '"/>';
    },
    keyboard: function (c, b) {
      var keys = "";
      for (var r = 0; r < 4; r++) {
        for (var k = 0; k < 10; k++) {
          keys += '<rect x="' + (36 + k * 19) + '" y="' + (98 + r * 17) + '" width="15" height="13" rx="2.5" fill="#fff" opacity=".2"/>';
        }
      }
      return '<rect x="26" y="88" width="204" height="104" rx="10" fill="' + b + '"/>' + keys +
        '<rect x="74" y="168" width="110" height="13" rx="2.5" fill="#fff" opacity=".2"/>' +
        '<ellipse cx="270" cy="140" rx="26" ry="42" fill="' + b + '"/>' +
        '<rect x="266" y="108" width="8" height="18" rx="4" fill="' + c + '"/>';
    },
    charger: function (c, b) {
      return '<path d="M160 168C160 214 236 186 240 222" fill="none" stroke="' + c + '" stroke-width="8" stroke-linecap="round"/>' +
        '<rect x="134" y="38" width="9" height="28" rx="2" fill="#94a3b8"/><rect x="177" y="38" width="9" height="28" rx="2" fill="#94a3b8"/>' +
        '<rect x="110" y="62" width="100" height="104" rx="18" fill="' + b + '" stroke="#0f172a" stroke-opacity=".12" stroke-width="2"/>' +
        '<rect x="146" y="148" width="28" height="9" rx="4.5" fill="#0f172a" opacity=".7"/>';
    },
    cable: function (c) {
      return '<path d="M52 186C52 92 140 70 160 120S268 160 268 60" fill="none" stroke="' + c + '" stroke-width="9" stroke-linecap="round"/>' +
        '<rect x="40" y="180" width="24" height="40" rx="6" fill="#334155"/><rect x="45" y="214" width="14" height="12" rx="3" fill="#94a3b8"/>' +
        '<rect x="256" y="20" width="24" height="40" rx="6" fill="#334155"/><rect x="261" y="14" width="14" height="12" rx="3" fill="#94a3b8"/>';
    },
    powerbank: function (c, b) {
      return '<rect x="96" y="36" width="128" height="176" rx="20" fill="' + b + '" stroke="#0f172a" stroke-opacity=".12" stroke-width="2"/>' +
        '<rect x="126" y="44" width="24" height="7" rx="3" fill="#0f172a" opacity=".6"/><rect x="170" y="44" width="24" height="7" rx="3" fill="#0f172a" opacity=".6"/>' +
        '<circle cx="136" cy="186" r="5" fill="' + c + '"/><circle cx="152" cy="186" r="5" fill="' + c + '"/><circle cx="168" cy="186" r="5" fill="' + c + '"/><circle cx="184" cy="186" r="5" fill="' + c + '" opacity=".3"/>';
    },
    "case": function (c) {
      return '<rect x="110" y="20" width="100" height="200" rx="20" fill="' + c + '" fill-opacity=".14" stroke="' + c + '" stroke-width="5"/>' +
        '<rect x="122" y="34" width="38" height="62" rx="12" fill="none" stroke="' + c + '" stroke-width="4"/>' +
        '<path d="M116 30L128 22M204 30L192 22M116 210L128 218M204 210L192 218" stroke="' + c + '" stroke-width="6" stroke-linecap="round"/>';
    },
    flash: function (c) {
      return '<rect x="210" y="104" width="54" height="42" rx="4" fill="#cbd5e1"/>' +
        '<rect x="226" y="114" width="10" height="8" fill="#64748b"/><rect x="242" y="114" width="10" height="8" fill="#64748b"/>' +
        '<rect x="62" y="92" width="152" height="66" rx="14" fill="' + c + '"/>' +
        '<circle cx="84" cy="125" r="8" fill="#fff"/>';
    },
    ssd: function (c, b, s) {
      return '<rect x="88" y="52" width="144" height="136" rx="18" fill="' + s + '"/>' +
        '<rect x="100" y="64" width="120" height="112" rx="10" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>' +
        '<rect x="146" y="182" width="28" height="8" rx="3" fill="#0f172a" opacity=".6"/>';
    },
    tv: function (c, b, s) {
      return '<rect x="20" y="34" width="280" height="160" rx="6" fill="' + b + '"/>' +
        '<rect x="26" y="40" width="268" height="148" rx="3" fill="' + s + '"/>' +
        '<path d="M58 194L46 212M262 194L274 212" stroke="' + b + '" stroke-width="7" stroke-linecap="round"/>';
    },
    console: function (c) {
      return '<path d="M96 24Q128 18 132 36V206Q128 222 96 216Z" fill="#f8fafc" stroke="#0f172a" stroke-opacity=".12" stroke-width="2"/>' +
        '<rect x="130" y="34" width="14" height="172" rx="4" fill="#0f172a"/>' +
        '<path d="M172 150H262A26 26 0 0 1 286 184L278 206A15 15 0 0 1 252 208L242 194H192L182 208A15 15 0 0 1 156 206L148 184A26 26 0 0 1 172 150Z" fill="#f8fafc" stroke="#0f172a" stroke-opacity=".12" stroke-width="2"/>' +
        '<rect x="196" y="160" width="40" height="18" rx="6" fill="#0f172a" opacity=".85"/>' +
        '<path d="M196 160H236" stroke="' + c + '" stroke-width="3"/>';
    },
    router: function (c, b) {
      return '<path d="M84 124L72 40M128 124L124 34M192 124L196 34M236 124L248 40" stroke="' + b + '" stroke-width="10" stroke-linecap="round"/>' +
        '<rect x="52" y="118" width="216" height="58" rx="12" fill="' + b + '"/>' +
        '<circle cx="100" cy="148" r="5" fill="' + c + '"/><circle cx="120" cy="148" r="5" fill="' + c + '"/><circle cx="140" cy="148" r="5" fill="' + c + '"/><circle cx="160" cy="148" r="5" fill="' + c + '" opacity=".35"/>';
    },
    printer: function (c, b) {
      return '<path d="M104 92V36H216V92" fill="#fff" stroke="#0f172a" stroke-opacity=".15" stroke-width="2"/>' +
        '<path d="M120 52H200M120 64H184" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="52" y="88" width="216" height="96" rx="12" fill="' + b + '" stroke="#0f172a" stroke-opacity=".12" stroke-width="2"/>' +
        '<rect x="88" y="150" width="144" height="10" rx="5" fill="#0f172a" opacity=".55"/>' +
        '<rect x="214" y="102" width="36" height="22" rx="4" fill="' + c + '"/>';
    }
  };

  MABS.art = function (a) {
    var id = "mg" + (++seq);
    var c = a.color || "#2563eb";
    var b = BODY[a.body || "dark"];
    var draw = DRAW[a.kind] || DRAW.phone;
    return '<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + mix(c, 0.35) + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>' +
      draw(c, b, "url(#" + id + ")", a) + "</svg>";
  };
})();
