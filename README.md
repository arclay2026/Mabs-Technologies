# Mabs Technologies — Online Store

An e-commerce web app for Mabs Technologies, selling computers, phones &
tablets, accessories and electronics. Static HTML/CSS/JS with no build
step — host it on any static web host (Hostinger, GitHub Pages, Netlify…).

## Pages

- `index.html` — storefront: hero, category tiles, "on sale" rail and the
  full shop with search, category/brand/price/stock filters and sorting.
  Filters are kept in the URL, e.g. `index.html?cat=computers&type=Laptop&brand=HP#shop`.
- `product.html?id=<product-id>` — product details, specs, quantity,
  add to cart / buy now, wishlist and related products.
- `checkout.html` — contact details, courier delivery or in-store
  collection, payment choice (EFT or pay on delivery/collection), order
  summary with VAT, and an order confirmation.

- `orders.html` — My Account → Orders: orders placed from this browser,
  filtered by period, with a progress tracker and "Order again".
- `wishlist.html` — My Account → Wishlist: saved products with Add to cart,
  Remove, Add all to cart and a shareable link (`wishlist.html?shared=…`).

The cart drawer, wishlist and header search work on every page. Cart,
wishlist and placed orders are saved in the browser's `localStorage`.

## Files

- `js/catalog.js` — **edit this to run the shop**: store config (contact
  details, delivery fee, free-delivery threshold, collection) and the
  product list (name, brand, category, price, previous price, stock, specs).
  Products show a drawn illustration until you add a photo with
  `image: "assets/products/<file>.jpg"`.
- `js/app.js` — cart, wishlist, header ("Shop by department" menu, live
  search, mobile menu), footer, cart drawer, product cards.
- `js/shop.js`, `js/product.js`, `js/checkout.js`, `js/orders.js`,
  `js/wishlist.js` — page scripts; `js/account.js` — the shared My Account menu.
- `css/mabs.css` — all styling.
- `assets/logo.svg` / `assets/logo-light.svg` — the official logo trimmed
  for the site (dark wordmark for light backgrounds, light wordmark for
  dark ones); `assets/favicon.svg` is the three blue strokes on their own.
  The original uploads are kept in `assets/brand/`.
- `assets/brands/` — partner logos for the "Featured brands" strip,
  trimmed to their edges, in each brand's own colour (originals in
  `assets/brands/original/`; Apple uses black since its upload was white).
  A logo becomes a link to that brand's products once the catalogue has some.
  Product cards use the slate (#22313a) copies in `assets/brands/dark/`;
  when adding a logo, add its dark copy there too.
  To add one, drop the SVG in and add it to `MABS.brands` in `js/catalog.js`.

## Before going live

1. Fill in `email`, `whatsapp`, `phone`, `address` and `hours` in
   `MABS.store` (`js/catalog.js`). With `whatsapp` and/or `email` set, the
   confirmation screen lets customers send their order straight to the shop.
   Without them, orders only exist in the customer's own browser.
2. Replace the sample catalogue (products, prices, stock) with real stock.
3. For online card payments and central order storage, replace
   `submitOrder` in `js/checkout.js` with a call to a backend or payment
   gateway (e.g. PayFast, Yoco, Ozow).

## Database (Supabase)

The store's database lives in Supabase. `supabase/migrations/` holds the
schema and the starting catalogue; the Supabase GitHub integration applies
any new migration to the production database when it's merged into `main`
(never edit an applied migration — add a new one).

- `categories`, `brands`, `products`, `store_settings` — the catalogue and
  delivery settings; anyone can read them, only the dashboard can change them
- `orders`, `order_items` — created only through `place_order(...)`, which
  rechecks stock, prices every line from the database, works out the
  delivery fee, saves the order and reduces stock in one step; signed-in
  customers can read only their own orders
- Row-level security is on for every table

Until the site is connected (needs the project URL and anon key), the shop
still runs from `js/catalog.js`.

## Hosting on GitHub Pages

The site is published from the `main` branch root. To switch it on, open
the repo's **Settings → Pages**, set **Source** to *Deploy from a branch*,
choose `main` and `/ (root)`, and save. It goes live at
https://arclay2026.github.io/Mabs-Technologies/ a minute or two later and
updates on every push to `main`. All links are relative, so it also works
unchanged on a custom domain. The empty `.nojekyll` file tells Pages to
serve the files as they are, without running them through Jekyll.

## Running locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.
