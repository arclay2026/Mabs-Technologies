<?php
/* ADMIN SIGN-IN — 5 wrong passwords from one address locks it for 15 minutes */
declare(strict_types=1);
require __DIR__ . '/_admin.php';

try {
    if (!installed() || admin_count() === 0) redirect('setup.php');
    if (current_admin()) redirect('orders.php');
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
        $hash = $admin['password_hash'] ?? password_hash(random_bytes(12), PASSWORD_DEFAULT);
        if (password_verify($pass, $hash) && $admin) {
            $pdo->prepare('DELETE FROM login_attempts WHERE ip_hash = ?')->execute([ip_hash()]);
            if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
                $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $admin['id']]);
            }
            $pdo->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $admin['id'];
            $_SESSION['seen'] = time();
            unset($_SESSION['csrf']);
            redirect('orders.php');
        }
        $pdo->prepare('INSERT INTO login_attempts (ip_hash) VALUES (?)')->execute([ip_hash()]);
        $error = 'That email and password don’t match.';
    }
}

page_start('Sign in');
?>
<section class="card narrow signin">
  <h1>Sign in</h1>
  <p class="muted">Manage orders, prices and stock for Mabs Technologies.</p>
  <?php if ($error): ?><p class="note note-error" role="alert"><?= h($error) ?></p><?php endif; ?>
  <form method="post" class="form">
    <?= csrf_field() ?>
    <label>Email <input type="email" name="email" required autocomplete="username" value="<?= h($email) ?>" autofocus></label>
    <label>Password <input type="password" name="password" required autocomplete="current-password"></label>
    <button class="btn" type="submit">Sign in</button>
  </form>
</section>
<?php page_end();
