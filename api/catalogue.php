<?php
/* GET api/catalogue.php — products, brands, departments and delivery settings */
declare(strict_types=1);
require __DIR__ . '/_store.php';

try {
    cors();
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['error' => 'METHOD'], 405);
    json_out(catalogue());
} catch (Throwable $e) {
    api_fail($e);
}
