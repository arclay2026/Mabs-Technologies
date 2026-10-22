<?php
/* =====================================================================
   MABS TECHNOLOGIES — PRODUCT REVIEWS
   Anyone can write a review; it shows in the shop once approved in the
   admin panel. A review is marked "Verified buyer" when its email placed
   a (not cancelled) order containing that product.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/_store.php';

const REVIEW_SORTS = [
    'newest' => 'created_at DESC, id DESC',
    'highest' => 'rating DESC, created_at DESC, id DESC',
    'lowest' => 'rating ASC, created_at DESC, id DESC',
];
const REVIEWS_PER_PAGE = 10;

/** {avg, count} per product from approved reviews, for the catalogue */
function review_summaries(): array
{
    $out = [];
    foreach (db()->query("SELECT product_id, ROUND(AVG(rating), 1) avg, COUNT(*) n FROM reviews WHERE status = 'approved' GROUP BY product_id") as $r) {
        $out[$r['product_id']] = ['avg' => (float) $r['avg'], 'count' => (int) $r['n']];
    }
    return $out;
}

/** approved reviews for one product, with the star breakdown */
function product_reviews(string $productId, string $sort = 'newest', int $page = 1): array
{
    $pdo = db();
    $dist = ['5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0];
    $stmt = $pdo->prepare("SELECT rating, COUNT(*) n FROM reviews WHERE product_id = ? AND status = 'approved' GROUP BY rating");
    $stmt->execute([$productId]);
    $count = 0;
    $sum = 0;
    foreach ($stmt as $r) {
        $dist[(string) $r['rating']] = (int) $r['n'];
        $count += (int) $r['n'];
        $sum += (int) $r['rating'] * (int) $r['n'];
    }
    $order = REVIEW_SORTS[$sort] ?? REVIEW_SORTS['newest'];
    $page = max(1, min($page, 1000));
    $stmt = $pdo->prepare("SELECT rating, title, body, name, verified, reply, COALESCE(approved_at, created_at) AS at
                           FROM reviews WHERE product_id = ? AND status = 'approved'
                           ORDER BY $order LIMIT " . (REVIEWS_PER_PAGE + 1) . ' OFFSET ' . (($page - 1) * REVIEWS_PER_PAGE));
    $stmt->execute([$productId]);
    $rows = $stmt->fetchAll();
    $more = count($rows) > REVIEWS_PER_PAGE;
    return [
        'summary' => ['avg' => $count ? round($sum / $count, 1) : 0, 'count' => $count, 'dist' => $dist],
        'reviews' => array_map(fn ($r) => [
            'rating' => (int) $r['rating'], 'title' => $r['title'] ?? '', 'body' => $r['body'], 'name' => $r['name'],
            'verified' => (bool) $r['verified'], 'reply' => $r['reply'] ?? '', 'date' => date('c', strtotime($r['at'])),
        ], array_slice($rows, 0, REVIEWS_PER_PAGE)),
        'more' => $more,
    ];
}

/** validates and saves a new review as pending */
function submit_review(array $in): array
{
    $productId = clean($in['product'] ?? '', 80);
    $rating = filter_var($in['rating'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
    $title = clean($in['title'] ?? '', 120);
    $body = clean($in['body'] ?? '', 3000);
    $name = clean($in['name'] ?? '', 80);
    $email = strtolower(clean($in['email'] ?? '', 190));
    $orderNo = strtoupper(clean($in['order'] ?? '', 20));

    if ($rating === false) throw new ShopError('BAD_RATING');
    if (mb_strlen($body) < 10) throw new ShopError('SHORT_REVIEW');
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ShopError('MISSING_DETAILS');

    $pdo = db();
    $exists = $pdo->prepare('SELECT 1 FROM products WHERE id = ? AND active = 1');
    $exists->execute([$productId]);
    if (!$exists->fetchColumn()) throw new ShopError('UNKNOWN_PRODUCT', 404);

    $recent = $pdo->prepare('SELECT COUNT(*) FROM reviews WHERE ip_hash = ? AND created_at > NOW() - INTERVAL 1 HOUR');
    $recent->execute([ip_hash()]);
    if ((int) $recent->fetchColumn() >= 5) throw new ShopError('TOO_MANY_REVIEWS', 429);

    $dupe = $pdo->prepare("SELECT 1 FROM reviews WHERE email = ? AND product_id = ? AND status <> 'rejected'");
    $dupe->execute([$email, $productId]);
    if ($dupe->fetchColumn()) throw new ShopError('ALREADY_REVIEWED', 409);

    $verified = false;
    if ($orderNo !== '') {
        $bought = $pdo->prepare("SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id
                                 WHERE o.number = ? AND o.customer_email = ? AND i.product_id = ? AND o.status <> 'cancelled' LIMIT 1");
        $bought->execute([$orderNo, $email, $productId]);
        $verified = (bool) $bought->fetchColumn();
    }

    $pdo->prepare('INSERT INTO reviews (product_id, rating, title, body, name, email, verified, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$productId, $rating, $title !== '' ? $title : null, $body, $name, $email, $verified ? 1 : 0, ip_hash()]);

    $m = config()['mail'] ?? [];
    if (!empty($m['store_to'])) {
        $site = rtrim((string) (config()['site_url'] ?? ''), '/');
        send_mail($m['store_to'], "New {$rating}-star review waiting for approval",
            "$name wrote a $rating-star review" . ($verified ? ' (verified buyer)' : '') . ":\n\n"
            . ($title !== '' ? "$title\n" : '') . "$body\n\n"
            . ($site ? "Approve or reject it: $site/admin/reviews.php" : 'Approve or reject it in the admin panel under Reviews.'));
    }
    return ['status' => 'pending']; // never says whether this email bought the product
}
