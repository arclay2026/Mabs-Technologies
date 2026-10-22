<?php
/* =====================================================================
   MABS TECHNOLOGIES — SHARED BACKEND SETUP
   Loaded by the API endpoints and the admin panel. Files starting with
   "_" are never served directly (see api/.htaccess).
   ===================================================================== */
declare(strict_types=1);

const MABS_ROOT = __DIR__ . '/..';
const ORDER_STATUSES = [
    'placed' => 'Placed', 'confirmed' => 'Confirmed', 'out_for_delivery' => 'Out for delivery',
    'ready_for_collection' => 'Ready for collection', 'delivered' => 'Delivered',
    'collected' => 'Collected', 'cancelled' => 'Cancelled',
];
const PAYMENT_STATUSES = ['unpaid' => 'Unpaid', 'paid' => 'Paid', 'refunded' => 'Refunded'];
const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];

date_default_timezone_set('Africa/Johannesburg');

function config(): array
{
    static $config;
    if ($config === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) {
            throw new RuntimeException('api/config.php is missing. Copy api/config.sample.php to api/config.php and fill it in.');
        }
        $config = require $file;
    }
    return $config;
}

function db(): PDO
{
    static $pdo;
    if ($pdo === null) {
        $c = config()['db'];
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], (int) ($c['port'] ?? 3306), $c['name']);
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec("SET time_zone = '+02:00'");
    }
    return $pdo;
}

// the visitor's address, hashed so raw IP addresses are never stored
function ip_hash(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $header = config()['client_ip_header'] ?? '';
    if ($header !== '' && !empty($_SERVER[$header])) {
        $ip = trim(explode(',', (string) $_SERVER[$header])[0]);
    }
    // one IPv6 connection can use any address in its /64, so count the /64 as one visitor
    $bin = @inet_pton($ip);
    if ($bin !== false && strlen($bin) === 16) $ip = bin2hex(substr($bin, 0, 8)) . '::/64';
    return hash('sha256', $ip . '|' . (config()['secret'] ?? ''));
}

function money(float $amount): string
{
    $decimals = fmod($amount, 1.0) == 0.0 ? 0 : 2;
    return 'R' . number_format($amount, $decimals, '.', "\u{00a0}");
}

/* ---------- JSON API helpers ---------- */

function cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, config()['cors_origins'] ?? [], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_input(int $maxBytes = 20000): array
{
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) {
        json_out(['error' => 'TOO_LARGE'], 413);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_out(['error' => 'BAD_JSON'], 400);
    }
    return $data;
}

// log the real problem, tell the browser only that something went wrong
function api_fail(Throwable $e): void
{
    error_log('[mabs] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    json_out(['error' => 'SERVER'], 500);
}
