/* =====================================================================
   MABS TECHNOLOGIES — STORE CONFIG & CATALOGUE
   ---------------------------------------------------------------------
   The shop's settings (contact details, backend address) and its
   built-in catalogue. With the backend running (api/, see README),
   products, prices, stock and delivery charges come from the database and
   are managed in the admin panel; this catalogue is the fallback when the
   backend can't be reached (e.g. on GitHub Pages).
   Prices are in South African rand (ZAR), VAT inclusive.
   ===================================================================== */
(function () {
  "use strict";
  var MABS = window.MABS = window.MABS || {};

  MABS.store = {
    name: "Mabs Technologies",
    tagline: "Everything you need, from tech to home, fashion and more",
    // Fill these in to show them in the footer and to let customers send
    // their order straight to the shop from the confirmation screen.
    email: "",      // e.g. "orders@mabstech.co.za"
    whatsapp: "",   // international format, digits only, e.g. "27821234567"
    phone: "",      // as displayed, e.g. "082 123 4567"
    address: "",    // e.g. "12 Main Road, Johannesburg"
    hours: "",      // e.g. "Mon–Sat 9:00–18:00"
    // Shop backend (PHP + MySQL in api/). Relative to the site; set to "" to
    // run purely from the built-in catalogue below.
    api: "api/",
    // shown under "Popular searches" when someone opens the search box;
    // swap for real trending searches once searches are logged in a database
    popularSearches: ["Laptops", "Samsung Galaxy", "Air fryer", "Sneakers", "LEGO", "Kettle"],
    maxPerItem: 10,      // most of one product a single order can hold (the backend enforces it too)
    delivery: {
      courierFee: 120,   // flat courier fee per order
      freeOver: 1500,    // orders at or above this subtotal ship free
      collect: true      // offer free in-store collection
    },
    // shown on every product page — check these match how the shop works
    service: {
      deliveryDays: [2, 4],  // courier: working days from order to door
      collectNote: "Usually ready within 1 working day. We'll let you know.",
      returns: "Changed your mind? Return unused items in their original packaging within 7 days.",
      warranty: "Manufacturer's warranty",  // used when a product has no "Warranty" spec…
      warrantyDepartments: ["computers", "phones", "electronics", "accessories", "appliances", "diy"] // …in these departments
    }
  };

  // Homepage carousel, in order. Each slide is one image made at
  //   desktop: 3840 × 1000 px (artboard 1920 × 500 exported at 2x), text inside the middle 1520 × 440
  //   mobile:  1080 × 720 px, text at least 60 px from the edges
  // e.g. { image: "assets/slides/back-to-school.jpg", mobile: "assets/slides/back-to-school-mobile.jpg",
  //        href: "index.html?cat=computers#shop", alt: "Back to school: laptops up to 20% off" }
  // While this list is empty, a built-in welcome banner shows instead.
  MABS.slides = [];

  // logo strip under the homepage carousel; `h` is the display height in px,
  // set per logo so wide wordmarks and square marks look the same size.
  // A logo links to the shop filtered by that brand once a product has it as `brand`.
  MABS.brands = [
    { name: "Samsung", logo: "assets/brands/samsung.svg", h: 16 },
    { name: "Apple", logo: "assets/brands/apple.svg", h: 30 },
    { name: "Canon", logo: "assets/brands/canon.svg", h: 18 },
    { name: "Lenovo", logo: "assets/brands/lenovo.svg", h: 21 },
    { name: "HP", logo: "assets/brands/hp.svg", h: 30 },
    { name: "Deli", logo: "assets/brands/deli.svg", h: 21 },
    { name: "Sony", logo: "assets/brands/sony.svg", h: 17 },
    { name: "JBL", logo: "assets/brands/jbl.svg", h: 25 },
    { name: "Dell", logo: "assets/brands/dell.svg", h: 30 },
    { name: "Xiaomi", logo: "assets/brands/xiaomi.svg", h: 30 },
    { name: "ASUS", logo: "assets/brands/asus.svg", h: 18 },
    { name: "Huawei", logo: "assets/brands/huawei.svg", h: 27 }
  ];

  // departments, in menu order. `art` draws the department's tile (any kind
  // from the product drawings below). Add or rename departments in the admin panel.
  MABS.categories = [
    { id: "computers", name: "Computers", blurb: "Laptops, desktops & monitors", art: { kind: "laptop", color: "#2563eb", body: "silver" } },
    { id: "phones", name: "Phones & Tablets", blurb: "Smartphones & tablets", art: { kind: "phone", color: "#7c3aed" } },
    { id: "electronics", name: "TV, Audio & Gaming", blurb: "TVs, speakers, wearables, printers & gaming", art: { kind: "tv", color: "#ea580c" } },
    { id: "accessories", name: "Tech Accessories", blurb: "Chargers, headphones, storage & more", art: { kind: "headphones", color: "#0d9488" } },
    { id: "appliances", name: "Home Appliances", blurb: "Kettles, air fryers, microwaves & more", art: { kind: "kettle", color: "#dc2626" } },
    { id: "home", name: "Home & Kitchen", blurb: "Cookware, coffee & food storage", art: { kind: "pan", color: "#f97316" } },
    { id: "fashion", name: "Fashion", blurb: "Clothing, shoes & bags", art: { kind: "tshirt", color: "#2563eb" } },
    { id: "beauty", name: "Beauty & Personal Care", blurb: "Hair care, oral care & skincare", art: { kind: "hairdryer", color: "#db2777" } },
    { id: "baby", name: "Baby & Toddler", blurb: "Nappies, feeding & baby care", art: { kind: "babybottle", color: "#0ea5e9" } },
    { id: "toys", name: "Toys & Games", blurb: "Building sets, plush toys & puzzles", art: { kind: "teddy", color: "#b45309" } },
    { id: "sport", name: "Sport & Fitness", blurb: "Training, balls & yoga", art: { kind: "ball", color: "#16a34a" } },
    { id: "office", name: "Office & Stationery", blurb: "Notebooks, pens & calculators", art: { kind: "notebook", color: "#4f46e5" } },
    { id: "diy", name: "DIY & Tools", blurb: "Power tools & tool storage", art: { kind: "drill", color: "#16a34a" } }
  ];

  // stock: units on hand (0 = sold out). was: previous price, shows a sale badge.
  // art: drawn illustration until real product photos are added —
  // set `image: "assets/products/<file>.jpg"` on a product to use a photo instead.
  MABS.products = [
    /* ---------- computers ---------- */
    {
      id: "lenovo-ideapad-slim-3",
      // demo gallery made from the drawing — replace with real photos
      image: "assets/products/demo/lenovo-ideapad-slim-3-1.jpg", images: ["assets/products/demo/lenovo-ideapad-slim-3-1.jpg", "assets/products/demo/lenovo-ideapad-slim-3-2.jpg", "assets/products/demo/lenovo-ideapad-slim-3-3.jpg", "assets/products/demo/lenovo-ideapad-slim-3-4.jpg"],
      name: "Lenovo IdeaPad Slim 3 15\"", brand: "Lenovo", category: "computers", type: "Laptop",
      price: 8999, was: 10499, stock: 14, featured: true,
      art: { kind: "laptop", color: "#2563eb", body: "silver" },
      summary: "A thin, light everyday laptop for study, office work and streaming.",
      specs: [["Processor", "Intel Core i5"], ["Memory", "8 GB RAM"], ["Storage", "512 GB SSD"], ["Display", "15.6\" Full HD"], ["OS", "Windows 11 Home"], ["Colour", "Grey"]]
    },
    {
      id: "hp-250-g10", name: "HP 250 G10 Notebook", brand: "HP", category: "computers", type: "Laptop",
      price: 7499, stock: 20,
      art: { kind: "laptop", color: "#0ea5e9", body: "dark" },
      summary: "Dependable business notebook with a full-size keyboard and plenty of ports.",
      specs: [["Processor", "Intel Core i3"], ["Memory", "8 GB RAM"], ["Storage", "256 GB SSD"], ["Display", "15.6\" Full HD"], ["OS", "Windows 11 Home"], ["Colour", "Silver"]]
    },
    {
      id: "dell-inspiron-14", name: "Dell Inspiron 14", brand: "Dell", category: "computers", type: "Laptop",
      price: 13999, stock: 6,
      art: { kind: "laptop", color: "#4f46e5", body: "silver" },
      summary: "Compact 14-inch performer for multitasking, design work and video calls.",
      specs: [["Processor", "Intel Core i7"], ["Memory", "16 GB RAM"], ["Storage", "512 GB SSD"], ["Display", "14\" FHD+"], ["OS", "Windows 11 Home"], ["Colour", "Silver"]]
    },
    {
      id: "apple-macbook-air-13-m2",
      // demo gallery made from the drawing — replace with real photos
      image: "assets/products/demo/apple-macbook-air-13-m2-1.jpg", images: ["assets/products/demo/apple-macbook-air-13-m2-1.jpg", "assets/products/demo/apple-macbook-air-13-m2-2.jpg", "assets/products/demo/apple-macbook-air-13-m2-3.jpg", "assets/products/demo/apple-macbook-air-13-m2-4.jpg", "assets/products/demo/apple-macbook-air-13-m2-5.jpg"],
      name: "Apple MacBook Air 13\" (M2)", brand: "Apple", category: "computers", type: "Laptop",
      price: 18999, was: 20999, stock: 4, featured: true,
      art: { kind: "laptop", color: "#64748b", body: "silver" },
      summary: "Silent, fanless and all-day battery — the go-anywhere Mac.",
      specs: [["Chip", "Apple M2"], ["Memory", "8 GB unified"], ["Storage", "256 GB SSD"], ["Display", "13.6\" Liquid Retina"], ["OS", "macOS"], ["Colour", "Silver"]]
    },
    {
      id: "asus-tuf-gaming-f15", name: "ASUS TUF Gaming F15", brand: "ASUS", category: "computers", type: "Laptop",
      price: 17999, stock: 3, badge: "Gaming",
      art: { kind: "laptop", color: "#dc2626", body: "dark" },
      summary: "Military-grade build with dedicated graphics and a fast 144 Hz screen.",
      specs: [["Processor", "Intel Core i5"], ["Graphics", "NVIDIA GeForce RTX 3050"], ["Memory", "16 GB RAM"], ["Storage", "512 GB SSD"], ["Display", "15.6\" FHD 144 Hz"], ["Colour", "Grey"]]
    },
    {
      id: "hp-pro-tower-290", name: "HP Pro Tower 290 Desktop", brand: "HP", category: "computers", type: "Desktop",
      price: 9999, stock: 5,
      art: { kind: "desktop", color: "#0284c7", body: "dark" },
      summary: "Space-saving office tower, ready for a monitor, keyboard and mouse.",
      specs: [["Processor", "Intel Core i5"], ["Memory", "8 GB RAM"], ["Storage", "512 GB SSD"], ["Connectivity", "Wi-Fi, Bluetooth, Gigabit LAN"], ["OS", "Windows 11 Pro"], ["Colour", "Black"]]
    },
    {
      id: "samsung-24-fhd-monitor", name: "Samsung 24\" FHD Monitor", brand: "Samsung", category: "computers", type: "Monitor",
      price: 2299, was: 2699, stock: 18,
      art: { kind: "monitor", color: "#0ea5e9", body: "dark" },
      summary: "Borderless Full HD IPS panel — a great second screen for home or office.",
      specs: [["Size", "24\""], ["Resolution", "1920 × 1080"], ["Panel", "IPS"], ["Refresh rate", "75 Hz"], ["Inputs", "HDMI, VGA"], ["Colour", "Black"]]
    },

    /* ---------- phones & tablets ---------- */
    {
      id: "samsung-galaxy-a55", name: "Samsung Galaxy A55 5G 128GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 8499, was: 9499, stock: 22, featured: true,
      art: { kind: "phone", color: "#6366f1", body: "silver" },
      summary: "Premium-feel mid-ranger with a bright AMOLED display and great cameras.",
      specs: [["Storage", "128 GB"], ["Display", "6.6\" Super AMOLED"], ["Network", "5G, dual SIM"], ["Main camera", "50 MP"], ["Battery", "5000 mAh"], ["Headphone jack", "No"], ["Colour", "Blue"]]
    },
    {
      id: "samsung-galaxy-s24", name: "Samsung Galaxy S24 256GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 18999, stock: 6, badge: "New",
      art: { kind: "phone", color: "#a855f7", body: "dark" },
      summary: "Compact flagship with Galaxy AI features and a pro-grade camera system.",
      specs: [["Storage", "256 GB"], ["Display", "6.2\" Dynamic AMOLED 2X"], ["Network", "5G"], ["Main camera", "50 MP"], ["Battery", "4000 mAh"], ["Headphone jack", "No"], ["Colour", "Black"]]
    },
    {
      id: "apple-iphone-15", name: "Apple iPhone 15 128GB", brand: "Apple", category: "phones", type: "Smartphone",
      price: 17999, stock: 8, featured: true,
      art: { kind: "phone", color: "#ec4899", body: "light" },
      summary: "Dynamic Island, a 48 MP main camera and USB-C charging.",
      specs: [["Storage", "128 GB"], ["Display", "6.1\" Super Retina XDR"], ["Network", "5G"], ["Main camera", "48 MP"], ["Port", "USB-C"], ["Headphone jack", "No"], ["Colour", "Pink"]]
    },
    {
      id: "xiaomi-redmi-note-13", name: "Xiaomi Redmi Note 13 256GB", brand: "Xiaomi", category: "phones", type: "Smartphone",
      price: 4499, was: 4999, stock: 30,
      art: { kind: "phone", color: "#14b8a6", body: "dark" },
      summary: "Big storage and a smooth 120 Hz AMOLED screen at a friendly price.",
      specs: [["Storage", "256 GB"], ["Display", "6.67\" AMOLED 120 Hz"], ["Network", "4G, dual SIM"], ["Main camera", "108 MP"], ["Battery", "5000 mAh"], ["Headphone jack", "3.5 mm"], ["Colour", "Green"]]
    },
    {
      id: "samsung-galaxy-a15", name: "Samsung Galaxy A15 128GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 3299, stock: 25,
      art: { kind: "phone", color: "#0ea5e9", body: "dark" },
      summary: "Reliable everyday phone with a big screen and two-day battery life.",
      specs: [["Storage", "128 GB"], ["Display", "6.5\" Super AMOLED"], ["Network", "4G, dual SIM"], ["Main camera", "50 MP"], ["Battery", "5000 mAh"], ["Headphone jack", "3.5 mm"], ["Colour", "Blue"]]
    },
    {
      id: "apple-ipad-10", name: "Apple iPad (10th gen) 64GB Wi-Fi", brand: "Apple", category: "phones", type: "Tablet",
      price: 8999, stock: 9,
      art: { kind: "tablet", color: "#3b82f6", body: "silver" },
      summary: "All-screen iPad for notes, school work and entertainment.",
      specs: [["Storage", "64 GB"], ["Display", "10.9\" Liquid Retina"], ["Connectivity", "Wi-Fi"], ["Port", "USB-C"], ["Headphone jack", "No"], ["Colour", "Blue"]]
    },
    {
      id: "samsung-galaxy-tab-a9-plus", name: "Samsung Galaxy Tab A9+ 64GB", brand: "Samsung", category: "phones", type: "Tablet",
      price: 4299, was: 4799, stock: 11,
      art: { kind: "tablet", color: "#8b5cf6", body: "dark" },
      summary: "Large 11-inch screen with quad speakers — perfect for the family.",
      specs: [["Storage", "64 GB"], ["Display", "11\" 90 Hz"], ["Connectivity", "Wi-Fi"], ["Audio", "Quad speakers"], ["Headphone jack", "3.5 mm"], ["Colour", "Grey"]]
    },

    /* ---------- accessories ---------- */
    {
      id: "sony-wh-ch520", name: "Sony WH-CH520 Wireless Headphones", brand: "Sony", category: "accessories", type: "Headphones",
      price: 999, was: 1199, stock: 12, featured: true,
      art: { kind: "headphones", color: "#0d9488", body: "dark" },
      summary: "Lightweight on-ear headphones with up to 50 hours of battery.",
      specs: [["Connection", "Bluetooth 5.2"], ["Battery", "Up to 50 hours"], ["Mic", "Built-in for calls"], ["Colour", "Black"]]
    },
    {
      id: "jbl-tune-buds", name: "JBL Tune Buds Earbuds", brand: "JBL", category: "accessories", type: "Earbuds",
      price: 1299, stock: 0,
      art: { kind: "earbuds", color: "#f97316", body: "dark" },
      summary: "True wireless earbuds with noise cancelling and JBL Pure Bass.",
      specs: [["Connection", "Bluetooth 5.3"], ["Noise cancelling", "Active (ANC)"], ["Water resistance", "IP54"], ["Colour", "Black"]]
    },
    {
      id: "samsung-t7-1tb-ssd", name: "Samsung T7 1TB Portable SSD", brand: "Samsung", category: "accessories", type: "Storage",
      price: 1899, stock: 9,
      art: { kind: "ssd", color: "#0ea5e9" },
      summary: "Credit-card-sized SSD for fast backups and big file transfers.",
      specs: [["Capacity", "1 TB"], ["Interface", "USB 3.2 Gen 2, USB-C"], ["Includes", "USB-C to C and C to A cables"], ["Colour", "Blue"]]
    },

    /* ---------- electronics ---------- */
    {
      id: "samsung-55-crystal-uhd", name: "Samsung 55\" Crystal UHD 4K Smart TV", brand: "Samsung", category: "electronics", type: "TV",
      price: 9999, stock: 4,
      art: { kind: "tv", color: "#2563eb", body: "dark" },
      summary: "Sharp 4K picture and slim design for the main lounge.",
      specs: [["Size", "55\""], ["Resolution", "4K UHD"], ["HDR", "HDR10+"], ["Inputs", "3 × HDMI, USB"], ["Colour", "Black"]]
    },
    {
      id: "jbl-flip-6",
      // demo gallery made from the drawing — replace with real photos
      image: "assets/products/demo/jbl-flip-6-1.jpg", images: ["assets/products/demo/jbl-flip-6-1.jpg", "assets/products/demo/jbl-flip-6-2.jpg", "assets/products/demo/jbl-flip-6-3.jpg"],
      name: "JBL Flip 6 Bluetooth Speaker", brand: "JBL", category: "electronics", type: "Speaker",
      price: 1999, stock: 16,
      art: { kind: "speaker", color: "#0d9488" },
      summary: "Bold, waterproof sound you can take anywhere.",
      specs: [["Connection", "Bluetooth"], ["Battery", "Up to 12 hours"], ["Water resistance", "IP67"], ["Colour", "Teal"]]
    },
    {
      id: "samsung-galaxy-watch6", name: "Samsung Galaxy Watch6 40mm", brand: "Samsung", category: "electronics", type: "Smartwatch",
      price: 4499, was: 5499, stock: 7,
      art: { kind: "watch", color: "#0ea5e9", body: "dark", round: true },
      summary: "Health, sleep and fitness tracking on a bright round display.",
      specs: [["Case", "40 mm"], ["Connectivity", "Bluetooth, Wi-Fi"], ["Tracking", "Heart rate, sleep, workouts"], ["Colour", "Black"]]
    },
    {
      id: "sony-playstation-5-slim", name: "Sony PlayStation 5 Slim", brand: "Sony", category: "electronics", type: "Gaming",
      price: 11999, stock: 2, badge: "Hot",
      art: { kind: "console", color: "#2563eb" },
      summary: "Next-gen gaming with ultra-fast loading and the DualSense controller.",
      specs: [["Storage", "1 TB SSD"], ["Drive", "Ultra HD Blu-ray"], ["Includes", "DualSense wireless controller"], ["Colour", "White"]]
    },
    {
      id: "hp-smart-tank-580", name: "HP Smart Tank 580 All-in-One Printer", brand: "HP", category: "electronics", type: "Printer",
      price: 3499, stock: 6,
      art: { kind: "printer", color: "#0284c7", body: "light" },
      summary: "Refillable ink tanks for low-cost printing, scanning and copying.",
      specs: [["Functions", "Print, scan, copy"], ["Connectivity", "Wi-Fi, USB"], ["Ink", "Refillable tanks"], ["Colour", "White"]]
    },

    /* ---------- more sample stock ---------- */
    {
      id: "asus-vivobook-15", name: "ASUS Vivobook 15", brand: "ASUS", category: "computers", type: "Laptop",
      price: 8499, was: 9299, stock: 11,
      art: { kind: "laptop", color: "#0891b2", body: "silver" },
      summary: "Slim 15-inch laptop with a full-size keyboard and fast SSD.",
      specs: [["Processor", "Intel Core i5"], ["Memory", "8 GB RAM"], ["Storage", "512 GB SSD"], ["Display", "15.6\" Full HD"], ["Colour", "Silver"]]
    },
    {
      id: "lenovo-legion-5", name: "Lenovo Legion 5 Gaming Laptop", brand: "Lenovo", category: "computers", type: "Laptop",
      price: 24999, was: 27999, stock: 3, badge: "Gaming",
      art: { kind: "laptop", color: "#7c3aed", body: "dark" },
      summary: "Serious gaming and creative power with a high-refresh screen.",
      specs: [["Processor", "AMD Ryzen 7"], ["Graphics", "NVIDIA GeForce RTX 4060"], ["Memory", "16 GB RAM"], ["Storage", "1 TB SSD"], ["Colour", "Grey"]]
    },
    {
      id: "apple-macbook-pro-14-m3", name: "Apple MacBook Pro 14\" (M3)", brand: "Apple", category: "computers", type: "Laptop",
      price: 32999, stock: 4, badge: "New",
      art: { kind: "laptop", color: "#475569", body: "dark" },
      summary: "Pro performance and a stunning Liquid Retina XDR display.",
      specs: [["Chip", "Apple M3"], ["Memory", "8 GB unified"], ["Storage", "512 GB SSD"], ["Display", "14.2\" Liquid Retina XDR"], ["Colour", "Grey"]]
    },
    {
      id: "lenovo-ideacentre-3", name: "Lenovo IdeaCentre 3 Desktop", brand: "Lenovo", category: "computers", type: "Desktop",
      price: 8999, was: 9999, stock: 6,
      art: { kind: "desktop", color: "#dc2626", body: "dark" },
      summary: "Compact home desktop with plenty of ports for the whole family.",
      specs: [["Processor", "Intel Core i5"], ["Memory", "8 GB RAM"], ["Storage", "512 GB SSD"], ["OS", "Windows 11 Home"], ["Colour", "Black"]]
    },
    {
      id: "dell-24-fhd-monitor", name: "Dell 24\" Full HD Monitor", brand: "Dell", category: "computers", type: "Monitor",
      price: 2499, was: 2899, stock: 14,
      art: { kind: "monitor", color: "#2563eb", body: "dark" },
      summary: "Thin-bezel IPS monitor with comfortable, flicker-free viewing.",
      specs: [["Size", "24\""], ["Resolution", "1920 × 1080"], ["Panel", "IPS"], ["Inputs", "HDMI, VGA"], ["Colour", "Black"]]
    },
    {
      id: "apple-iphone-15-pro", name: "Apple iPhone 15 Pro 256GB", brand: "Apple", category: "phones", type: "Smartphone",
      price: 25999, stock: 5, featured: true,
      art: { kind: "phone", color: "#64748b", body: "silver" },
      summary: "Titanium design, the A17 Pro chip and a pro camera system.",
      specs: [["Storage", "256 GB"], ["Display", "6.1\" Super Retina XDR"], ["Network", "5G"], ["Port", "USB-C"], ["Headphone jack", "No"], ["Colour", "Grey"]]
    },
    {
      id: "samsung-galaxy-s24-ultra",
      // demo gallery made from the drawing — replace with real photos
      image: "assets/products/demo/samsung-galaxy-s24-ultra-1.jpg", images: ["assets/products/demo/samsung-galaxy-s24-ultra-1.jpg", "assets/products/demo/samsung-galaxy-s24-ultra-2.jpg", "assets/products/demo/samsung-galaxy-s24-ultra-3.jpg", "assets/products/demo/samsung-galaxy-s24-ultra-4.jpg", "assets/products/demo/samsung-galaxy-s24-ultra-5.jpg", "assets/products/demo/samsung-galaxy-s24-ultra-6.jpg", "assets/products/demo/samsung-galaxy-s24-ultra-7.jpg"],
      name: "Samsung Galaxy S24 Ultra 256GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 24999, was: 27999, stock: 4, featured: true,
      art: { kind: "phone", color: "#334155", body: "dark" },
      summary: "Built-in S Pen, a 200 MP camera and Galaxy AI.",
      specs: [["Storage", "256 GB"], ["Display", "6.8\" Dynamic AMOLED 2X"], ["Network", "5G"], ["Main camera", "200 MP"], ["Headphone jack", "No"], ["Colour", "Black"]]
    },
    {
      id: "samsung-galaxy-a35", name: "Samsung Galaxy A35 5G 128GB", brand: "Samsung", category: "phones", type: "Smartphone",
      price: 6499, was: 7299, stock: 18,
      art: { kind: "phone", color: "#38bdf8", body: "silver" },
      summary: "Bright AMOLED screen and dependable cameras for everyday use.",
      specs: [["Storage", "128 GB"], ["Display", "6.6\" Super AMOLED"], ["Network", "5G, dual SIM"], ["Battery", "5000 mAh"], ["Headphone jack", "No"], ["Colour", "Blue"]]
    },
    {
      id: "xiaomi-redmi-13c", name: "Xiaomi Redmi 13C 128GB", brand: "Xiaomi", category: "phones", type: "Smartphone",
      price: 2299, was: 2599, stock: 40,
      art: { kind: "phone", color: "#22c55e", body: "dark" },
      summary: "Big-screen budget phone with a long-lasting battery.",
      specs: [["Storage", "128 GB"], ["Display", "6.74\" 90 Hz"], ["Network", "4G, dual SIM"], ["Battery", "5000 mAh"], ["Headphone jack", "3.5 mm"], ["Colour", "Green"]]
    },
    {
      id: "apple-ipad-air-11-m2", name: "Apple iPad Air 11\" (M2) 128GB", brand: "Apple", category: "phones", type: "Tablet",
      price: 14999, stock: 7,
      art: { kind: "tablet", color: "#8b5cf6", body: "silver" },
      summary: "Powerful, light and ready for Apple Pencil Pro.",
      specs: [["Chip", "Apple M2"], ["Storage", "128 GB"], ["Display", "11\" Liquid Retina"], ["Connectivity", "Wi-Fi"], ["Headphone jack", "No"], ["Colour", "Purple"]]
    },
    {
      id: "lenovo-tab-m10", name: "Lenovo Tab M10 (3rd Gen) 64GB", brand: "Lenovo", category: "phones", type: "Tablet",
      price: 2999, was: 3499, stock: 15,
      art: { kind: "tablet", color: "#64748b", body: "dark" },
      summary: "Family-friendly 10-inch tablet for streaming and homework.",
      specs: [["Storage", "64 GB"], ["Display", "10.1\" WUXGA"], ["Connectivity", "Wi-Fi"], ["Headphone jack", "3.5 mm"], ["Colour", "Grey"]]
    },
    {
      id: "apple-airpods-pro-2", name: "Apple AirPods Pro (2nd gen)", brand: "Apple", category: "accessories", type: "Earbuds",
      price: 4999, was: 5499, stock: 9, featured: true,
      art: { kind: "earbuds", color: "#0ea5e9", body: "white" },
      summary: "Active noise cancellation and personalised spatial audio.",
      specs: [["Noise cancelling", "Active (ANC)"], ["Case", "MagSafe, USB-C"], ["Water resistance", "IP54"], ["Colour", "White"]]
    },
    {
      id: "jbl-tune-520bt", name: "JBL Tune 520BT Headphones", brand: "JBL", category: "accessories", type: "Headphones",
      price: 899, was: 1099, stock: 20,
      art: { kind: "headphones", color: "#f97316", body: "dark" },
      summary: "Pure Bass sound with up to 57 hours of playtime.",
      specs: [["Connection", "Bluetooth 5.3"], ["Battery", "Up to 57 hours"], ["Mic", "Built-in for calls"], ["Colour", "Black"]]
    },
    {
      id: "samsung-25w-usb-c-charger", name: "Samsung 25W USB-C Fast Charger", brand: "Samsung", category: "accessories", type: "Charger",
      price: 349, stock: 55,
      art: { kind: "charger", color: "#1e293b", body: "white" },
      summary: "Super Fast Charging for Galaxy phones and other USB-C devices.",
      specs: [["Output", "25 W USB-C PD"], ["Plug", "SA 2-pin adapter included"], ["Colour", "White"]]
    },
    {
      id: "jbl-charge-5", name: "JBL Charge 5 Bluetooth Speaker", brand: "JBL", category: "electronics", type: "Speaker",
      price: 2999, was: 3499, stock: 10,
      art: { kind: "speaker", color: "#f97316" },
      summary: "Powerful, waterproof sound that also charges your phone.",
      specs: [["Connection", "Bluetooth"], ["Battery", "Up to 20 hours"], ["Water resistance", "IP67"], ["Colour", "Black"]]
    },
    {
      id: "apple-watch-se-40mm", name: "Apple Watch SE (2nd gen) 40mm", brand: "Apple", category: "electronics", type: "Smartwatch",
      price: 5499, was: 5999, stock: 8,
      art: { kind: "watch", color: "#0ea5e9", body: "silver" },
      summary: "Fitness, sleep and safety features in a light, comfortable watch.",
      specs: [["Case", "40 mm aluminium"], ["Connectivity", "GPS"], ["Tracking", "Heart rate, sleep, workouts"], ["Colour", "Silver"]]
    },
    {
      id: "canon-pixma-g3430", name: "Canon PIXMA G3430 Ink Tank Printer", brand: "Canon", category: "electronics", type: "Printer",
      price: 3299, was: 3699, stock: 7,
      art: { kind: "printer", color: "#dc2626", body: "light" },
      summary: "Refillable MegaTank printing, scanning and copying over Wi-Fi.",
      specs: [["Functions", "Print, scan, copy"], ["Connectivity", "Wi-Fi, USB"], ["Ink", "Refillable MegaTank"], ["Colour", "Black"]]
    },
    {
      id: "deli-scientific-calculator", name: "Deli Scientific Calculator (240 functions)", brand: "Deli", category: "office", type: "Calculator",
      price: 229, stock: 45,
      art: { kind: "calculator", color: "#cb0a3d", body: "dark" },
      summary: "Exam-friendly scientific calculator for high school and university.",
      specs: [["Functions", "240"], ["Display", "2-line"], ["Power", "Battery"], ["Colour", "Black"]]
    },
    /* ---------- home appliances ---------- */
    {
      id: "russell-hobbs-cordless-kettle", name: "Russell Hobbs 1.7L Cordless Kettle", brand: "Russell Hobbs", category: "appliances", type: "Kettle",
      price: 449, was: 549, stock: 25, featured: true,
      art: { kind: "kettle", color: "#334155" },
      summary: "Fast-boiling cordless kettle with a 360° base and automatic shut-off.",
      specs: [["Capacity", "1.7 L"], ["Power", "2200 W"], ["Features", "360° cordless base, auto shut-off, water window"], ["Colour", "Black"]]
    },
    {
      id: "philips-essential-airfryer", name: "Philips Essential Airfryer 4.1L", brand: "Philips", category: "appliances", type: "Air fryer",
      price: 1799, was: 2199, stock: 12, featured: true,
      art: { kind: "airfryer", color: "#e11d48", body: "dark" },
      summary: "Crispy results with little or no oil, and a basket that goes in the dishwasher.",
      specs: [["Capacity", "4.1 L"], ["Power", "1400 W"], ["Features", "Rapid Air, timer, dishwasher-safe basket"], ["Colour", "Black"]]
    },
    {
      id: "defy-20l-manual-microwave", name: "Defy 20L Manual Microwave", brand: "Defy", category: "appliances", type: "Microwave",
      price: 1199, stock: 9,
      art: { kind: "microwave", color: "#475569", body: "white" },
      summary: "Simple dial controls and five power levels for everyday heating and defrosting.",
      specs: [["Capacity", "20 L"], ["Power", "700 W"], ["Controls", "Manual dials, 5 power levels"], ["Colour", "White"]]
    },

    /* ---------- home & kitchen ---------- */
    {
      id: "tefal-easy-cook-clean-pan-28", name: "Tefal Easy Cook & Clean Frying Pan 28cm", brand: "Tefal", category: "home", type: "Frying pan",
      price: 399, was: 499, stock: 30,
      art: { kind: "pan", color: "#475569" },
      summary: "Non-stick frying pan that heats evenly and wipes clean in seconds.",
      specs: [["Diameter", "28 cm"], ["Material", "Aluminium, non-stick coating"], ["Hob", "Gas, electric and ceramic"], ["Colour", "Black"]]
    },
    {
      id: "locknlock-6-piece-storage-set", name: "LocknLock 6-Piece Food Storage Set", brand: "LocknLock", category: "home", type: "Food storage",
      price: 349, stock: 22,
      art: { kind: "container", color: "#0ea5e9" },
      summary: "Airtight, leak-proof containers with four-sided locking lids.",
      specs: [["Pieces", "6 (3 containers, 3 lids)"], ["Material", "BPA-free plastic"], ["Care", "Microwave, freezer and dishwasher safe"], ["Colour", "Clear"]]
    },
    {
      id: "bodum-chambord-french-press-1l", name: "Bodum Chambord French Press 1L", brand: "Bodum", category: "home", type: "Coffee maker",
      price: 699, was: 799, stock: 10,
      art: { kind: "frenchpress", color: "#94a3b8" },
      summary: "The classic French press: eight cups of rich coffee in four minutes.",
      specs: [["Capacity", "1 L (8 cups)"], ["Material", "Borosilicate glass, stainless steel"], ["Colour", "Silver"]]
    },

    /* ---------- fashion ---------- */
    {
      id: "adidas-grand-court-2-sneakers", name: "adidas Grand Court 2.0 Sneakers", brand: "adidas", category: "fashion", type: "Sneakers",
      price: 1199, was: 1499, stock: 20, featured: true,
      art: { kind: "sneaker", color: "#1e293b", body: "white" },
      summary: "Clean, court-inspired sneakers with a cushioned sole for all-day wear.",
      specs: [["Size", "UK 6, UK 7, UK 8, UK 9, UK 10, UK 11"], ["Upper", "Synthetic leather"], ["Sole", "Rubber"], ["Colour", "White"]]
    },
    {
      id: "levis-original-housemark-tee", name: "Levi's Original Housemark T-Shirt", brand: "Levi's", category: "fashion", type: "T-shirt",
      price: 499, stock: 35,
      art: { kind: "tshirt", color: "#1e3a8a" },
      summary: "A soft, everyday cotton tee with the small Housemark logo on the chest.",
      specs: [["Size", "S, M, L, XL, XXL"], ["Material", "100% cotton"], ["Fit", "Regular"], ["Colour", "Navy"]]
    },
    {
      id: "herschel-classic-backpack", name: "Herschel Classic Backpack 24L", brand: "Herschel", category: "fashion", type: "Backpack",
      price: 899, stock: 14,
      art: { kind: "backpack", color: "#b91c1c", body: "dark" },
      summary: "A simple, durable everyday backpack with a padded laptop sleeve.",
      specs: [["Capacity", "24 L"], ["Laptop sleeve", "Fits up to 15 inch"], ["Material", "Polyester"], ["Colour", "Black"]]
    },

    /* ---------- beauty & personal care ---------- */
    {
      id: "philips-3000-hair-dryer", name: "Philips 3000 Series Hair Dryer", brand: "Philips", category: "beauty", type: "Hair dryer",
      price: 499, was: 599, stock: 18,
      art: { kind: "hairdryer", color: "#7c3aed" },
      summary: "Fast drying with three heat and speed settings and a styling nozzle.",
      specs: [["Power", "1600 W"], ["Settings", "3 heat and speed"], ["Includes", "Concentrator nozzle"], ["Colour", "Purple"]]
    },
    {
      id: "oral-b-vitality-pro", name: "Oral-B Vitality Pro Electric Toothbrush", brand: "Oral-B", category: "beauty", type: "Electric toothbrush",
      price: 599, was: 749, stock: 16,
      art: { kind: "toothbrush", color: "#0ea5e9" },
      summary: "Round-head cleaning with three modes and a two-minute timer.",
      specs: [["Modes", "Daily clean, sensitive, whitening"], ["Timer", "2 minutes"], ["Battery", "Rechargeable"], ["Colour", "Blue"]]
    },
    {
      id: "nivea-express-hydration-lotion-400", name: "NIVEA Express Hydration Body Lotion 400ml", brand: "NIVEA", category: "beauty", type: "Body lotion",
      price: 109, stock: 60,
      art: { kind: "bottle", color: "#1d4ed8" },
      summary: "Light, quick-absorbing lotion that keeps normal skin moisturised for 48 hours.",
      specs: [["Volume", "400 ml"], ["Skin type", "Normal skin"]]
    },

    /* ---------- baby & toddler ---------- */
    {
      id: "pampers-premium-care-size-3", name: "Pampers Premium Care Nappies Size 3 (60 pack)", brand: "Pampers", category: "baby", type: "Nappies",
      price: 349, was: 399, stock: 40,
      art: { kind: "nappies", color: "#0d9488" },
      summary: "Soft, breathable nappies with up to 12 hours of dryness.",
      specs: [["Nappy size", "Size 3 (6–10 kg)"], ["Count", "60 nappies"]]
    },
    {
      id: "philips-avent-natural-bottle-260", name: "Philips Avent Natural Baby Bottle 260ml (2 pack)", brand: "Philips", category: "baby", type: "Baby bottle",
      price: 329, stock: 20,
      art: { kind: "babybottle", color: "#38bdf8" },
      summary: "A wide, breast-shaped teat makes it easy to combine breast and bottle feeding.",
      specs: [["Volume", "260 ml"], ["Age", "1 month+"], ["Material", "BPA-free polypropylene"]]
    },

    /* ---------- toys & games ---------- */
    {
      id: "lego-classic-medium-brick-box", name: "LEGO Classic Medium Creative Brick Box 10696", brand: "LEGO", category: "toys", type: "Building set",
      price: 699, was: 799, stock: 15, featured: true,
      art: { kind: "bricks", color: "#f59e0b" },
      summary: "484 bricks in 35 colours, with ideas to get young builders started.",
      specs: [["Pieces", "484"], ["Age", "4+ years"]]
    },
    {
      id: "jellycat-bartholomew-bear-medium", name: "Jellycat Bartholomew Bear (Medium)", brand: "Jellycat", category: "toys", type: "Plush toy",
      price: 899, stock: 8,
      art: { kind: "teddy", color: "#b45309" },
      summary: "A super-soft, huggable bear with a cheeky smile.",
      specs: [["Height", "28 cm"], ["Material", "Polyester plush"], ["Age", "Birth+"], ["Colour", "Brown"]]
    },
    {
      id: "rubiks-cube-3x3", name: "Rubik's Cube 3x3", brand: "Rubik's", category: "toys", type: "Puzzle",
      price: 249, stock: 30,
      art: { kind: "cube" },
      summary: "The original colour-matching puzzle, with a smooth turning mechanism.",
      specs: [["Age", "8+ years"]]
    },

    /* ---------- sport & fitness ---------- */
    {
      id: "adidas-tiro-league-football", name: "adidas Tiro League Football", brand: "adidas", category: "sport", type: "Football",
      price: 449, stock: 24,
      art: { kind: "ball", color: "#1e293b" },
      summary: "Durable, machine-stitched match and training ball.",
      specs: [["Ball size", "5"], ["Material", "TPU"], ["Colour", "White"]]
    },
    {
      id: "trojan-20kg-dumbbell-set", name: "Trojan 20kg Adjustable Dumbbell Set", brand: "Trojan", category: "sport", type: "Dumbbells",
      price: 999, was: 1299, stock: 6,
      art: { kind: "dumbbell", color: "#dc2626", body: "dark" },
      summary: "Two handles and plates you can set up for a full home workout.",
      specs: [["Weight", "20 kg in total"], ["Includes", "2 handles, plates and collars"], ["Colour", "Black"]]
    },
    {
      id: "trojan-yoga-mat-6mm", name: "Trojan Yoga Mat 6mm", brand: "Trojan", category: "sport", type: "Yoga mat",
      price: 299, stock: 18,
      art: { kind: "yogamat", color: "#7c3aed" },
      summary: "Cushioned, non-slip mat for yoga, stretching and floor exercises.",
      specs: [["Thickness", "6 mm"], ["Material", "TPE"], ["Colour", "Purple"]]
    },

    /* ---------- office & stationery ---------- */
    {
      id: "bic-cristal-pens-10", name: "BIC Cristal Ballpoint Pens (10 pack)", brand: "BIC", category: "office", type: "Pens",
      price: 59, stock: 80,
      art: { kind: "pens", color: "#2563eb" },
      summary: "The classic clear-barrel ballpoint that writes smoothly every time.",
      specs: [["Point", "1.0 mm medium"], ["Ink", "Blue"], ["Count", "10 pens"], ["Colour", "Blue"]]
    },
    {
      id: "croxley-a4-hardcover-notebook", name: "Croxley A4 Hardcover Notebook (192 pages)", brand: "Croxley", category: "office", type: "Notebook",
      price: 79, stock: 50,
      art: { kind: "notebook", color: "#4f46e5" },
      summary: "A sturdy hardcover notebook for school, work and meeting notes.",
      specs: [["Paper size", "A4"], ["Pages", "192"], ["Ruling", "Feint and margin"]]
    },

    /* ---------- DIY & tools ---------- */
    {
      id: "bosch-easydrill-1200", name: "Bosch EasyDrill 1200 Cordless Drill Driver 12V", brand: "Bosch", category: "diy", type: "Drill",
      price: 1599, was: 1899, stock: 7,
      art: { kind: "drill", color: "#16a34a" },
      summary: "Light, cordless drill driver for screwing and drilling around the home.",
      specs: [["Voltage", "12 V"], ["Battery", "1.5 Ah lithium-ion"], ["Includes", "Battery and charger"], ["Colour", "Green"]]
    },
    {
      id: "stanley-19-inch-toolbox", name: "Stanley 19 inch Toolbox", brand: "Stanley", category: "diy", type: "Toolbox",
      price: 349, stock: 12,
      art: { kind: "toolbox", color: "#facc15" },
      summary: "Tough plastic toolbox with a removable tray and metal latches.",
      specs: [["Length", "48 cm"], ["Material", "Plastic, metal latches"], ["Colour", "Black"]]
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
    calculator: function (c, b, s) {
      var keys = "";
      for (var r = 0; r < 5; r++) {
        for (var k = 0; k < 4; k++) {
          keys += '<rect x="' + (120 + k * 22) + '" y="' + (98 + r * 22) + '" width="16" height="15" rx="3" fill="' + (k === 3 && r > 2 ? c : "#fff") + '" opacity="' + (k === 3 && r > 2 ? 1 : 0.22) + '"/>';
        }
      }
      return '<rect x="106" y="22" width="108" height="196" rx="14" fill="' + b + '"/>' +
        '<rect x="118" y="36" width="84" height="44" rx="6" fill="' + s + '"/>' + keys;
    },
    printer: function (c, b) {
      return '<path d="M104 92V36H216V92" fill="#fff" stroke="#0f172a" stroke-opacity=".15" stroke-width="2"/>' +
        '<path d="M120 52H200M120 64H184" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="52" y="88" width="216" height="96" rx="12" fill="' + b + '" stroke="#0f172a" stroke-opacity=".12" stroke-width="2"/>' +
        '<rect x="88" y="150" width="144" height="10" rx="5" fill="#0f172a" opacity=".55"/>' +
        '<rect x="214" y="102" width="36" height="22" rx="4" fill="' + c + '"/>';
    },

    /* ---- home, fashion, beauty, baby, toys, sport, office, DIY ---- */
    kettle: function (c, b, s) {
      return '<path d="M202 80Q248 84 246 132Q244 168 210 178" fill="none" stroke="' + c + '" stroke-width="14" stroke-linecap="round"/>' +
        '<path d="M118 86L82 66L86 92L116 110Z" fill="' + c + '"/>' +
        '<path d="M112 192L122 70Q124 58 136 58H188Q200 58 202 70L212 192Z" fill="' + s + '"/>' +
        '<rect x="128" y="46" width="68" height="16" rx="8" fill="#0f172a" opacity=".8"/>' +
        '<rect x="132" y="96" width="10" height="72" rx="5" fill="#fff" opacity=".35"/>' +
        '<rect x="92" y="194" width="140" height="16" rx="8" fill="#0f172a" opacity=".85"/>';
    },
    airfryer: function (c, b, s) {
      return '<rect x="96" y="28" width="128" height="180" rx="34" fill="' + b + '"/>' +
        '<rect x="114" y="46" width="92" height="32" rx="10" fill="#fff" opacity=".12"/>' +
        '<circle cx="160" cy="62" r="8" fill="' + c + '"/>' +
        '<path d="M100 112H220V178Q220 204 194 204H126Q100 204 100 178Z" fill="#000" opacity=".22"/>' +
        '<rect x="132" y="140" width="56" height="18" rx="9" fill="' + s + '"/>' +
        '<rect x="110" y="208" width="100" height="8" rx="4" fill="#000" opacity=".14"/>';
    },
    microwave: function (c, b, s) {
      return '<rect x="36" y="54" width="248" height="142" rx="12" fill="' + b + '" stroke="#0f172a" stroke-opacity=".14" stroke-width="2"/>' +
        '<rect x="52" y="70" width="170" height="110" rx="6" fill="' + s + '"/>' +
        '<path d="M66 84L110 84" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="234" y="76" width="36" height="12" rx="3" fill="#0f172a" opacity=".75"/>' +
        '<circle cx="252" cy="118" r="11" fill="#0f172a" opacity=".22"/><circle cx="252" cy="152" r="11" fill="#0f172a" opacity=".22"/>' +
        '<rect x="48" y="196" width="24" height="7" rx="2" fill="#0f172a" opacity=".3"/><rect x="248" y="196" width="24" height="7" rx="2" fill="#0f172a" opacity=".3"/>';
    },
    pan: function (c, b, s) {
      return '<rect x="198" y="113" width="108" height="16" rx="8" fill="#0f172a"/>' +
        '<circle cx="292" cy="121" r="3.5" fill="#fff" opacity=".5"/>' +
        '<circle cx="118" cy="121" r="88" fill="' + b + '"/>' +
        '<circle cx="118" cy="121" r="75" fill="' + s + '"/>' +
        '<circle cx="118" cy="121" r="75" fill="#000" opacity=".3"/>' +
        '<path d="M70 96A54 54 0 0 1 118 67" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="7" stroke-linecap="round"/>';
    },
    container: function (c) {
      var box = function (x, y, w, h) {
        return '<rect x="' + x + '" y="' + (y + 14) + '" width="' + w + '" height="' + h + '" rx="12" fill="#e2e8f0" fill-opacity=".85" stroke="#94a3b8" stroke-width="2"/>' +
          '<rect x="' + (x - 6) + '" y="' + y + '" width="' + (w + 12) + '" height="20" rx="8" fill="' + c + '"/>' +
          '<rect x="' + (x + w / 2 - 14) + '" y="' + (y + 16) + '" width="28" height="12" rx="3" fill="' + c + '"/>';
      };
      return box(66, 118, 188, 82) + box(98, 50, 124, 58);
    },
    frenchpress: function (c) {
      return '<path d="M208 84H238V186H208" fill="none" stroke="#0f172a" stroke-width="12" stroke-linejoin="round"/>' +
        '<rect x="157" y="18" width="6" height="44" fill="#475569"/><circle cx="160" cy="18" r="9" fill="#0f172a"/>' +
        '<path d="M112 62L96 54L104 72Z" fill="#0f172a"/>' +
        '<rect x="110" y="54" width="100" height="18" rx="6" fill="#0f172a"/>' +
        '<rect x="118" y="72" width="84" height="132" rx="6" fill="#bae6fd" fill-opacity=".4" stroke="#94a3b8" stroke-width="2"/>' +
        '<rect x="121" y="118" width="78" height="84" rx="4" fill="#7c2d12" opacity=".88"/>' +
        '<rect x="110" y="200" width="100" height="14" rx="5" fill="' + c + '"/>';
    },
    sneaker: function (c, b) {
      return '<path d="M40 172Q36 118 70 104Q98 94 118 70L150 62Q160 60 164 70Q176 102 214 116L268 132Q292 140 290 172Z" fill="' + b + '" stroke="#0f172a" stroke-opacity=".14" stroke-width="2"/>' +
        '<path d="M40 128Q36 150 40 170H56Q52 148 56 128Z" fill="' + c + '"/>' +
        '<path d="M62 152Q150 132 236 152" fill="none" stroke="' + c + '" stroke-width="9" stroke-linecap="round"/>' +
        '<path d="M126 82L150 94M136 74L160 86M118 92L142 104" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M34 170H286Q296 170 294 182L292 188Q290 196 280 196H44Q30 196 30 184V176Q30 170 34 170Z" fill="#f8fafc" stroke="#0f172a" stroke-opacity=".16" stroke-width="2"/>' +
        '<path d="M44 184H284" stroke="#0f172a" stroke-opacity=".1" stroke-width="3"/>';
    },
    tshirt: function (c, b, s) {
      return '<path d="M112 34Q160 58 208 34L272 66L248 114L222 102V216H98V102L72 114L48 66Z" fill="' + s + '"/>' +
        '<path d="M124 38Q160 70 196 38" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M58 84L80 100M262 84L240 100" stroke="#000" stroke-opacity=".15" stroke-width="4" stroke-linecap="round"/>';
    },
    backpack: function (c, b) {
      return '<path d="M136 48V34Q136 24 146 24H174Q184 24 184 34V48" fill="none" stroke="#0f172a" stroke-width="8"/>' +
        '<rect x="84" y="72" width="16" height="112" rx="8" fill="#0f172a" opacity=".55"/><rect x="220" y="72" width="16" height="112" rx="8" fill="#0f172a" opacity=".55"/>' +
        '<rect x="96" y="40" width="128" height="178" rx="36" fill="' + b + '"/>' +
        '<rect x="146" y="86" width="28" height="18" rx="4" fill="' + c + '"/>' +
        '<rect x="114" y="132" width="92" height="68" rx="16" fill="#000" opacity=".2"/>' +
        '<path d="M118 150H202" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>';
    },
    hairdryer: function (c, b, s) {
      return '<path d="M160 150L184 226Q186 232 194 232H208Q216 232 214 224L198 150Z" fill="' + s + '"/>' +
        '<rect x="34" y="90" width="32" height="60" rx="6" fill="#0f172a" opacity=".85"/>' +
        '<path d="M70 70H200A50 50 0 0 1 200 170H70Q58 170 58 158V82Q58 70 70 70Z" fill="' + s + '"/>' +
        '<circle cx="204" cy="120" r="30" fill="#000" opacity=".16"/>' +
        '<path d="M190 106H218M190 120H218M190 134H218" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="186" y="180" width="9" height="20" rx="4.5" fill="#fff" opacity=".6"/>';
    },
    toothbrush: function (c) {
      var w = 'fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"';
      return '<ellipse cx="160" cy="220" rx="48" ry="10" fill="#0f172a" opacity=".12"/>' +
        '<rect x="154" y="58" width="12" height="34" ' + w + '/>' +
        '<rect x="146" y="18" width="28" height="46" rx="12" ' + w + '/>' +
        '<rect x="151" y="24" width="18" height="24" rx="5" fill="' + c + '" opacity=".55"/>' +
        '<rect x="136" y="86" width="48" height="130" rx="22" ' + w + '/>' +
        '<rect x="149" y="106" width="22" height="64" rx="11" fill="' + c + '"/>' +
        '<circle cx="160" cy="126" r="6" fill="#fff"/>';
    },
    bottle: function (c, b, s) {
      return '<path d="M168 22H198" stroke="#0f172a" stroke-width="7" stroke-linecap="round" opacity=".8"/>' +
        '<rect x="148" y="16" width="24" height="14" rx="3" fill="#0f172a" opacity=".8"/>' +
        '<rect x="146" y="28" width="28" height="30" rx="4" fill="#e2e8f0"/>' +
        '<rect x="112" y="54" width="96" height="166" rx="26" fill="' + s + '"/>' +
        '<rect x="124" y="104" width="72" height="66" rx="8" fill="#fff" opacity=".88"/>' +
        '<path d="M138 124H182M138 138H172M138 152H178" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>';
    },
    nappies: function (c, b, s) {
      return '<rect x="70" y="38" width="180" height="174" rx="22" fill="' + s + '"/>' +
        '<rect x="128" y="52" width="64" height="12" rx="6" fill="#fff" opacity=".4"/>' +
        '<rect x="96" y="94" width="128" height="94" rx="14" fill="#fff" opacity=".92"/>' +
        '<path d="M126 118H194V136Q194 170 160 170Q126 170 126 136Z" fill="' + c + '" fill-opacity=".2" stroke="' + c + '" stroke-width="3"/>' +
        '<path d="M126 126H194" stroke="' + c + '" stroke-width="3"/>';
    },
    babybottle: function (c) {
      return '<path d="M148 52Q148 22 160 22Q172 22 172 52Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>' +
        '<rect x="130" y="48" width="60" height="24" rx="7" fill="' + c + '"/>' +
        '<path d="M138 72H182Q198 72 198 88V198Q198 216 180 216H140Q122 216 122 198V88Q122 72 138 72Z" fill="#e0f2fe" fill-opacity=".75" stroke="#94a3b8" stroke-width="2"/>' +
        '<path d="M124 132H196V198Q196 214 180 214H140Q124 214 124 198Z" fill="#fff"/>' +
        '<path d="M184 100H196M184 120H196M184 140H196M184 160H196" stroke="' + c + '" stroke-width="2.5"/>';
    },
    bricks: function (c) {
      var brick = function (x, y, n, col) {
        var studs = "";
        for (var i = 0; i < n; i++) studs += '<rect x="' + (x + 9 + i * 30) + '" y="' + (y - 11) + '" width="18" height="13" rx="3" fill="' + col + '"/>';
        return studs + '<rect x="' + x + '" y="' + y + '" width="' + n * 30 + '" height="46" rx="5" fill="' + col + '"/>' +
          '<rect x="' + x + '" y="' + (y + 34) + '" width="' + n * 30 + '" height="12" rx="5" fill="#000" opacity=".14"/>';
      };
      return brick(50, 160, 4, c) + brick(170, 160, 3, "#2563eb") + brick(110, 102, 4, "#dc2626") + brick(140, 44, 2, "#16a34a");
    },
    teddy: function (c) {
      var light = mix(c, 0.45);
      return '<circle cx="112" cy="62" r="22" fill="' + c + '"/><circle cx="208" cy="62" r="22" fill="' + c + '"/>' +
        '<circle cx="112" cy="62" r="11" fill="' + light + '"/><circle cx="208" cy="62" r="11" fill="' + light + '"/>' +
        '<ellipse cx="96" cy="168" rx="20" ry="30" fill="' + c + '"/><ellipse cx="224" cy="168" rx="20" ry="30" fill="' + c + '"/>' +
        '<ellipse cx="160" cy="180" rx="58" ry="46" fill="' + c + '"/>' +
        '<ellipse cx="160" cy="186" rx="32" ry="26" fill="' + light + '"/>' +
        '<circle cx="128" cy="220" r="17" fill="' + c + '"/><circle cx="192" cy="220" r="17" fill="' + c + '"/>' +
        '<circle cx="160" cy="94" r="50" fill="' + c + '"/>' +
        '<ellipse cx="160" cy="112" rx="23" ry="17" fill="' + light + '"/>' +
        '<circle cx="142" cy="86" r="5" fill="#0f172a"/><circle cx="178" cy="86" r="5" fill="#0f172a"/>' +
        '<ellipse cx="160" cy="105" rx="7" ry="5" fill="#0f172a"/>';
    },
    cube: function () {
      var cols = ["#dc2626", "#f8fafc", "#2563eb", "#facc15", "#16a34a", "#f97316", "#2563eb", "#dc2626", "#facc15"], t = "";
      for (var i = 0; i < 9; i++) t += '<rect x="' + (91 + (i % 3) * 47) + '" y="' + (51 + Math.floor(i / 3) * 47) + '" width="42" height="42" rx="7" fill="' + cols[i] + '"/>';
      return '<rect x="82" y="42" width="156" height="156" rx="16" fill="#0f172a"/>' + t;
    },
    ball: function (c, b, s) {
      var clip = s.slice(5, -1) + "b", P = function (cx, cy, r, rot) {
        var pts = [];
        for (var k = 0; k < 5; k++) { var a = (rot + k * 72) * Math.PI / 180; pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1)); }
        return pts.join(" ");
      };
      var outer = "", lines = "";
      for (var k = 0; k < 5; k++) {
        var a = (-90 + k * 72) * Math.PI / 180, o = (-54 + k * 72) * Math.PI / 180;
        lines += '<path d="M' + (160 + 26 * Math.cos(a)).toFixed(1) + " " + (120 + 26 * Math.sin(a)).toFixed(1) + "L" + (160 + 62 * Math.cos(a)).toFixed(1) + " " + (120 + 62 * Math.sin(a)).toFixed(1) + '"/>';
        outer += '<polygon points="' + P(160 + 84 * Math.cos(o), 120 + 84 * Math.sin(o), 24, -54 + k * 72 + 180) + '"/>';
      }
      return '<defs><clipPath id="' + clip + '"><circle cx="160" cy="120" r="88"/></clipPath></defs>' +
        '<circle cx="160" cy="120" r="88" fill="#f8fafc"/>' +
        '<g clip-path="url(#' + clip + ')" fill="' + c + '">' + outer + "</g>" +
        '<g stroke="#0f172a" stroke-opacity=".5" stroke-width="3">' + lines + "</g>" +
        '<polygon points="' + P(160, 120, 26, -90) + '" fill="' + c + '"/>' +
        '<circle cx="160" cy="120" r="88" fill="none" stroke="#0f172a" stroke-opacity=".18" stroke-width="2"/>';
    },
    dumbbell: function (c, b) {
      return '<rect x="66" y="112" width="188" height="16" rx="6" fill="#94a3b8"/>' +
        '<rect x="52" y="104" width="16" height="32" rx="4" fill="#64748b"/><rect x="252" y="104" width="16" height="32" rx="4" fill="#64748b"/>' +
        '<rect x="68" y="64" width="28" height="112" rx="7" fill="' + b + '"/><rect x="98" y="80" width="18" height="80" rx="5" fill="' + b + '"/>' +
        '<rect x="224" y="64" width="28" height="112" rx="7" fill="' + b + '"/><rect x="204" y="80" width="18" height="80" rx="5" fill="' + b + '"/>' +
        '<rect x="134" y="109" width="52" height="22" rx="6" fill="' + c + '"/>';
    },
    yogamat: function (c, b, s) {
      return '<rect x="26" y="172" width="200" height="20" rx="4" fill="' + s + '"/>' +
        '<rect x="26" y="172" width="200" height="20" rx="4" fill="#000" opacity=".12"/>' +
        '<circle cx="232" cy="140" r="52" fill="' + s + '"/>' +
        '<circle cx="232" cy="140" r="39" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/>' +
        '<circle cx="232" cy="140" r="25" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/>' +
        '<circle cx="232" cy="140" r="11" fill="#000" opacity=".22"/>';
    },
    pens: function (c) {
      var out = "";
      [0, 1, 2].forEach(function (i) {
        var x = 112 + i * 38;
        out += '<path d="M' + (x + 4) + ' 190L' + (x + 11) + ' 216L' + (x + 18) + ' 190Z" fill="#94a3b8"/>' +
          '<rect x="' + x + '" y="44" width="22" height="148" rx="6" fill="#e0f2fe" fill-opacity=".8" stroke="#94a3b8" stroke-width="2"/>' +
          '<rect x="' + (x + 9) + '" y="64" width="4" height="122" fill="' + c + '" opacity=".75"/>' +
          '<rect x="' + (x - 1) + '" y="24" width="24" height="44" rx="6" fill="' + c + '"/>';
      });
      return '<g transform="rotate(-10 160 120)">' + out + "</g>";
    },
    notebook: function (c, b, s) {
      return '<rect x="236" y="34" width="10" height="178" rx="3" fill="#e2e8f0"/>' +
        '<rect x="92" y="28" width="150" height="190" rx="8" fill="' + s + '"/>' +
        '<rect x="92" y="28" width="24" height="190" rx="6" fill="#000" opacity=".2"/>' +
        '<rect x="136" y="62" width="84" height="40" rx="5" fill="#fff" opacity=".9"/>' +
        '<path d="M148 76H208M148 88H190" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="214" y="28" width="7" height="190" fill="#0f172a" opacity=".45"/>';
    },
    drill: function (c, b, s) {
      return '<path d="M122 126L104 196H156L168 126Z" fill="' + s + '"/>' +
        '<path d="M126 140L114 190H146L156 140Z" fill="#0f172a" opacity=".55"/>' +
        '<rect x="86" y="190" width="96" height="32" rx="8" fill="#0f172a"/>' +
        '<rect x="160" y="130" width="12" height="24" rx="4" fill="#0f172a"/>' +
        '<path d="M70 70H214Q234 70 234 90V110Q234 130 214 130H120L70 118Z" fill="' + s + '"/>' +
        '<path d="M86 86V110M98 86V110M110 86V110" stroke="#000" stroke-opacity=".25" stroke-width="4" stroke-linecap="round"/>' +
        '<rect x="234" y="86" width="30" height="30" rx="6" fill="#0f172a"/>' +
        '<rect x="264" y="96" width="38" height="10" rx="3" fill="#94a3b8"/>';
    },
    bag: function (c, b, s) {
      return '<path d="M128 84V62Q128 34 160 34Q192 34 192 62V84" fill="none" stroke="#0f172a" stroke-opacity=".75" stroke-width="9" stroke-linecap="round"/>' +
        '<path d="M86 74H234L248 206Q249 216 238 216H82Q71 216 72 206Z" fill="' + s + '"/>' +
        '<circle cx="128" cy="96" r="6" fill="#0f172a" opacity=".5"/><circle cx="192" cy="96" r="6" fill="#0f172a" opacity=".5"/>' +
        '<path d="M86 74H234L236 92H84Z" fill="#fff" opacity=".18"/>';
    },
    toolbox: function (c) {
      return '<path d="M120 82V58Q120 48 130 48H190Q200 48 200 58V82" fill="none" stroke="#0f172a" stroke-width="12"/>' +
        '<rect x="50" y="98" width="220" height="114" rx="10" fill="#1e293b"/>' +
        '<path d="M56 78H264Q272 78 272 86V120H48V86Q48 78 56 78Z" fill="' + c + '"/>' +
        '<rect x="78" y="110" width="20" height="26" rx="3" fill="' + c + '"/><rect x="222" y="110" width="20" height="26" rx="3" fill="' + c + '"/>' +
        '<path d="M64 168H256" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>';
    }
  };

  MABS.art = function (a) {
    a = a || {};
    var id = "mg" + (++seq);
    var c = a.color || "#2563eb";
    var b = BODY[a.body || "dark"];
    var draw = DRAW[a.kind] || DRAW.bag; // unknown kinds get a shopping bag
    return '<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + mix(c, 0.35) + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>' +
      draw(c, b, "url(#" + id + ")", a) + "</svg>";
  };
})();
