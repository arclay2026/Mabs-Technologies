<?php
/* =====================================================================
   MABS TECHNOLOGIES — BACKEND SETTINGS
   ---------------------------------------------------------------------
   Copy this file to api/config.php on the server and fill it in.
   config.php is ignored by git, so passwords never reach GitHub.
   ===================================================================== */
return [
    // MySQL / MariaDB database (create it in your hosting control panel)
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'mabs_store',
        'user' => 'mabs_user',
        'pass' => 'change-me',
    ],

    // a long random string; used to hash IP addresses for rate limiting.
    // Generate one at https://www.random.org/strings/ or with: php -r "echo bin2hex(random_bytes(32));"
    'secret' => 'replace-with-a-long-random-string',

    // order emails (PHP's mail(); most hosts support it)
    'mail' => [
        'enabled'  => true,
        'from'     => 'orders@your-domain.co.za',   // an address on your own domain
        'store_to' => 'you@your-domain.co.za',      // where new-order alerts go
        'store_name' => 'Mabs Technologies',
    ],

    // the shop's public address, used in emails and admin links
    'site_url' => 'https://your-domain.co.za',

    // leave empty unless the site sits behind a CDN or proxy that hides
    // visitors' addresses (then every visitor looks the same and order limits
    // apply to everyone at once). Behind Cloudflare: 'HTTP_CF_CONNECTING_IP'
    'client_ip_header' => '',

    // only needed if the shop pages are served from a different domain than
    // this API (e.g. GitHub Pages): list those origins here
    'cors_origins' => [
        // 'https://arclay2026.github.io',
    ],
];
