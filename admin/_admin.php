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

/** line icons for the admin panel (24 × 24, drawn with currentColor) */
function icon(string $name): string
{
    static $paths = [
        'orders' => '<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 016 0"/>',
        'products' => '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
        'departments' => '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
        'customers' => '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c1-3.6 3.6-5.5 6.5-5.5s5.5 1.9 6.5 5.5"/><path d="M16 5.2a3.4 3.4 0 010 6.6M18.5 14.8c1.5.8 2.5 2.5 3 4.7"/>',
        'reviews' => '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8L12 3.8z"/>',
        'settings' => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
        'shop' => '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"/>',
        'logout' => '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
        'money' => '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/>',
        'calendar' => '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
        'alert' => '<path d="M12 4l9 16H3l9-16z"/><path d="M12 10v4M12 17.2v.01"/>',
        'mail' => '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
        'check' => '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        'new' => '<path d="M12 5v14M5 12h14"/>',
        'search' => '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
        'lock' => '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
        'eye' => '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        'shield' => '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
        'arrow' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'back' => '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    ];
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        . ($paths[$name] ?? '') . '</svg>';
}

function nav_link(string $href, string $label, string $active, int $count = 0): string
{
    $key = basename($href, '.php');
    return '<a href="' . h($href) . '"' . ($key === $active ? ' aria-current="page"' : '') . '>' . icon($key) . '<span>' . h($label) . '</span>'
        . ($count ? '<span class="nav-count" title="' . $count . ' waiting">' . $count . '</span>' : '') . '</a>';
}

function new_orders(): int
{
    try {
        return (int) db()->query("SELECT COUNT(*) FROM orders WHERE status = 'placed'")->fetchColumn();
    } catch (PDOException $e) {
        return 0;
    }
}

/** two-letter badge for a person or brand, coloured from its name */
function monogram(string $name, string $class = 'mono'): string
{
    $words = preg_split('/\s+/', trim($name)) ?: [''];
    $letters = mb_strtoupper(mb_substr($words[0], 0, 1) . (count($words) > 1 ? mb_substr(end($words), 0, 1) : mb_substr($words[0], 1, 1)));
    $hue = hexdec(substr(md5(strtolower($name)), 0, 2)) % 6;
    return '<span class="' . h($class) . ' mono-' . $hue . '" aria-hidden="true">' . h($letters) . '</span>';
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

/** $layout 'auth': the full-screen sign-in layout (admin/index.php draws the page and its messages) */
function page_start(string $title, string $active = '', string $layout = ''): void
{
    $admin = $active !== '' ? current_admin() : null;
    echo '<!doctype html><html lang="en-ZA"><head><meta charset="utf-8">',
         '<meta name="viewport" content="width=device-width, initial-scale=1">',
         '<meta name="robots" content="noindex, nofollow">',
         '<title>', h($title), ' · Mabs Admin</title>',
         '<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">',
         '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">',
         '<link rel="stylesheet" href="../css/select.css"><link rel="stylesheet" href="admin.css?v=4">',
         // the shop's product drawings, for picture previews (departments, products)
         '<script src="../js/catalog.js" defer></script><script src="../js/select.js" defer></script><script src="admin.js?v=3" defer></script></head>';
    if ($admin) {
        // signed in: a sidebar with the sections, then the page
        echo '<body class="has-side"><aside class="side">',
             '<a class="brand" href="orders.php"><img src="../assets/logo-light.svg" alt="Mabs Technologies" height="26"><span>Admin</span></a>',
             '<nav class="nav" aria-label="Admin"><p class="nav-label">Store</p>',
             nav_link('orders.php', 'Orders', $active, new_orders()), nav_link('products.php', 'Products', $active),
             nav_link('departments.php', 'Departments', $active), nav_link('customers.php', 'Customers', $active),
             nav_link('reviews.php', 'Reviews', $active, pending_reviews()),
             '<p class="nav-label">Account</p>', nav_link('settings.php', 'Settings', $active),
             '<a href="../index.html" target="_blank" rel="noopener">', icon('shop'), '<span>View shop</span></a></nav>',
             '<div class="who">', monogram($admin['email'], 'avatar'), '<span class="who-text"><b>Store owner</b><small>', h($admin['email']), '</small></span>',
             '<form method="post" action="logout.php">', csrf_field(), '<button type="submit" class="who-out" title="Sign out" aria-label="Sign out">', icon('logout'), '</button></form></div>',
             '</aside><main class="main"><div class="main-in">', flashes();
    } elseif ($layout === 'auth') {
        echo '<body class="is-auth"><main class="auth-main"><div class="auth-split">';
    } else {
        echo '<body class="is-public"><header class="top"><a class="brand" href="index.php"><img src="../assets/logo-light.svg" alt="Mabs Technologies" height="28"><span>Admin</span></a></header>',
             '<main class="main"><div class="main-in">', flashes();
    }
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
    echo '</div></main></body></html>';
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
