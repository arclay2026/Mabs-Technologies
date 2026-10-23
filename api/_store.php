<?php
/* =====================================================================
   MABS TECHNOLOGIES — CATALOGUE AND ORDERS
   The business rules, shared by the API and the admin panel.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

const MAX_PER_ITEM = 10;     // keep in step with maxPerItem in js/catalog.js
const MAX_LINES = 30;
const OPEN_ORDERS_PER_CUSTOMER = 3; // unconfirmed orders per email or phone per day

/** A request the shop turns down (bad order, review…); code_name is what the browser sees. */
final class ShopError extends RuntimeException
{
    public function __construct(public string $code_name, public int $http = 422, public ?string $product = null)
    {
        parent::__construct($code_name);
    }
}

function store_settings(): array
{
    $s = db()->query('SELECT courier_fee, free_over, collect FROM store_settings WHERE id = 1')->fetch();
    return [
        'courierFee' => (float) ($s['courier_fee'] ?? 120),
        'freeOver' => (float) ($s['free_over'] ?? 1500),
        'collect' => (bool) ($s['collect'] ?? true),
    ];
}

function delivery_fee(float $subtotal, string $fulfilment, array $settings): float
{
    if ($fulfilment === 'collect' || $subtotal >= $settings['freeOver']) {
        return 0.0;
    }
    return $settings['courierFee'];
}

/* ---------- catalogue (same shapes the shop's JavaScript uses) ---------- */

function catalogue(): array
{
    $pdo = db();
    // SELECT *: shops that haven't run the "Department pictures" update yet have no art column
    $categories = array_map(fn ($c) => ['id' => $c['id'], 'name' => $c['name'], 'blurb' => $c['blurb'] ?? '',
        'art' => json_decode((string) ($c['art'] ?? ''), true) ?: null],
        $pdo->query('SELECT * FROM categories ORDER BY sort, name')->fetchAll());
    $brandRows = $pdo->query('SELECT id, name, logo_url, logo_height FROM brands ORDER BY sort, name')->fetchAll();
    $brandName = array_column($brandRows, 'name', 'id');
    $brands = [];
    foreach ($brandRows as $b) {
        if ($b['logo_url']) {
            $brands[] = ['name' => $b['name'], 'logo' => $b['logo_url'], 'h' => (int) ($b['logo_height'] ?: 24)];
        }
    }
    $products = [];
    foreach ($pdo->query('SELECT * FROM products WHERE active = 1 ORDER BY sort, name') as $p) {
        $item = [
            'id' => $p['id'], 'name' => $p['name'], 'brand' => $brandName[$p['brand_id']] ?? $p['brand_id'],
            'category' => $p['category_id'], 'type' => $p['type'], 'price' => (float) $p['price'],
            'stock' => (int) $p['stock'], 'summary' => $p['summary'] ?? '',
            'specs' => json_decode($p['specs'] ?: '[]', true) ?: [],
            'art' => json_decode($p['art'] ?: 'null', true) ?: ['kind' => 'phone', 'color' => '#64748b'],
        ];
        if ($p['was_price'] !== null) $item['was'] = (float) $p['was_price'];
        if ($p['featured']) $item['featured'] = true;
        if ($p['badge']) $item['badge'] = $p['badge'];
        if ($p['image_url']) $item['image'] = $p['image_url'];
        $gallery = json_decode($p['images'] ?? '', true);
        if (is_array($gallery) && count($gallery) > 1) $item['images'] = array_values($gallery);
        $products[] = $item;
    }
    // star ratings, when the reviews table exists (see _reviews.php)
    if (function_exists('review_summaries')) {
        try {
            $ratings = review_summaries();
            foreach ($products as &$item) {
                if (isset($ratings[$item['id']])) $item['rating'] = $ratings[$item['id']];
            }
            unset($item);
        } catch (PDOException $e) {
            error_log('[mabs] reviews unavailable: ' . $e->getMessage());
        }
    }
    return ['categories' => $categories, 'brands' => $brands, 'products' => $products, 'delivery' => store_settings()];
}

/* ---------- sizes ---------- */

/**
 * The sizes a product comes in, from its specs: "Size: S, M, L, XL" or
 * "Shoe size: UK 6, UK 7". Two or more means the shopper must choose one
 * (js/app.js M.sizesOf follows the same rule). A screen size like 24" isn't one.
 */
function product_sizes(?string $specsJson): array
{
    foreach (json_decode($specsJson ?: '[]', true) ?: [] as $s) {
        if (!is_array($s) || count($s) < 2) continue;
        $v = (string) $s[1];
        if (!in_array(strtolower(trim((string) $s[0])), ['size', 'clothing size', 'shoe size'], true) || preg_match('/\d\s*("|\x{201D}|\x{2033}|inch)/iu', $v)) continue;
        $sizes = array_values(array_filter(array_map('trim', preg_split('/\s*[,\/]\s*/', $v)), 'strlen'));
        return count($sizes) > 1 ? $sizes : [];
    }
    return [];
}

function has_column(string $table, string $column): bool
{
    static $seen = [];
    $key = "$table.$column";
    if (!isset($seen[$key])) {
        $q = db()->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
        $q->execute([$table, $column]);
        $seen[$key] = (int) $q->fetchColumn() > 0;
    }
    return $seen[$key];
}

/* ---------- placing an order ---------- */

// any JSON value → trimmed text (arrays and objects become empty)
function clean($s, int $max): string
{
    return is_scalar($s) ? mb_substr(trim((string) $s), 0, $max) : '';
}

/**
 * Validates the cart and details, prices every line from the database,
 * saves the order and reduces stock in one transaction.
 * $input: {items:[{id,qty,size?}], customer:{name,phone,email}, fulfil, payment, address, notes}
 */
function place_order(array $input): array
{
    // cart: merge repeated lines (one per product and size), cap quantities per product
    $lines = [];
    $perProduct = [];
    foreach ((array) ($input['items'] ?? []) as $line) {
        $id = is_array($line) ? clean($line['id'] ?? '', 80) : '';
        $size = is_array($line) ? clean($line['size'] ?? '', 60) : '';
        $qty = is_array($line) ? filter_var($line['qty'] ?? null, FILTER_VALIDATE_INT) : false;
        if ($id === '' || $qty === false || $qty < 1 || $qty > MAX_PER_ITEM) throw new ShopError('BAD_ITEM');
        $key = 'x' . $id . "\n" . $size; // "x" keeps ids like "123" as text keys
        $lines[$key] ??= ['id' => $id, 'size' => $size, 'qty' => 0];
        $lines[$key]['qty'] += $qty;
        $perProduct['x' . $id] = ($perProduct['x' . $id] ?? 0) + $qty;
    }
    if (!$lines) throw new ShopError('EMPTY_CART');
    if (count($lines) > MAX_LINES || max($perProduct) > MAX_PER_ITEM) throw new ShopError('BAD_ITEM');

    $fulfil = clean($input['fulfil'] ?? '', 20);
    $payment = clean($input['payment'] ?? '', 20);
    if (!in_array($fulfil, ['delivery', 'collect'], true)) throw new ShopError('BAD_FULFILMENT');
    if (!in_array($payment, ['eft', 'on_receipt'], true)) throw new ShopError('BAD_PAYMENT');

    $c = is_array($input['customer'] ?? null) ? $input['customer'] : [];
    $name = clean($c['name'] ?? '', 120);
    $phone = clean($c['phone'] ?? '', 30);
    $email = strtolower(clean($c['email'] ?? '', 190));
    if ($name === '' || !preg_match('/^\+?[0-9][0-9 ]{8,}$/', $phone) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new ShopError('MISSING_DETAILS');
    }

    $address = null;
    if ($fulfil === 'delivery') {
        $a = is_array($input['address'] ?? null) ? $input['address'] : [];
        $address = [
            'street' => clean($a['street'] ?? '', 160), 'suburb' => clean($a['suburb'] ?? '', 80),
            'city' => clean($a['city'] ?? '', 80), 'province' => clean($a['province'] ?? '', 40),
            'postal' => clean($a['postal'] ?? '', 4),
        ];
        if ($address['street'] === '' || $address['city'] === '' || !in_array($address['province'], PROVINCES, true)
            || !preg_match('/^[0-9]{4}$/', $address['postal'])) {
            throw new ShopError('MISSING_ADDRESS');
        }
    }
    $notes = clean($input['notes'] ?? '', 1000);

    $pdo = db();
    // a handful of orders per visitor per 10 minutes is plenty
    $recent = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE ip_hash = ? AND created_at > NOW() - INTERVAL 10 MINUTE');
    $recent->execute([ip_hash()]);
    if ((int) $recent->fetchColumn() >= 8) throw new ShopError('TOO_MANY_ORDERS', 429);
    // unpaid orders hold stock, so one customer can't tie up much of it
    $open = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE status = 'placed' AND created_at > NOW() - INTERVAL 1 DAY
                           AND (customer_email = ? OR REPLACE(customer_phone, ' ', '') = ?)");
    $open->execute([$email, str_replace(' ', '', $phone)]);
    if ((int) $open->fetchColumn() >= OPEN_ORDERS_PER_CUSTOMER) throw new ShopError('TOO_MANY_ORDERS', 429);

    $settings = store_settings();
    if ($fulfil === 'collect' && !$settings['collect']) throw new ShopError('BAD_FULFILMENT');

    $pdo->beginTransaction();
    try {
        // lock the rows so two shoppers can't buy the last unit at once
        $ids = array_map(fn ($k) => substr($k, 1), array_keys($perProduct));
        sort($ids);
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("SELECT id, name, price, stock, specs FROM products WHERE active = 1 AND id IN ($marks) ORDER BY id FOR UPDATE");
        $stmt->execute($ids);
        $found = [];
        foreach ($stmt as $row) $found[$row['id']] = $row;

        foreach ($ids as $id) {
            if (!isset($found[$id])) throw new ShopError('UNKNOWN_PRODUCT', 409, $id);
            if ((int) $found[$id]['stock'] < $perProduct['x' . $id]) throw new ShopError('OUT_OF_STOCK', 409, $id); // sizes share the stock
        }
        $items = [];
        $subtotal = 0.0;
        foreach ($lines as $l) {
            $p = $found[$l['id']];
            $sizes = product_sizes($p['specs']);
            if ($sizes && !in_array($l['size'], $sizes, true)) throw new ShopError('BAD_SIZE', 409, $l['id']);
            $price = (float) $p['price'];
            $items[] = ['id' => $l['id'], 'name' => $p['name'], 'size' => $sizes ? $l['size'] : '', 'price' => $price, 'qty' => $l['qty']];
            $subtotal += $price * $l['qty'];
        }
        $subtotal = round($subtotal, 2);
        $fee = delivery_fee($subtotal, $fulfil, $settings);

        $number = null;
        $taken = $pdo->prepare('SELECT 1 FROM orders WHERE number = ?');
        for ($try = 0; $try < 20 && $number === null; $try++) {
            $candidate = 'MB' . date('ymd') . '-' . str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $taken->execute([$candidate]);
            if (!$taken->fetchColumn()) $number = $candidate;
        }
        if ($number === null) throw new RuntimeException('could not allocate an order number');

        $pdo->prepare('INSERT INTO orders (number, fulfilment, payment_method, customer_name, customer_phone, customer_email,
                           address, notes, subtotal, delivery_fee, total, ip_hash)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$number, $fulfil, $payment, $name, $phone, $email,
                       $address ? json_encode($address, JSON_UNESCAPED_UNICODE) : null, $notes !== '' ? $notes : null,
                       $subtotal, $fee, $subtotal + $fee, ip_hash()]);
        $orderId = (int) $pdo->lastInsertId();
        // signed in: the order is saved to the account (once the database has been updated for accounts)
        $me = function_exists('current_customer') && has_column('orders', 'customer_id') ? current_customer() : null;
        if ($me) $pdo->prepare('UPDATE orders SET customer_id = ? WHERE id = ?')->execute([$me['id'], $orderId]);

        // shops that haven't run the "Sizes on orders" update keep the size in the item's name
        $sized = has_column('order_items', 'size');
        $addItem = $pdo->prepare($sized ? 'INSERT INTO order_items (order_id, product_id, name, size, unit_price, qty) VALUES (?, ?, ?, ?, ?, ?)'
                                        : 'INSERT INTO order_items (order_id, product_id, name, unit_price, qty) VALUES (?, ?, ?, ?, ?)');
        $takeStock = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
        foreach ($items as $i) {
            $addItem->execute($sized ? [$orderId, $i['id'], $i['name'], $i['size'] !== '' ? $i['size'] : null, $i['price'], $i['qty']]
                                     : [$orderId, $i['id'], $i['name'] . ($i['size'] !== '' ? ' (size ' . $i['size'] . ')' : ''), $i['price'], $i['qty']]);
            $takeStock->execute([$i['qty'], $i['id'], $i['qty']]);
            if ($takeStock->rowCount() !== 1) throw new ShopError('OUT_OF_STOCK', 409, $i['id']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $order = [
        'number' => $number, 'placed' => date('c'), 'status' => 'placed',
        'fulfil' => $fulfil, 'payment' => $payment,
        'customer' => ['name' => $name, 'phone' => $phone, 'email' => $email],
        'address' => $address, 'notes' => $notes,
        'items' => $items, 'subtotal' => $subtotal, 'fee' => $fee, 'total' => $subtotal + $fee,
    ];
    $order['emailed'] = send_order_emails($order);
    return $order;
}

/** Cancels an order and puts its items back into stock. */
function cancel_order(string $number): bool
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT id, status FROM orders WHERE number = ? FOR UPDATE');
        $stmt->execute([$number]);
        $order = $stmt->fetch();
        if (!$order || $order['status'] === 'cancelled') {
            $pdo->rollBack();
            return false;
        }
        // summed per product first: one order can hold several sizes of the same product
        $pdo->prepare('UPDATE products p JOIN (SELECT product_id, SUM(qty) AS qty FROM order_items WHERE order_id = ? GROUP BY product_id) i
                         ON i.product_id = p.id SET p.stock = p.stock + i.qty')
            ->execute([$order['id']]);
        $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?")->execute([$order['id']]);
        $pdo->commit();
        return true;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/* ---------- order emails ---------- */

/** the order as plain text; $forShop adds the customer's notes */
function order_text(array $o, bool $forShop = true): string
{
    $lines = [];
    foreach ($o['items'] as $i) {
        $lines[] = sprintf('%d × %s%s — %s', $i['qty'], $i['name'], ($i['size'] ?? '') !== '' ? ' (size ' . $i['size'] . ')' : '', money($i['price'] * $i['qty']));
    }
    $how = $o['fulfil'] === 'collect' ? 'Collect in store' :
        'Courier to ' . implode(', ', array_filter([$o['address']['street'] ?? '', $o['address']['suburb'] ?? '', $o['address']['city'] ?? '',
                                                  $o['address']['province'] ?? '', $o['address']['postal'] ?? '']));
    $pay = $o['payment'] === 'eft' ? 'EFT / bank transfer' : ($o['fulfil'] === 'collect' ? 'Pay on collection' : 'Pay on delivery');
    return implode("\n", $lines) . "\n\n"
        . 'Subtotal: ' . money($o['subtotal']) . "\n"
        . ($o['fulfil'] === 'collect' ? 'Collection' : 'Delivery') . ': ' . ($o['fee'] > 0 ? money($o['fee']) : 'Free') . "\n"
        . 'Total: ' . money($o['total']) . "\n\n"
        . $how . "\nPayment: " . $pay
        . ($forShop && $o['notes'] !== '' ? "\nNotes: " . $o['notes'] : '');
}

function send_mail(string $to, string $subject, string $body, ?string $replyTo = null): bool
{
    $m = config()['mail'] ?? [];
    if (empty($m['enabled']) || empty($m['from'])) return false;
    $name = $m['store_name'] ?? 'Mabs Technologies';
    $headers = [
        'From: ' . mb_encode_mimeheader($name) . ' <' . $m['from'] . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64', // safe for long lines and any characters
    ];
    if ($replyTo) $headers[] = 'Reply-To: ' . $replyTo;
    // envelope sender on the shop's own domain, so SPF/DMARC checks pass
    $params = filter_var($m['from'], FILTER_VALIDATE_EMAIL) ? '-f' . $m['from'] : '';
    // a failed email must never undo an order that's already saved
    if (!@mail($to, mb_encode_mimeheader($subject), chunk_split(base64_encode($body)), implode("\r\n", $headers), $params)) {
        error_log('[mabs] could not send email "' . $subject . '" to ' . $to);
        return false;
    }
    return true;
}

/** Emails the shop and the customer; returns whether the customer's copy went out. */
function send_order_emails(array $o): bool
{
    $m = config()['mail'] ?? [];
    $site = rtrim((string) (config()['site_url'] ?? ''), '/');
    $text = order_text($o);
    if (!empty($m['store_to'])) {
        send_mail($m['store_to'], 'New order ' . $o['number'] . ' — ' . money($o['total']),
            "New order from {$o['customer']['name']} ({$o['customer']['phone']}, {$o['customer']['email']}).\n\n" . $text
            . ($site ? "\n\nOpen it in the admin panel: $site/admin/order.php?n=" . rawurlencode($o['number']) : ''),
            $o['customer']['email']);
    }
    // the customer's copy repeats as little typed-in text as possible (first name only, no notes),
    // so the order form can't be used to send messages to someone else's inbox
    $first = mb_substr(preg_split('/\s+/', trim($o['customer']['name']))[0] ?? '', 0, 30);
    return send_mail($o['customer']['email'], 'Your Mabs Technologies order ' . $o['number'],
        "Hi $first,\n\nThank you for your order. Your reference is {$o['number']}.\n"
        . "We'll be in touch to confirm stock" . ($o['payment'] === 'eft' ? ' and send our banking details' : '') . ".\n\n" . order_text($o, false)
        . "\n\n" . ($m['store_name'] ?? 'Mabs Technologies'), $m['store_to'] ?? null);
}
