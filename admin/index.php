<?php
/* ADMIN SIGN-IN — 5 wrong passwords from one address locks it for 15 minutes */
declare(strict_types=1);
require __DIR__ . '/_admin.php';

try {
    if (!installed() || admin_count() === 0) redirect('setup.php');
    if (current_admin()) redirect(safe_next(q('next')));
} catch (Throwable $e) {
    redirect('setup.php');
}

$error = '';
$email = '';
if (is_post()) {
    $pdo = db();
    $pdo->exec('DELETE FROM login_attempts WHERE at < NOW() - INTERVAL 1 DAY');
    $tries = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip_hash = ? AND at > NOW() - INTERVAL 15 MINUTE');
    $tries->execute([ip_hash()]);
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $pass = (string) ($_POST['password'] ?? '');

    if ((int) $tries->fetchColumn() >= 5) {
        $error = 'Too many attempts. Wait 15 minutes and try again.';
    } else {
        $stmt = $pdo->prepare('SELECT id, password_hash FROM admins WHERE email = ?');
        $stmt->execute([$email]);
        $admin = $stmt->fetch();
        // hash something even when the email is unknown, so both cases take as long
        $hash = $admin['password_hash'] ?? password_hash(bin2hex(random_bytes(12)), PASSWORD_DEFAULT);
        if (password_verify($pass, $hash) && $admin) {
            $pdo->prepare('DELETE FROM login_attempts WHERE ip_hash = ?')->execute([ip_hash()]);
            if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
                $hash = password_hash($pass, PASSWORD_DEFAULT);
                $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([$hash, $admin['id']]);
            }
            $pdo->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $admin['id'];
            $_SESSION['pw'] = password_mark($hash);
            $_SESSION['seen'] = time();
            unset($_SESSION['csrf']);
            redirect(safe_next(q('next')));
        }
        $pdo->prepare('INSERT INTO login_attempts (ip_hash) VALUES (?)')->execute([ip_hash()]);
        $error = 'That email and password don’t match.';
    }
}

page_start('Sign in', '', 'auth');
?>
<aside class="auth-brand" aria-hidden="true">
  <img class="auth-logo" src="../assets/logo-light.svg" alt="" height="30">
  <div class="auth-brand-copy">
    <p class="auth-eyebrow">Store management</p>
    <p class="auth-headline">Everything behind your shop, in one place.</p>
    <ul class="auth-points">
      <li><?= icon('orders') ?><span><b>Orders</b>Confirm, track and update every order.</span></li>
      <li><?= icon('products') ?><span><b>Products &amp; stock</b>Prices, specials, photos and stock levels.</span></li>
      <li><?= icon('customers') ?><span><b>Customers &amp; reviews</b>Accounts, spend and what shoppers say.</span></li>
    </ul>
  </div>
  <p class="auth-foot">&copy; <?= date('Y') ?> Mabs Technologies</p>
</aside>

<section class="auth-panel" aria-labelledby="signin-title">
  <div class="auth-box">
    <img class="auth-logo-mobile" src="../assets/logo.svg" alt="Mabs Technologies" height="28">
    <span class="auth-badge"><?= icon('lock') ?></span>
    <h1 id="signin-title">Welcome back</h1>
    <p class="auth-sub">Sign in to manage your store.</p>
    <?= flashes() ?>
    <?php if ($error): ?><p class="note note-error" role="alert"><?= h($error) ?></p><?php endif; ?>
    <form method="post" class="form auth-form">
      <?= csrf_field() ?>
      <label>Email address
        <span class="field-icon"><?= icon('mail') ?><input type="email" name="email" required autocomplete="username" value="<?= h($email) ?>" placeholder="you@example.com" autofocus></span></label>
      <label>Password
        <span class="field-icon"><?= icon('lock') ?><input type="password" name="password" id="admin-pw" required autocomplete="current-password" placeholder="Your password">
          <button type="button" class="pw-toggle" data-pw-toggle="admin-pw" aria-label="Show password" aria-pressed="false"><?= icon('eye') ?></button></span></label>
      <button class="btn btn-lg btn-block" type="submit">Sign in <?= icon('arrow') ?></button>
    </form>
    <p class="auth-secure"><?= icon('shield') ?><span>Private area for the store owner. After 5 wrong passwords, sign-in pauses for 15 minutes.</span></p>
  </div>
  <a class="auth-back" href="../index.html"><?= icon('back') ?>Back to the shop</a>
</section>
<?php page_end();
