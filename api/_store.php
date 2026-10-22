<?php
/* =====================================================================
   MABS TECHNOLOGIES — CATALOGUE AND ORDERS
   The business rules, shared by the API and the admin panel.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

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
    $categories = array_map(fn ($c) => ['id' => $c['id'], 'name' => $c['name'], 'blurb' => $c['blurb'] ?? ''],
        $pdo->query('SELECT id, name, blurb FROM categories ORDER BY sort, name')->fetchAll());
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

/* ---------- placing an order ---------- */

// any JSON value → trimmed text (arrays and objects become empty)
function clean($s, int $max): string
{
    return is_scalar($s) ? mb_substr(trim((string) $s), 0, $max) : '';
}

/**
 * Validates the cart and details, prices every line from the database,
 * saves the order and reduces stock in one transaction.
 * $input: {items:[{id,qty}], customer:{name,phone,email}, fulfil, payment, address, notes}
 */
function place_order(array $input): array
{
    // cart: merge repeated lines, cap sizes
    $wanted = [];
    foreach ((array) ($input['items'] ?? []) as $line) {
        $id = is_array($line) ? clean($line['id'] ?? '', 80) : '';
        $qty = is_array($line) ? filter_var($line['qty'] ?? null, FILTER_VALIDATE_INT) : false;
        if ($id === '' || $qty === false || $qty < 1 || $qty > 50) throw new ShopError('BAD_ITEM');
        $wanted[$id] = ($wanted[$id] ?? 0) + $qty;
    }
    if (!$wanted) throw new ShopError('EMPTY_CART');
    if (count($wanted) > 50 || max($wanted) > 50) throw new ShopError('BAD_ITEM');

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

    $settings = store_settings();
    if ($fulfil === 'collect' && !$settings['collect']) throw new ShopError('BAD_FULFILMENT');

    $pdo->beginTransaction();
    try {
        // lock the rows so two shoppers can't buy the last unit at once
        $ids = array_keys($wanted);
        sort($ids);
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("SELECT id, name, price, stock FROM products WHERE active = 1 AND id IN ($marks) ORDER BY id FOR UPDATE");
        $stmt->execute($ids);
        $found = [];
        foreach ($stmt as $row) $found[$row['id']] = $row;

        $items = [];
        $subtotal = 0.0;
        foreach ($ids as $id) {
            if (!isset($found[$id])) throw new ShopError('UNKNOWN_PRODUCT', 409, $id);
            $p = $found[$id];
            if ((int) $p['stock'] < $wanted[$id]) throw new ShopError('OUT_OF_STOCK', 409, $id);
            $price = (float) $p['price'];
            $items[] = ['id' => $id, 'name' => $p['name'], 'price' => $price, 'qty' => $wanted[$id]];
            $subtotal += $price * $wanted[$id];
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

        $addItem = $pdo->prepare('INSERT INTO order_items (order_id, product_id, name, unit_price, qty) VALUES (?, ?, ?, ?, ?)');
        $takeStock = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
        foreach ($items as $i) {
            $addItem->execute([$orderId, $i['id'], $i['name'], $i['price'], $i['qty']]);
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
        $pdo->prepare('UPDATE products p JOIN order_items i ON i.product_id = p.id SET p.stock = p.stock + i.qty WHERE i.order_id = ?')
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

function order_text(array $o): string
{
    $lines = [];
    foreach ($o['items'] as $i) {
        $lines[] = sprintf('%d × %s — %s', $i['qty'], $i['name'], money($i['price'] * $i['qty']));
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
        . ($o['notes'] !== '' ? "\nNotes: " . $o['notes'] : '');
}

function send_mail(string $to, string $subject, string $body, ?string $replyTo = null): bool
{
    $m = config()['mail'] ?? [];
    if (empty($m['enabled']) || empty($m['from'])) return false;
    $name = $m['store_name'] ?? 'Mabs Technologies';
    $headers = [
        'From: ' . mb_encode_mimeheader($name) . ' <' . $m['from'] . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'MIME-Version: 1.0',
    ];
    if ($replyTo) $headers[] = 'Reply-To: ' . $replyTo;
    // a failed email must never undo an order that's already saved
    if (!@mail($to, mb_encode_mimeheader($subject), $body, implode("\r\n", $headers))) {
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
    return send_mail($o['customer']['email'], 'Your Mabs Technologies order ' . $o['number'],
        "Hi {$o['customer']['name']},\n\nThank you for your order. Your reference is {$o['number']}.\n"
        . "We'll be in touch to confirm stock" . ($o['payment'] === 'eft' ? ' and send our banking details' : '') . ".\n\n" . $text
        . "\n\n" . ($m['store_name'] ?? 'Mabs Technologies'), $m['store_to'] ?? null);
}
