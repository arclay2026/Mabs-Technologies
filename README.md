# Mabs Technologies — Online Store

An e-commerce web app for Mabs Technologies, selling computers, phones &
tablets, accessories and electronics. The shop is HTML/CSS/JS with no build
step; the backend (orders, stock, admin panel) is PHP + MySQL, so the live
shop needs PHP hosting such as Hostinger. Without PHP (e.g. on GitHub
Pages) the shop still runs from its built-in catalogue.

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

The cart drawer, wishlist and header search work on every page. Cart and
wishlist are saved in the browser's `localStorage`, along with a copy of
each placed order for the Orders page (until customer accounts exist).

- `admin/` — the admin panel (see Backend below).

## Files

- `js/catalog.js` — store config (contact details, backend address) and the
  built-in catalogue the shop falls back to without the backend. Once the
  backend is live, products, prices, stock and delivery charges are managed
  in the admin panel instead.
  Products show a drawn illustration until they have a photo
  (`assets/products/<file>.jpg`).
- `js/api.js` — connects the shop to the backend (see Backend below).
- `api/` — the backend: `catalogue.php` and `orders.php` (the shop's API),
  `_store.php` (order rules and emails), `_bootstrap.php` (database
  connection), `config.sample.php` (settings template).
- `database/schema.sql`, `database/seed.sql` — the MySQL tables and the
  starting catalogue (installed for you by `admin/setup.php`).
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

1. Set up the backend on PHP hosting (below), then manage products, prices
   and stock in the admin panel.
2. Fill in `email`, `whatsapp`, `phone`, `address` and `hours` in
   `MABS.store` (`js/catalog.js`) to show them in the footer.
3. For online card payments, add a payment gateway (e.g. PayFast, Yoco,
   Ozow) to checkout.

## Backend (PHP + MySQL)

**What it does**

- `api/catalogue.php` — the shop loads products, stock, prices, brands,
  departments and delivery charges from here (cached for 5 minutes per tab)
- `api/orders.php` — checkout sends orders here. The server rechecks stock,
  prices every line from the database (prices sent by the browser are
  ignored), works out the delivery fee, saves the order and reduces stock in
  one transaction, so two customers can never buy the same last unit. It
  then emails the order to the shop and a confirmation to the customer.
  Limits: 50 of an item per order, 8 orders per visitor per 10 minutes.
- `admin/` — password-protected admin panel:
  - **Orders**: new/open/completed tabs, search, sales totals, low-stock
    alert; each order's items, customer and address, status (Placed →
    Confirmed → Out for delivery → Delivered, or Ready for collection →
    Collected), payment status, and Cancel (puts the items back in stock)
  - **Products**: quick-edit prices, sale prices, stock and visibility in one
    table; add, edit, hide or delete products
  - **Settings**: courier fee, free-delivery threshold, in-store collection,
    and your password
- If the backend can't be reached, the shop falls back to the built-in
  catalogue and orders are kept on the customer's device, with WhatsApp /
  email buttons to send them to the shop (when those are set in `catalog.js`).

**Security**: database passwords live only in `api/config.php`, which is
never committed (`.gitignore`); admin passwords are hashed; every admin form
has a CSRF token; sign-in locks for 15 minutes after 5 wrong passwords;
sessions expire after 4 hours idle; IP addresses are stored only as salted
hashes; `.htaccess` files block direct access to `api/_*.php`,
`api/config.php`, `admin/_*.php` and `database/`.

**Setting it up (e.g. Hostinger)**

1. Upload all the files to `public_html` (File Manager or Git deploy).
2. In the control panel, create a MySQL database and user (Databases →
   MySQL Databases). Note the database name, user and password.
3. Copy `api/config.sample.php` to `api/config.php` and fill in the
   database details, a long random `secret`, the email addresses for order
   emails, and your site address.
4. Open `https://your-domain/admin/setup.php`. It checks the connection,
   installs the tables and the starting catalogue, and creates your admin
   account (both steps ask for the `secret` as a setup key). Then sign in at
   `https://your-domain/admin/`.

Requires PHP 8.1+ with PDO MySQL, and MySQL 5.7+ or MariaDB 10.3+.
To change the database later, add the change to `database/schema.sql` and
run the matching `ALTER TABLE` in phpMyAdmin.

## Hosting on GitHub Pages

The site is published from the `main` branch root. To switch it on, open
the repo's **Settings → Pages**, set **Source** to *Deploy from a branch*,
choose `main` and `/ (root)`, and save. It goes live at
https://arclay2026.github.io/Mabs-Technologies/ a minute or two later and
updates on every push to `main`. All links are relative, so it also works
unchanged on a custom domain. The empty `.nojekyll` file tells Pages to
serve the files as they are, without running them through Jekyll.

GitHub Pages can't run PHP, so there the shop uses its built-in catalogue
and the admin panel doesn't work — it's a preview. For the real shop, use
PHP hosting. (If the shop pages stay on Pages and the API lives elsewhere,
set `api` in `js/catalog.js` to the API's full address and add the Pages
address to `cors_origins` in `api/config.php`.)

## Running locally

Shop only (built-in catalogue):

```bash
python3 -m http.server 8000
```

With the backend (needs PHP and a local MySQL/MariaDB database, plus
`api/config.php`):

```bash
php -S localhost:8000
```

Then open `http://localhost:8000/` (and `/admin/setup.php` the first time).
