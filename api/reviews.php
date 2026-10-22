<?php
/* api/reviews.php
   GET  ?product=<id>&sort=newest|highest|lowest&page=1 → {summary:{avg,count,dist}, reviews:[…], more}
   POST {product, rating, title, body, name, email, order?} → 201 {status:"pending"}
        errors: 422 BAD_RATING|SHORT_REVIEW|MISSING_DETAILS, 404 UNKNOWN_PRODUCT,
                409 ALREADY_REVIEWED, 429 TOO_MANY_REVIEWS */
declare(strict_types=1);
require __DIR__ . '/_reviews.php';

try {
    cors();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        json_out(product_reviews((string) ($_GET['product'] ?? ''), (string) ($_GET['sort'] ?? 'newest'), (int) ($_GET['page'] ?? 1)));
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'METHOD'], 405);
    $input = json_input(10000);
    if (!empty($input['website'])) json_out(['error' => 'MISSING_DETAILS'], 422); // spam trap
    json_out(submit_review($input), 201);
} catch (ShopError $e) {
    json_out(['error' => $e->code_name], $e->http);
} catch (Throwable $e) {
    api_fail($e);
}
