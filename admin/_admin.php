<?php
/* =====================================================================
   MABS TECHNOLOGIES — ADMIN PANEL HELPERS
   Sessions, sign-in checks, CSRF protection and the page layout.
   Never served directly (see admin/.htaccess).
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../api/_reviews.php';

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
     . "img-src 'self' data: https:; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

const SESSION_IDLE = 4 * 3600; // sign out after 4 hours without activity

// the admin panel only works over HTTPS (except on your own computer)
$https = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
$local = PHP_SAPI === 'cli-server' || in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1', '::1'], true);
if (!$https && !$local && isset($_SERVER['HTTP_HOST'])) {
    header('Location: https://' . $_SERVER['HTTP_HOST'] . ($_SERVER['REQUEST_URI'] ?? '/admin/'), true, 301);
    exit;
}
if ($https) header('Strict-Transport-Security: max-age=31536000');

// sessions live in their own folder next to (not inside) the website when the host allows it,
// so other sites' clean-ups can't sign you out early, and they last as long as SESSION_IDLE
$sessionDir = dirname((string) realpath(MABS_ROOT)) . '/mabs-sessions';
if ((is_dir($sessionDir) || @mkdir($sessionDir, 0700)) && is_writable($sessionDir)) session_save_path($sessionDir);
ini_set('session.gc_maxlifetime', (string) SESSION_IDLE);
ini_set('session.use_strict_mode', '1');
session_name('mabs_admin');
// Lax so links in order emails open signed in; every change still needs the CSRF token
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function h($s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** a text value from the address bar ("" when missing or not text, e.g. ?tab[]=x) */
function q(string $key): string
{
    $v = $_GET[$key] ?? '';
    return is_string($v) ? $v : '';
}

function redirect(string $to): never
{
    header('Location: ' . $to, true, 303);
    exit;
}

/* ---------- CSRF: every form carries a per-session token ---------- */

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . h(csrf_token()) . '">';
}

function is_post(): bool
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') return false;
    // a save bigger than the server's limit arrives empty; say so instead of "expired"
    if (!$_POST && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        flash('That was more than the server accepts in one save (' . ini_get('post_max_size') . '). Add fewer or smaller photos at a time.', 'error');
        redirect($_SERVER['REQUEST_URI'] ?? 'index.php');
    }
    if (!hash_equals(csrf_token(), (string) ($_POST['csrf'] ?? ''))) {
        http_response_code(400);
        exit('This form has expired. Go back, refresh the page and try again.');
    }
    return true;
}

/* ---------- messages shown once after a redirect ---------- */

function flash(string $message, string $type = 'ok'): void
{
    $_SESSION['flash'][] = [$type, $message];
}

function flashes(): string
{
    $out = '';
    foreach ($_SESSION['flash'] ?? [] as [$type, $message]) {
        $out .= '<p class="note note-' . h($type) . '" role="status">' . h($message) . '</p>';
    }
    unset($_SESSION['flash']);
    return $out;
}

/* ---------- who's signed in ---------- */

function installed(): bool
{
    try {
        db()->query('SELECT 1 FROM admins LIMIT 1');
        return true;
    } catch (PDOException $e) {
        if ($e->getCode() === '42S02') return false; // table doesn't exist
        throw $e; // anything else (database down, no access) is not "not installed"
    }
}

/* ---------- placeholder drawings (js/catalog.js) for products and departments without a photo ---------- */
const ART_KINDS = [
    'laptop' => 'Laptop', 'desktop' => 'Desktop', 'monitor' => 'Monitor', 'phone' => 'Phone', 'tablet' => 'Tablet', 'watch' => 'Watch',
    'headphones' => 'Headphones', 'earbuds' => 'Earbuds', 'speaker' => 'Speaker', 'tv' => 'TV', 'console' => 'Games console',
    'mouse' => 'Mouse', 'keyboard' => 'Keyboard', 'charger' => 'Charger', 'cable' => 'Cable', 'powerbank' => 'Power bank',
    'flash' => 'Flash drive', 'ssd' => 'Portable drive', 'router' => 'Router', 'printer' => 'Printer', 'calculator' => 'Calculator',
    'kettle' => 'Kettle', 'airfryer' => 'Air fryer', 'microwave' => 'Microwave', 'pan' => 'Frying pan', 'container' => 'Food containers',
    'frenchpress' => 'French press', 'sneaker' => 'Sneaker', 'tshirt' => 'T-shirt', 'backpack' => 'Backpack', 'hairdryer' => 'Hair dryer',
    'toothbrush' => 'Toothbrush', 'bottle' => 'Bottle (lotion, shampoo)', 'nappies' => 'Nappies', 'babybottle' => 'Baby bottle',
    'bricks' => 'Building bricks', 'teddy' => 'Teddy bear', 'cube' => 'Puzzle cube', 'ball' => 'Ball', 'dumbbell' => 'Dumbbell',
    'yogamat' => 'Yoga mat', 'pens' => 'Pens', 'notebook' => 'Notebook', 'drill' => 'Drill', 'toolbox' => 'Toolbox', 'bag' => 'Shopping bag (anything else)',
];
const ART_BODIES = ['dark' => 'Dark', 'silver' => 'Silver', 'light' => 'Light grey', 'white' => 'White'];

function art_kind_select(string $name, string $value, string $label = ''): string
{
    $out = '<select name="' . h($name) . '"' . ($label !== '' ? ' aria-label="' . h($label) . '"' : '') . '>';
    foreach (ART_KINDS as $k => $text) $out .= '<option value="' . h($k) . '"' . ($k === $value ? ' selected' : '') . '>' . h($text) . '</option>';
    return $out . '</select>';
}

/** web-address form of a name: "Home & Kitchen" → "home-kitchen", "Levi's" → "levis", "Crème" → "creme" */
function slugify(string $s, int $max = 80): string
{
    $s = str_replace(["'", '’'], '', $s);
    $s = strtolower(trim((string) preg_replace('/[^A-Za-z0-9]+/', '-', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s), '-'));
    return trim(substr($s, 0, $max), '-');
}

/* ---------- database updates for shops installed before a change ----------
   Each entry: what it adds, an SQL check that returns 0 when it's missing,
   and the SQL that adds it (one statement, a list of them, 'schema' for
   missing tables, or 'seed:categories' for the starting departments in
   database/seed.sql). setup.php runs the missing ones, in this order. */
const UPGRADES = [
    ['Product photo galleries',
     "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'images'",
     'ALTER TABLE products ADD COLUMN images TEXT NULL AFTER image_url'],
    ['Product reviews', "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'reviews'", 'schema'],
    ['Faster review checks',
     "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'orders_email'",
     'ALTER TABLE orders ADD KEY orders_email (customer_email)'],
    ['Sizes on orders (clothing and shoes)',
     "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'size'",
     'ALTER TABLE order_items ADD COLUMN size VARCHAR(60) NULL AFTER name'],
    ['Customer accounts', "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'customers'", 'schema'],
    ['Orders saved to customer accounts',
     "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'customer_id'",
     ['ALTER TABLE orders ADD COLUMN customer_id INT UNSIGNED NULL AFTER ip_hash, ADD KEY orders_customer (customer_id, created_at), '
      . 'ADD CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL']],
    ['Department pictures',
     "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'categories' AND column_name = 'art'",
     'ALTER TABLE categories ADD COLUMN art TEXT NULL AFTER blurb'],
    ['Departments for every kind of product (home, fashion, beauty, baby, toys, sport, office, DIY)',
     "SELECT COUNT(*) FROM categories WHERE id = 'appliances'",
     ['seed:categories',
      "UPDATE categories SET name = 'TV, Audio & Gaming', blurb = 'TVs, speakers, wearables, printers & gaming' WHERE id = 'electronics' AND name = 'Electronics'",
      "UPDATE categories SET name = 'Tech Accessories', blurb = 'Chargers, headphones, storage & more' WHERE id = 'accessories' AND name = 'Accessories'"]],
];

function pending_upgrades(): array
{
    return array_values(array_filter(UPGRADES, fn ($u) => (int) db()->query($u[1])->fetchColumn() === 0));
}

function admin_count(): int
{
    return (int) db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
}

function current_admin(): ?array
{
    static $admin = false;
    if ($admin !== false) return $admin;
    $admin = null;
    if (!empty($_SESSION['admin_id'])) {
        if (time() - ($_SESSION['seen'] ?? 0) > SESSION_IDLE) {
            $_SESSION = [];
            return null;
        }
        $stmt = db()->prepare('SELECT id, email, password_hash FROM admins WHERE id = ?');
        $stmt->execute([$_SESSION['admin_id']]);
        $row = $stmt->fetch();
        // a password change signs out every other session
        if (!$row || !hash_equals((string) ($_SESSION['pw'] ?? ''), password_mark($row['password_hash']))) {
            $_SESSION = [];
            return null;
        }
        $admin = ['id' => (int) $row['id'], 'email' => $row['email']];
        $_SESSION['seen'] = time();
    }
    return $admin;
}

/** short fingerprint of the stored password hash, kept in the session */
function password_mark(string $hash): string
{
    return substr(hash('sha256', $hash), 0, 20);
}

/** a page inside the admin panel to return to after signing in, e.g. "order.php?n=MB…" */
function safe_next(string $next): string
{
    return preg_match('#^[a-z]+\.php(\?[A-Za-z0-9=&%._\-]*)?$#', $next) ? $next : 'orders.php';
}

function require_admin(): array
{
    try {
        $admin = current_admin();
    } catch (Throwable $e) {
        redirect('setup.php'); // not configured or installed yet
    }
    if (!$admin) {
        $here = basename($_SERVER['SCRIPT_NAME'] ?? '') . (!empty($_SERVER['QUERY_STRING']) ? '?' . $_SERVER['QUERY_STRING'] : '');
        redirect('index.php' . ($here !== 'orders.php' ? '?next=' . rawurlencode(safe_next($here)) : ''));
    }
    return $admin;
}

/* ---------- formatting ---------- */

function status_pill(string $status): string
{
    return '<span class="pill pill-' . h($status) . '">' . h(ORDER_STATUSES[$status] ?? $status) . '</span>';
}

function pay_label(array $o): string
{
    return $o['payment_method'] === 'eft' ? 'EFT' : ($o['fulfilment'] === 'collect' ? 'On collection' : 'On delivery');
}

function when(string $datetime): string
{
    return date('j M Y, H:i', strtotime($datetime));
}

function nav_link(string $href, string $label, string $active, int $count = 0): string
{
    $on = basename($href, '.php') === $active;
    return '<a href="' . h($href) . '"' . ($on ? ' aria-current="page"' : '') . '>' . h($label)
        . ($count ? ' <span class="nav-count" title="' . $count . ' waiting">' . $count . '</span>' : '') . '</a>';
}

function pending_reviews(): int
{
    try {
        return (int) db()->query("SELECT COUNT(*) FROM reviews WHERE status = 'pending'")->fetchColumn();
    } catch (PDOException $e) {
        return 0; // reviews table not installed yet
    }
}

function stars(int $rating): string
{
    return '<span class="stars" aria-label="' . $rating . ' out of 5 stars">' . str_repeat('★', $rating) . '<span class="stars-off">' . str_repeat('★', 5 - $rating) . '</span></span>';
}

/* ---------- layout ---------- */

function page_start(string $title, string $active = ''): void
{
    $admin = $active !== '' ? current_admin() : null;
    echo '<!doctype html><html lang="en-ZA"><head><meta charset="utf-8">',
         '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<meta name="robots" content="noindex, nofollow">',
         '<title>', h($title), ' · Mabs Admin</title>',
         '<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">',
         '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">',
         '<link rel="stylesheet" href="../css/select.css"><link rel="stylesheet" href="admin.css">',
         '<script src="../js/select.js" defer></script></head><body>';
    echo '<header class="top"><div class="wrap top-in">',
         '<a class="brand" href="', $admin ? 'orders.php' : 'index.php', '"><img src="../assets/logo-light.svg" alt="Mabs Technologies" height="26"><span>Admin</span></a>';
    if ($admin) {
        echo '<nav class="nav" aria-label="Admin">',
             nav_link('orders.php', 'Orders', $active), nav_link('products.php', 'Products', $active),
             nav_link('departments.php', 'Departments', $active), nav_link('customers.php', 'Customers', $active),
             nav_link('reviews.php', 'Reviews', $active, pending_reviews()), nav_link('settings.php', 'Settings', $active),
             '</nav><div class="who"><a href="../index.html" target="_blank" rel="noopener">View shop</a>',
             '<form method="post" action="logout.php">', csrf_field(), '<button type="submit" class="link">Sign out</button></form></div>';
    }
    echo '</div></header><main class="wrap main">', flashes();
    if ($admin) {
        // checked once per sign-in: tell the admin if the database needs an update
        if (!isset($_SESSION['upgrades'])) {
            try { $_SESSION['upgrades'] = count(pending_upgrades()); } catch (Throwable $e) { $_SESSION['upgrades'] = 0; }
        }
        if ($_SESSION['upgrades'] > 0) {
            echo '<p class="note note-info">Your database needs a quick update for the newest features. <a href="setup.php">Update it now</a> (you’ll need the setup key).</p>';
        }
    }
}

function page_end(): void
{
    echo '</main></body></html>';
}

/* ---------- form values ---------- */

/** "R8 999", "8999.00" or "8 999,50" → 8999.5; null if it isn't an amount */
function parse_money(string $s): ?float
{
    $s = str_replace(['R', 'r', ' ', "\u{00a0}"], '', trim($s));
    $s = str_contains($s, '.') ? str_replace(',', '', $s) : str_replace(',', '.', $s);
    return $s !== '' && is_numeric($s) && (float) $s >= 0 && (float) $s < 10000000 ? round((float) $s, 2) : null;
}

function parse_count(string $s): ?int
{
    $n = filter_var(trim($s), FILTER_VALIDATE_INT);
    return $n !== false && $n >= 0 && $n <= 1000000 ? $n : null;
}

function plain_amount(?string $v): string
{
    if ($v === null || $v === '') return '';
    return rtrim(rtrim(number_format((float) $v, 2, '.', ''), '0'), '.');
}

/* ---------- photo uploads (admin/product.php) ---------- */

const PHOTO_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
/** a php.ini size such as "8M" in bytes */
function ini_bytes(string $v): int
{
    $n = (int) $v;
    return match (strtoupper(substr(trim($v), -1))) { 'G' => $n << 30, 'M' => $n << 20, 'K' => $n << 10, default => $n };
}
// 5 MB, or less if the host's upload limit is lower
define('PHOTO_MAX_BYTES', min(5 << 20, ini_bytes((string) ini_get('upload_max_filesize')) ?: 5 << 20));
function photo_limit(): string
{
    return round(PHOTO_MAX_BYTES / 1048576, 1) . ' MB';
}

/**
 * Saves uploaded photos to assets/products/ under new random names.
 * Only real JPG, PNG and WebP images are kept (checked by reading the file).
 * Returns [saved paths, problems].
 */
function save_photo_uploads(string $field, string $slug): array
{
    $f = $_FILES[$field] ?? null;
    if (!$f || !is_array($f['name'])) return [[], []];
    $saved = [];
    $problems = [];
    $dir = MABS_ROOT . '/assets/products';
    foreach ($f['name'] as $i => $original) {
        $err = $f['error'][$i];
        $label = '“' . mb_substr(basename((string) $original), 0, 60) . '”';
        if ($err === UPLOAD_ERR_NO_FILE) continue;
        if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE || $f['size'][$i] > PHOTO_MAX_BYTES) {
            $problems[] = "$label is too big — photos can be up to " . photo_limit() . '.';
            continue;
        }
        if ($err !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'][$i])) {
            $problems[] = "$label couldn’t be uploaded. Try again.";
            continue;
        }
        $info = @getimagesize($f['tmp_name'][$i]);
        $ext = $info ? (PHOTO_TYPES[$info['mime']] ?? null) : null;
        if (!$ext) {
            $problems[] = "$label isn’t a JPG, PNG or WebP photo.";
            continue;
        }
        if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
            $problems[] = 'The assets/products folder couldn’t be created on the server.';
            break;
        }
        $name = ($slug !== '' ? $slug : 'photo') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'][$i], "$dir/$name")) {
            $problems[] = "$label couldn’t be saved. Check that the assets/products folder can be written to.";
            continue;
        }
        $saved[] = 'assets/products/' . $name;
    }
    return [$saved, $problems];
}

/** a product's photo paths, main photo first */
function product_photos(array $p): array
{
    $all = json_decode($p['images'] ?? '', true);
    return is_array($all) && $all ? $all : array_values(array_filter([$p['image_url'] ?? null]));
}

/** deletes uploaded photo files that no product uses any more (links and other paths are left alone) */
function delete_unused_photos(array $paths): void
{
    $check = db()->prepare('SELECT COUNT(*) FROM products WHERE image_url = ? OR images LIKE ?');
    foreach (array_unique($paths) as $path) {
        if (!preg_match('#^assets/products/[a-z0-9-]+-[0-9a-f]{8}\.(jpg|png|webp)$#', $path)) continue; // only files this panel uploaded
        $check->execute([$path, '%"' . addcslashes($path, '%_\\') . '"%']);
        if ((int) $check->fetchColumn() === 0) @unlink(MABS_ROOT . '/' . $path);
    }
}

/** a photo path as seen from the admin pages (one folder down from the site) */
function photo_src(string $path): string
{
    return str_starts_with($path, 'assets/') ? '../' . $path : $path;
}
