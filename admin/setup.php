<?php
/* =====================================================================
   FIRST-TIME SETUP
   1. checks api/config.php and the database connection
   2. installs the tables and the starting catalogue
   3. creates the first admin account
   Both steps ask for the setup key (the 'secret' in api/config.php), so
   nobody else can run them. Once an admin exists this page is locked.
   ===================================================================== */
declare(strict_types=1);
require __DIR__ . '/_admin.php';

$step = 'config';
$problem = '';
try {
    config();
    db();
    $step = !installed() ? 'install' : (admin_count() === 0 ? 'admin' : 'done');
} catch (RuntimeException $e) {
    $problem = $e->getMessage();
} catch (PDOException $e) {
    $step = 'connect';
    error_log('[mabs] setup: ' . $e->getMessage());
}

function setup_key_ok(): bool
{
    $secret = (string) (config()['secret'] ?? '');
    return strlen($secret) >= 16 && $secret !== 'replace-with-a-long-random-string'
        && hash_equals($secret, (string) ($_POST['key'] ?? ''));
}

function run_sql_file(PDO $pdo, string $file): void
{
    $sql = preg_replace('/^\s*--.*$/m', '', (string) file_get_contents($file));
    foreach (preg_split('/;\s*\n/', $sql) as $statement) {
        if (trim($statement) !== '') $pdo->exec($statement);
    }
}

$error = '';
if ($step === 'install' && is_post()) {
    if (!setup_key_ok()) {
        $error = 'That setup key doesn’t match the secret in api/config.php.';
    } else {
        try {
            run_sql_file(db(), MABS_ROOT . '/database/schema.sql');
            run_sql_file(db(), MABS_ROOT . '/database/seed.sql');
            flash('Database installed with the starting catalogue.');
            redirect('setup.php');
        } catch (PDOException $e) {
            error_log('[mabs] install: ' . $e->getMessage());
            $error = 'The database couldn’t be installed: ' . $e->getMessage();
        }
    }
}

if ($step === 'admin' && is_post()) {
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $pass = (string) ($_POST['password'] ?? '');
    if (!setup_key_ok()) {
        $error = 'That setup key doesn’t match the secret in api/config.php.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Enter a valid email address.';
    } elseif (strlen($pass) < 10) {
        $error = 'Use a password of at least 10 characters.';
    } elseif ($pass !== ($_POST['confirm'] ?? '')) {
        $error = 'The passwords don’t match.';
    } elseif (admin_count() > 0) {
        redirect('index.php');
    } else {
        db()->prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)')->execute([$email, password_hash($pass, PASSWORD_DEFAULT)]);
        flash('Your admin account is ready. Sign in to continue.');
        redirect('index.php');
    }
}

page_start('Setup');
?>
<section class="card narrow">
  <h1>Set up the shop backend</h1>
  <ol class="steps">
    <li class="<?= $step === 'config' ? 'now' : 'done' ?>">Settings file</li>
    <li class="<?= in_array($step, ['config', 'connect'], true) ? ($step === 'connect' ? 'now' : '') : 'done' ?>">Database connection</li>
    <li class="<?= $step === 'install' ? 'now' : (in_array($step, ['admin', 'done'], true) ? 'done' : '') ?>">Install tables</li>
    <li class="<?= $step === 'admin' ? 'now' : ($step === 'done' ? 'done' : '') ?>">Admin account</li>
  </ol>
  <?php if ($error): ?><p class="note note-error" role="alert"><?= h($error) ?></p><?php endif; ?>

  <?php if ($step === 'config'): ?>
    <p><?= h($problem) ?></p>
    <p class="muted">On your hosting, copy <code>api/config.sample.php</code> to <code>api/config.php</code> and fill in the database name, user and password from your control panel, plus a long random <code>secret</code>. Then refresh this page.</p>

  <?php elseif ($step === 'connect'): ?>
    <p>The database settings in <code>api/config.php</code> don’t work yet — the database couldn’t be reached.</p>
    <p class="muted">Check the host, database name, user and password (and that the user has access to that database), then refresh this page.</p>

  <?php elseif ($step === 'install'): ?>
    <p>Connected. This creates the shop’s tables and loads the starting catalogue (4 departments, 12 brands, 40 products).</p>
    <form method="post" class="form">
      <?= csrf_field() ?>
      <label>Setup key <span class="hint">the <code>secret</code> from api/config.php</span>
        <input type="password" name="key" required autocomplete="off"></label>
      <button class="btn" type="submit">Install database</button>
    </form>

  <?php elseif ($step === 'admin'): ?>
    <p>Create the account you’ll use to manage orders and products.</p>
    <form method="post" class="form">
      <?= csrf_field() ?>
      <label>Email <input type="email" name="email" required autocomplete="username" value="<?= h($_POST['email'] ?? '') ?>"></label>
      <label>Password <span class="hint">at least 10 characters</span>
        <input type="password" name="password" required minlength="10" autocomplete="new-password"></label>
      <label>Confirm password <input type="password" name="confirm" required minlength="10" autocomplete="new-password"></label>
      <label>Setup key <span class="hint">the <code>secret</code> from api/config.php</span>
        <input type="password" name="key" required autocomplete="off"></label>
      <button class="btn" type="submit">Create admin account</button>
    </form>

  <?php else: ?>
    <p>Setup is complete.</p>
    <p><a class="btn" href="index.php">Sign in</a></p>
  <?php endif; ?>
</section>
<?php page_end();
