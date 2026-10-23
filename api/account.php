<?php
/* /api/account.php?action=… — customer accounts (see _account.php)
   GET  me                    → {customer|null}
   GET  orders                → {orders}            (signed in)
   POST signup   {firstName, lastName, email, phone?, password, newsletter?, remember?} → {customer, emailed}
   POST signin   {email, password, remember?}       → {customer}
   POST signout                                      → {ok}
   POST verify   {token}                             → {verified, customer|null}
   POST resend                                       → {emailed}          (signed in)
   POST forgot   {email}                             → {ok, mail}
   POST reset    {token, password}                   → {customer}
   POST update   {firstName, lastName, phone?, newsletter?} → {customer}  (signed in)
   POST password {current, password}                 → {ok}               (signed in)
   Errors: {error: BAD_LOGIN|EMAIL_TAKEN|WEAK_PASSWORD|BAD_EMAIL|BAD_PHONE|MISSING_NAME|BAD_LINK|BAD_PASSWORD|SIGNED_OUT|TOO_MANY|…} */
declare(strict_types=1);
require __DIR__ . '/_account.php';

try {
    cors();
    header('Cache-Control: no-store');
    $action = is_string($_GET['action'] ?? null) ? $_GET['action'] : '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        if ($action === 'me') {
            $me = current_customer();
            json_out(['customer' => $me ? customer_public($me) : null]);
        }
        if ($action === 'orders') {
            $me = current_customer();
            if (!$me) throw new ShopError('SIGNED_OUT', 401);
            json_out(account_orders($me));
        }
        json_out(['error' => 'NOT_FOUND'], 404);
    }
    if ($method !== 'POST') json_out(['error' => 'METHOD'], 405);

    // only the shop's own pages may post here: a JSON body (which a plain form on another site can't send)
    // and, when the browser says where it came from, this site or one listed in cors_origins
    if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) json_out(['error' => 'BAD_JSON'], 415);
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '' && preg_replace('#^https?://#', '', $origin) !== ($_SERVER['HTTP_HOST'] ?? '')
        && !in_array($origin, config()['cors_origins'] ?? [], true)) {
        json_out(['error' => 'FORBIDDEN'], 403);
    }
    $in = json_input(4000);

    switch ($action) {
        case 'signup': json_out(account_signup($in), 201);
        case 'signin': json_out(account_signin($in));
        case 'signout': sign_out(); json_out(['ok' => true]);
        case 'verify': json_out(account_verify($in));
        case 'forgot': json_out(account_forgot($in));
        case 'reset': json_out(account_reset($in));
    }
    $me = current_customer();
    if (!$me) throw new ShopError('SIGNED_OUT', 401);
    switch ($action) {
        case 'resend': json_out(account_resend($me));
        case 'update': json_out(account_update($me, $in));
        case 'password': json_out(account_password_change($me, $in));
    }
    json_out(['error' => 'NOT_FOUND'], 404);
} catch (ShopError $e) {
    json_out(['error' => $e->code_name], $e->http);
} catch (Throwable $e) {
    api_fail($e);
}
