<?php
/* CUSTOMERS — shoppers who created an account, with their orders and spend */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require_admin();

$pdo = db();
$ready = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'customers'")->fetchColumn() > 0
    && (int) $pdo->query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'customer_id'")->fetchColumn() > 0;
$q = trim(q('q'));
$customers = [];
$total = 0;
if ($ready) {
    $where = '';
    $args = [];
    if ($q !== '') {
        $where = "WHERE c.email LIKE ? OR CONCAT(c.first_name, ' ', c.last_name) LIKE ? OR REPLACE(c.phone, ' ', '') LIKE ?";
        $like = '%' . addcslashes($q, '%_\\') . '%';
        $args = [$like, $like, '%' . addcslashes(str_replace(' ', '', $q), '%_\\') . '%'];
    }
    $stmt = $pdo->prepare("SELECT c.*, COUNT(o.id) AS orders, COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total END), 0) AS spent, MAX(o.created_at) AS last_order
        FROM customers c LEFT JOIN orders o ON o.customer_id = c.id $where GROUP BY c.id ORDER BY c.created_at DESC LIMIT 200");
    $stmt->execute($args);
    $customers = $stmt->fetchAll();
    $total = (int) $pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
}

function short_day(?string $at): string
{
    return $at ? date('j M Y', strtotime($at)) : '—';
}

page_start('Customers', 'customers');
?>
<div class="head"><h1>Customers</h1><?php if ($ready): ?><span class="muted"><?= $total ?> account<?= $total === 1 ? '' : 's' ?></span><?php endif; ?></div>
<?php if (!$ready): ?>
  <div class="card empty"><p>Customer accounts need a quick database update. <a href="setup.php">Update it now</a></p></div>
<?php else: ?>
<form class="filters" method="get">
  <input type="search" name="q" value="<?= h($q) ?>" placeholder="Name, email or cellphone" aria-label="Search customers">
  <button class="btn btn-ghost" type="submit">Search</button>
</form>
<?php if (!$customers): ?>
  <div class="card empty"><p><?= $q !== '' ? 'No customers match “' . h($q) . '”.' : 'No accounts yet. Customers register from “Register” at the top of the shop.' ?></p></div>
<?php else: ?>
<div class="card table-wrap">
  <table class="table">
    <thead><tr><th>Customer</th><th>Cellphone</th><th>Email</th><th class="num">Orders</th><th class="num">Spent</th><th>Last order</th><th>Joined</th></tr></thead>
    <tbody>
    <?php foreach ($customers as $c): ?>
      <tr>
        <td><span class="strong"><?= h($c['first_name'] . ' ' . $c['last_name']) ?></span><?= $c['newsletter'] ? '<br><small class="muted">Newsletter</small>' : '' ?></td>
        <td class="nowrap"><?= $c['phone'] ? '<a href="tel:' . h(str_replace(' ', '', $c['phone'])) . '">' . h($c['phone']) . '</a>' : '<span class="muted">—</span>' ?></td>
        <td><a href="mailto:<?= h($c['email']) ?>"><?= h($c['email']) ?></a><br>
          <?= $c['email_verified_at'] ? '<small class="pill pill-delivered">Confirmed</small>' : '<small class="pill pill-placed">Not confirmed</small>' ?></td>
        <td class="num"><?= (int) $c['orders'] ? '<a href="orders.php?q=' . h(rawurlencode($c['email'])) . '">' . (int) $c['orders'] . '</a>' : '0' ?></td>
        <td class="num nowrap"><?= h(money((float) $c['spent'])) ?></td>
        <td class="nowrap"><?= h(short_day($c['last_order'])) ?></td>
        <td class="nowrap"><?= h(short_day($c['created_at'])) ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php endif; ?>
<?php endif; ?>
<?php page_end();
