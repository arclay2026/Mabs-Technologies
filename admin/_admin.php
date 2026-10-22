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

$https = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
session_name('mabs_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
ini_set('session.use_strict_mode', '1');
session_start();

const SESSION_IDLE = 4 * 3600; // sign out after 4 hours without activity

function h($s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
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
        return false;
    }
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
        $stmt = db()->prepare('SELECT id, email FROM admins WHERE id = ?');
        $stmt->execute([$_SESSION['admin_id']]);
        $admin = $stmt->fetch() ?: null;
        $_SESSION['seen'] = time();
    }
    return $admin;
}

function require_admin(): array
{
    try {
        $admin = current_admin();
    } catch (Throwable $e) {
        redirect('setup.php'); // not configured or installed yet
    }
    if (!$admin) redirect('index.php');
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
         '<link rel="stylesheet" href="admin.css"></head><body>';
    echo '<header class="top"><div class="wrap top-in">',
         '<a class="brand" href="', $admin ? 'orders.php' : 'index.php', '"><img src="../assets/logo-light.svg" alt="Mabs Technologies" height="26"><span>Admin</span></a>';
    if ($admin) {
        echo '<nav class="nav" aria-label="Admin">',
             nav_link('orders.php', 'Orders', $active), nav_link('products.php', 'Products', $active),
             nav_link('reviews.php', 'Reviews', $active, pending_reviews()), nav_link('settings.php', 'Settings', $active),
             '</nav><div class="who"><a href="../index.html" target="_blank" rel="noopener">View shop</a>',
             '<form method="post" action="logout.php">', csrf_field(), '<button type="submit" class="link">Sign out</button></form></div>';
    }
    echo '</div></header><main class="wrap main">', flashes();
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
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

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
            $problems[] = "$label is too big — photos can be up to 5 MB.";
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

/** a photo path as seen from the admin pages (one folder down from the site) */
function photo_src(string $path): string
{
    return str_starts_with($path, 'assets/') ? '../' . $path : $path;
}
