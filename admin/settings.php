<?php
/* SETTINGS — delivery charges and your admin password */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
$admin = require_admin();

$pdo = db();
$s = store_settings();
$v = ['fee' => plain_amount((string) $s['courierFee']), 'free' => plain_amount((string) $s['freeOver']), 'collect' => $s['collect']];
$errors = [];

if (is_post()) {
    if (($_POST['action'] ?? '') === 'delivery') {
        $v = ['fee' => trim((string) ($_POST['fee'] ?? '')), 'free' => trim((string) ($_POST['free'] ?? '')), 'collect' => !empty($_POST['collect'])];
        $fee = parse_money($v['fee']);
        $free = parse_money($v['free']);
        if ($fee === null) $errors['fee'] = 'Enter the courier fee in rand (0 for free delivery).';
        if ($free === null) $errors['free'] = 'Enter an amount in rand.';
        if (!$errors) {
            $pdo->prepare('UPDATE store_settings SET courier_fee = ?, free_over = ?, collect = ? WHERE id = 1')->execute([$fee, $free, $v['collect'] ? 1 : 0]);
            flash('Delivery settings saved. The shop shows them within 5 minutes.');
            redirect('settings.php');
        }
    } elseif (($_POST['action'] ?? '') === 'password') {
        $stmt = $pdo->prepare('SELECT password_hash FROM admins WHERE id = ?');
        $stmt->execute([$admin['id']]);
        $new = (string) ($_POST['new'] ?? '');
        if (!password_verify((string) ($_POST['current'] ?? ''), (string) $stmt->fetchColumn())) {
            $errors['current'] = 'That isn’t your current password.';
        } elseif (strlen($new) < 10) {
            $errors['new'] = 'Use at least 10 characters.';
        } elseif ($new !== ($_POST['confirm'] ?? '')) {
            $errors['confirm'] = 'The new passwords don’t match.';
        } else {
            $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $admin['id']]);
            session_regenerate_id(true);
            flash('Password changed.');
            redirect('settings.php');
        }
    }
}

function err(array $errors, string $f): string
{
    return isset($errors[$f]) ? '<span class="field-error">' . h($errors[$f]) . '</span>' : '';
}

page_start('Settings', 'settings');
?>
<div class="head"><h1>Settings</h1></div>
<div class="cols cols-even">
  <section class="card">
    <h2>Delivery</h2>
    <form method="post" class="form">
      <?= csrf_field() ?><input type="hidden" name="action" value="delivery">
      <label>Courier fee per order (R) <?= err($errors, 'fee') ?>
        <input name="fee" value="<?= h($v['fee']) ?>" inputmode="decimal" required></label>
      <label>Free delivery on orders of (R) <span class="hint">or more</span> <?= err($errors, 'free') ?>
        <input name="free" value="<?= h($v['free']) ?>" inputmode="decimal" required></label>
      <label class="check"><input type="checkbox" name="collect" value="1"<?= $v['collect'] ? ' checked' : '' ?>> Customers can collect in store (free)</label>
      <button class="btn" type="submit">Save delivery settings</button>
    </form>
  </section>
  <section class="card">
    <h2>Your account</h2>
    <p class="muted">Signed in as <?= h($admin['email']) ?></p>
    <form method="post" class="form">
      <?= csrf_field() ?><input type="hidden" name="action" value="password">
      <input type="text" name="username" value="<?= h($admin['email']) ?>" autocomplete="username" hidden>
      <label>Current password <?= err($errors, 'current') ?><input type="password" name="current" required autocomplete="current-password"></label>
      <label>New password <span class="hint">at least 10 characters</span> <?= err($errors, 'new') ?><input type="password" name="new" required minlength="10" autocomplete="new-password"></label>
      <label>Confirm new password <?= err($errors, 'confirm') ?><input type="password" name="confirm" required minlength="10" autocomplete="new-password"></label>
      <button class="btn btn-ghost" type="submit">Change password</button>
    </form>
  </section>
</div>
<?php page_end();
