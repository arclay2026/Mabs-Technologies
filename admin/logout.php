<?php
/* SIGN OUT (POST only, so a link elsewhere can't sign you out) */
declare(strict_types=1);
require __DIR__ . '/_admin.php';

if (is_post()) {
    $_SESSION = [];
    session_regenerate_id(true);
    flash('You’ve been signed out.');
}
redirect('index.php');
