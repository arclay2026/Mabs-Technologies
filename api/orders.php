<?php
/* POST api/orders.php — place an order
   Body: {items:[{id,qty,size?}], customer:{name,phone,email}, fulfil, payment, address, notes}
   201 → the saved order; 409 {error: OUT_OF_STOCK|UNKNOWN_PRODUCT|BAD_SIZE, product}; 422/429 {error} */
declare(strict_types=1);
require __DIR__ . '/_store.php';

try {
    cors();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'METHOD'], 405);
    $input = json_input();
    if (!empty($input['website'])) json_out(['error' => 'BAD_ITEM'], 422); // spam bots fill hidden fields
    json_out(place_order($input), 201);
} catch (ShopError $e) {
    json_out(array_filter(['error' => $e->code_name, 'product' => $e->product]), $e->http);
} catch (Throwable $e) {
    api_fail($e);
}
