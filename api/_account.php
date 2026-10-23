<?php
/* =====================================================================
   MABS TECHNOLOGIES — CUSTOMER ACCOUNTS
   Sign up, sign in (optionally kept for 30 days), sign out, confirming
   the email address, forgotten passwords, and the account's details and
   orders. Used by api/account.php and, for linking orders to accounts,
   by place_order(). Never served directly (see api/.htaccess).

   Customers are signed in with a PHP session in its own cookie
   ("mabs_shop", HttpOnly, SameSite=Lax), separate from the admin panel's.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/_store.php';

const KEEP_SIGNED_IN = 30 * 86400;  // "Keep me signed in": 30 days from the last visit
const SESSION_ONLY_IDLE = 12 * 3600; // otherwise: until the browser closes, or 12 hours without a visit
const VERIFY_HOURS = 72;             // how long a "confirm your email" link works
const RESET_MINUTES = 60;            // how long a "reset your password" link works
const MIN_PASSWORD = 8;

/* ---------- the session ---------- */

function customer_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    // a private folder outside the website when the host allows it; its own, not the admin panel's,
    // because PHP clears out a folder by the shortest lifetime used in it (the admin's 4 hours)
    $dir = dirname((string) realpath(MABS_ROOT)) . '/mabs-sessions/shop';
    if ((is_dir($dir) || @mkdir($dir, 0700, true)) && is_writable($dir)) session_save_path($dir);
    ini_set('session.gc_maxlifetime', (string) KEEP_SIGNED_IN);
    ini_set('session.use_strict_mode', '1');
    session_name('mabs_shop');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

/** the signed-in customer, or null */
function current_customer(): ?array
{
    static $me = false;
    if ($me !== false) return $me;
    $me = null;
    if (empty($_COOKIE['mabs_shop'])) return null; // no cookie: don't start a session for every visitor
    customer_session();
    if (empty($_SESSION['customer_id'])) return null;
    $idle = !empty($_SESSION['remember']) ? KEEP_SIGNED_IN : SESSION_ONLY_IDLE;
    if (time() - ($_SESSION['seen'] ?? 0) > $idle) {
        sign_out();
        return null;
    }
    $stmt = db()->prepare('SELECT * FROM customers WHERE id = ?');
    $stmt->execute([$_SESSION['customer_id']]);
    $row = $stmt->fetch();
    // changing or resetting the password signs out every other session
    if (!$row || !hash_equals((string) ($_SESSION['pw'] ?? ''), customer_mark($row['password_hash']))) {
        sign_out();
        return null;
    }
    $_SESSION['seen'] = time();
    if (!empty($_SESSION['remember'])) remember_cookie(true); // slide the 30 days forward
    return $me = $row;
}

function customer_mark(string $hash): string
{
    return substr(hash('sha256', 'customer|' . $hash), 0, 20);
}

function remember_cookie(bool $keep): void
{
    $p = session_get_cookie_params();
    setcookie(session_name(), session_id(), [
        'expires' => $keep ? time() + KEEP_SIGNED_IN : 0, 'path' => $p['path'], 'secure' => $p['secure'],
        'httponly' => true, 'samesite' => 'Lax',
    ]);
}

function sign_in(array $customer, bool $remember): void
{
    customer_session();
    session_regenerate_id(true); // a new session id at every sign-in
    $_SESSION = ['customer_id' => (int) $customer['id'], 'pw' => customer_mark($customer['password_hash']),
                 'seen' => time(), 'remember' => $remember];
    remember_cookie($remember);
    db()->prepare('UPDATE customers SET last_login_at = NOW() WHERE id = ?')->execute([$customer['id']]);
}

function sign_out(): void
{
    customer_session();
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Lax']);
    session_destroy();
}

/** what the shop's pages get to know about the customer */
function customer_public(array $c): array
{
    return [
        'firstName' => $c['first_name'], 'lastName' => $c['last_name'], 'email' => $c['email'],
        'phone' => (string) ($c['phone'] ?? ''), 'verified' => $c['email_verified_at'] !== null,
        'newsletter' => (bool) $c['newsletter'], 'since' => date('c', strtotime((string) $c['created_at'])),
    ];
}

/* ---------- throttling ---------- */

function email_hash(string $email): string
{
    return hash('sha256', strtolower($email) . '|' . (config()['secret'] ?? ''));
}

/** how many times this visitor (or this email address) did $action recently */
function attempts(string $action, int $minutes, ?string $email = null): int
{
    $pdo = db();
    if (random_int(1, 50) === 1) $pdo->exec('DELETE FROM customer_attempts WHERE at < NOW() - INTERVAL 1 DAY');
    $sql = 'SELECT COUNT(*) FROM customer_attempts WHERE action = ? AND at > NOW() - INTERVAL ' . $minutes . ' MINUTE AND ';
    $q = $pdo->prepare($sql . ($email === null ? 'ip_hash = ?' : 'email_hash = ?'));
    $q->execute([$action, $email === null ? ip_hash() : email_hash($email)]);
    return (int) $q->fetchColumn();
}

function note_attempt(string $action, ?string $email = null): void
{
    db()->prepare('INSERT INTO customer_attempts (action, ip_hash, email_hash) VALUES (?, ?, ?)')
        ->execute([$action, ip_hash(), $email === null ? null : email_hash($email)]);
}

/* ---------- checks ---------- */

function account_email(array $in): string
{
    $email = strtolower(clean($in['email'] ?? '', 190));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ShopError('BAD_EMAIL');
    return $email;
}

function account_password(array $in, string $field = 'password', string $email = ''): string
{
    $pass = is_string($in[$field] ?? null) ? $in[$field] : '';
    // long enough to be safe, short enough that hashing stays quick (bcrypt reads 72 bytes)
    if (mb_strlen($pass) < MIN_PASSWORD || strlen($pass) > 72) throw new ShopError('WEAK_PASSWORD');
    if ($email !== '' && strcasecmp($pass, $email) === 0) throw new ShopError('WEAK_PASSWORD');
    return $pass;
}

/** name and phone, as typed on the sign-up and details forms */
function account_details(array $in): array
{
    $first = clean($in['firstName'] ?? '', 60);
    $last = clean($in['lastName'] ?? '', 60);
    $phone = clean($in['phone'] ?? '', 30);
    if ($first === '' || $last === '') throw new ShopError('MISSING_NAME');
    if ($phone !== '' && !preg_match('/^\+?[0-9][0-9 ]{8,}$/', $phone)) throw new ShopError('BAD_PHONE');
    return [$first, $last, $phone === '' ? null : $phone];
}

/* ---------- one-time email links ---------- */

function new_token(int $customerId, string $purpose, int $minutes): string
{
    $pdo = db();
    // a new link replaces any earlier unused one
    $pdo->prepare('DELETE FROM customer_tokens WHERE customer_id = ? AND purpose = ? AND used_at IS NULL')->execute([$customerId, $purpose]);
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('INSERT INTO customer_tokens (customer_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL ' . $minutes . ' MINUTE)')
        ->execute([$customerId, $purpose, hash('sha256', $token)]);
    return $token;
}

/** the token's row if it is real, unused and in date (locked for the rest of the transaction) */
function find_token(string $token, string $purpose): ?array
{
    if (!preg_match('/^[0-9a-f]{64}$/', $token)) return null;
    $q = db()->prepare('SELECT * FROM customer_tokens WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW() FOR UPDATE');
    $q->execute([hash('sha256', $token), $purpose]);
    return $q->fetch() ?: null;
}

function site_link(string $path): string
{
    return rtrim((string) (config()['site_url'] ?? ''), '/') . '/' . $path;
}

function send_verify_email(array $c): bool
{
    $token = new_token((int) $c['id'], 'verify', VERIFY_HOURS * 60);
    $store = config()['mail']['store_name'] ?? 'Mabs Technologies';
    return send_mail($c['email'], 'Confirm your email address — ' . $store,
        "Hi {$c['first_name']},\n\nWelcome to $store. Please confirm your email address by opening this link:\n\n"
        . site_link('account.html?verify=' . $token) . "\n\nThe link works for " . VERIFY_HOURS . " hours. "
        . "If you didn't create an account, you can ignore this email.\n\n$store");
}

function send_reset_email(array $c): bool
{
    $token = new_token((int) $c['id'], 'reset', RESET_MINUTES);
    $store = config()['mail']['store_name'] ?? 'Mabs Technologies';
    return send_mail($c['email'], 'Reset your password — ' . $store,
        "Hi {$c['first_name']},\n\nSomeone (hopefully you) asked to reset the password for your $store account. "
        . "To choose a new password, open this link:\n\n" . site_link('account.html?reset=' . $token)
        . "\n\nThe link works for " . RESET_MINUTES . " minutes and only once. If you didn't ask for this, "
        . "ignore this email: your password stays the same.\n\n$store");
}

/** guest orders placed with this (now confirmed) email address become part of the account */
function claim_guest_orders(array $c): void
{
    db()->prepare('UPDATE orders SET customer_id = ? WHERE customer_id IS NULL AND customer_email = ?')->execute([$c['id'], $c['email']]);
}

/* ---------- the actions ---------- */

function account_signup(array $in): array
{
    if (attempts('signup', 60) >= 10) throw new ShopError('TOO_MANY', 429); // 10 new accounts an hour per visitor (shared office wi-fi included)
    $email = account_email($in);
    [$first, $last, $phone] = account_details($in);
    $pass = account_password($in, 'password', $email);
    note_attempt('signup');
    $pdo = db();
    try {
        $pdo->prepare('INSERT INTO customers (email, first_name, last_name, phone, password_hash, newsletter) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$email, $first, $last, $phone, password_hash($pass, PASSWORD_DEFAULT), !empty($in['newsletter']) ? 1 : 0]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') throw new ShopError('EMAIL_TAKEN', 409);
        throw $e;
    }
    $q = $pdo->prepare('SELECT * FROM customers WHERE id = ?');
    $q->execute([(int) $pdo->lastInsertId()]);
    $c = $q->fetch();
    sign_in($c, !empty($in['remember']));
    $emailed = send_verify_email($c);
    return ['customer' => customer_public($c), 'emailed' => $emailed];
}

function account_signin(array $in): array
{
    $email = strtolower(clean($in['email'] ?? '', 190));
    $pass = is_string($in['password'] ?? null) ? $in['password'] : '';
    // 5 wrong passwords for one account, or 20 from one visitor, in 15 minutes: wait
    if (attempts('signin', 15) >= 20 || ($email !== '' && attempts('signin', 15, $email) >= 5)) throw new ShopError('TOO_MANY', 429);
    $q = db()->prepare('SELECT * FROM customers WHERE email = ?');
    $q->execute([$email]);
    $c = $q->fetch();
    // hash something even when the email is unknown, so both take as long
    $hash = $c['password_hash'] ?? password_hash(bin2hex(random_bytes(12)), PASSWORD_DEFAULT);
    if (!$c || strlen($pass) > 72 || !password_verify($pass, $hash)) {
        note_attempt('signin', $email !== '' ? $email : null);
        throw new ShopError('BAD_LOGIN', 401);
    }
    db()->prepare("DELETE FROM customer_attempts WHERE action = 'signin' AND email_hash = ?")->execute([email_hash($email)]);
    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        $c['password_hash'] = password_hash($pass, PASSWORD_DEFAULT);
        db()->prepare('UPDATE customers SET password_hash = ? WHERE id = ?')->execute([$c['password_hash'], $c['id']]);
    }
    sign_in($c, !empty($in['remember']));
    return ['customer' => customer_public($c)];
}

function account_verify(array $in): array
{
    $pdo = db();
    $pdo->beginTransaction();
    $t = find_token(clean($in['token'] ?? '', 64), 'verify');
    if (!$t) { $pdo->rollBack(); throw new ShopError('BAD_LINK', 410); }
    $pdo->prepare('UPDATE customer_tokens SET used_at = NOW() WHERE id = ?')->execute([$t['id']]);
    $pdo->prepare('UPDATE customers SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?')->execute([$t['customer_id']]);
    $q = $pdo->prepare('SELECT * FROM customers WHERE id = ?');
    $q->execute([$t['customer_id']]);
    $c = $q->fetch();
    claim_guest_orders($c);
    $pdo->commit();
    $me = current_customer();
    return ['verified' => true, 'customer' => $me && (int) $me['id'] === (int) $c['id'] ? customer_public($c) : null];
}

function account_resend(array $me): array
{
    if ($me['email_verified_at'] !== null) return ['emailed' => false, 'verified' => true];
    if (attempts('resend', 60, $me['email']) >= 3) throw new ShopError('TOO_MANY', 429);
    note_attempt('resend', $me['email']);
    return ['emailed' => send_verify_email($me)];
}

/** always answers the same, so nobody can use it to find out who has an account */
function account_forgot(array $in): array
{
    $email = account_email($in);
    if (attempts('forgot', 60) >= 10 || attempts('forgot', 60, $email) >= 3) throw new ShopError('TOO_MANY', 429);
    note_attempt('forgot', $email);
    $q = db()->prepare('SELECT * FROM customers WHERE email = ?');
    $q->execute([$email]);
    $c = $q->fetch();
    if ($c) send_reset_email($c);
    $m = config()['mail'] ?? [];
    return ['ok' => true, 'mail' => !empty($m['enabled']) && !empty($m['from'])];
}

function account_reset(array $in): array
{
    $pdo = db();
    $pdo->beginTransaction();
    $t = find_token(clean($in['token'] ?? '', 64), 'reset');
    if (!$t) { $pdo->rollBack(); throw new ShopError('BAD_LINK', 410); }
    $q = $pdo->prepare('SELECT * FROM customers WHERE id = ?');
    $q->execute([$t['customer_id']]);
    $c = $q->fetch();
    try {
        $pass = account_password($in, 'password', $c['email']);
    } catch (ShopError $e) {
        $pdo->rollBack();
        throw $e;
    }
    $c['password_hash'] = password_hash($pass, PASSWORD_DEFAULT);
    // the link came to their inbox, so the address is confirmed too
    $pdo->prepare('UPDATE customers SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?')
        ->execute([$c['password_hash'], $c['id']]);
    $pdo->prepare('UPDATE customer_tokens SET used_at = NOW() WHERE customer_id = ? AND used_at IS NULL')->execute([$c['id']]);
    $pdo->prepare("DELETE FROM customer_attempts WHERE action = 'signin' AND email_hash = ?")->execute([email_hash($c['email'])]);
    if ($c['email_verified_at'] === null) $c['email_verified_at'] = date('Y-m-d H:i:s');
    claim_guest_orders($c);
    $pdo->commit();
    sign_in($c, false);
    return ['customer' => customer_public($c)];
}

function account_update(array $me, array $in): array
{
    [$first, $last, $phone] = account_details($in);
    db()->prepare('UPDATE customers SET first_name = ?, last_name = ?, phone = ?, newsletter = ? WHERE id = ?')
        ->execute([$first, $last, $phone, !empty($in['newsletter']) ? 1 : 0, $me['id']]);
    $me = array_merge($me, ['first_name' => $first, 'last_name' => $last, 'phone' => $phone, 'newsletter' => !empty($in['newsletter']) ? 1 : 0]);
    return ['customer' => customer_public($me)];
}

function account_password_change(array $me, array $in): array
{
    $current = is_string($in['current'] ?? null) ? $in['current'] : '';
    if (attempts('signin', 15, $me['email']) >= 5) throw new ShopError('TOO_MANY', 429);
    if (strlen($current) > 72 || !password_verify($current, $me['password_hash'])) {
        note_attempt('signin', $me['email']);
        throw new ShopError('BAD_PASSWORD', 401);
    }
    $pass = account_password($in, 'password', $me['email']);
    $me['password_hash'] = password_hash($pass, PASSWORD_DEFAULT);
    db()->prepare('UPDATE customers SET password_hash = ? WHERE id = ?')->execute([$me['password_hash'], $me['id']]);
    sign_in($me, !empty($_SESSION['remember'])); // this device stays signed in; others are signed out
    return ['ok' => true];
}

/** the account's orders, newest first, in the shape orders.html shows */
function account_orders(array $me): array
{
    $pdo = db();
    $q = $pdo->prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100');
    $q->execute([$me['id']]);
    $orders = $q->fetchAll();
    if (!$orders) return ['orders' => []];
    $ids = array_column($orders, 'id');
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $items = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($marks) ORDER BY id");
    $items->execute($ids);
    $byOrder = [];
    foreach ($items as $i) {
        $byOrder[$i['order_id']][] = ['id' => $i['product_id'], 'name' => $i['name'], 'size' => (string) ($i['size'] ?? ''),
                                      'price' => (float) $i['unit_price'], 'qty' => (int) $i['qty']];
    }
    return ['orders' => array_map(fn ($o) => [
        'number' => $o['number'], 'placed' => date('c', strtotime($o['created_at'])), 'status' => $o['status'],
        'payStatus' => $o['payment_status'], 'fulfil' => $o['fulfilment'], 'payment' => $o['payment_method'] === 'eft' ? 'eft' : 'on-receipt',
        'customer' => ['name' => $o['customer_name'], 'phone' => $o['customer_phone'], 'email' => $o['customer_email']],
        'address' => json_decode((string) $o['address'], true) ?: null, 'notes' => (string) ($o['notes'] ?? ''),
        'items' => $byOrder[$o['id']] ?? [],
        'subtotal' => (float) $o['subtotal'], 'fee' => (float) $o['delivery_fee'], 'total' => (float) $o['total'], 'received' => true,
    ], $orders)];
}
