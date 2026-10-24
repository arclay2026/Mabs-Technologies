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
    $sum = $pdo->query("SELECT COUNT(*) AS total, SUM(email_verified_at IS NOT NULL) AS confirmed, SUM(newsletter) AS news,
        SUM(created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')) AS month FROM customers")->fetch();
    $total = (int) $sum['total'];
    $spent = (float) $pdo->query("SELECT COALESCE(SUM(total), 0) FROM orders WHERE customer_id IS NOT NULL AND status <> 'cancelled'")->fetchColumn();
}

function short_day(?string $at): string
{
    return $at ? date('j M Y', strtotime($at)) : '—';
}

page_start('Customers', 'customers');
?>
<div class="head">
  <div><h1>Customers</h1><p class="head-sub">Shoppers who created an account. Guests who check out without one appear under Orders.</p></div>
  <?php if ($ready): ?>
  <form class="search" method="get"><input type="search" name="q" value="<?= h($q) ?>" placeholder="Name, email or cellphone" aria-label="Search customers"><button class="btn btn-ghost" type="submit">Search</button></form>
  <?php endif; ?>
</div>
<?php if (!$ready): ?>
  <div class="card empty"><p>Customer accounts need a quick database update. <a href="setup.php">Update it now</a></p></div>
<?php else: ?>
<div class="stats">
  <div class="stat"><?= icon('customers') ?><span>Accounts</span><b><?= $total ?></b><small><?= (int) $sum['month'] ?> new this month</small></div>
  <div class="stat stat-green"><?= icon('check') ?><span>Email confirmed</span><b><?= $total ? round((int) $sum['confirmed'] / $total * 100) : 0 ?>%</b><small><?= (int) $sum['confirmed'] ?> of <?= $total ?></small></div>
  <div class="stat stat-violet"><?= icon('mail') ?><span>Newsletter</span><b><?= (int) $sum['news'] ?></b><small>want deals by email</small></div>
  <div class="stat stat-teal"><?= icon('money') ?><span>Spent by account holders</span><b><?= h(money($spent)) ?></b><small>all time, not counting cancelled orders</small></div>
</div>
<?php if (!$customers): ?>
  <div class="card empty"><p><?= $q !== '' ? 'No customers match “' . h($q) . '”.' : 'No accounts yet. Customers register from “Register” at the top of the shop.' ?></p></div>
<?php else: ?>
<div class="card table-wrap">
  <table class="table">
    <thead><tr><th>Customer</th><th>Contact</th><th class="num">Orders</th><th class="num">Spent</th><th>Last order</th></tr></thead>
    <tbody>
    <?php foreach ($customers as $c): $name = $c['first_name'] . ' ' . $c['last_name']; ?>
      <tr>
        <td><div class="person"><?= monogram($name) ?><span class="person-text"><b><?= h($name) ?></b><small>Joined <?= h(short_day($c['created_at'])) ?></small></span></div></td>
        <td><div class="contact">
          <span><a href="mailto:<?= h($c['email']) ?>"><?= h($c['email']) ?></a>
            <?= $c['email_verified_at'] ? '<span class="tag tag-ok">' . icon('check') . 'Confirmed</span>' : '<span class="tag tag-wait">Not confirmed</span>' ?>
            <?= $c['newsletter'] ? '<span class="tag tag-news">Newsletter</span>' : '' ?></span>
          <?= $c['phone'] ? '<a href="tel:' . h(str_replace(' ', '', $c['phone'])) . '" class="muted">' . h($c['phone']) . '</a>' : '<span class="muted">No cellphone</span>' ?>
        </div></td>
        <td class="num"><a class="n-link<?= (int) $c['orders'] ? '' : ' n-zero' ?>" href="orders.php?q=<?= h(rawurlencode($c['email'])) ?>"><?= (int) $c['orders'] ?></a></td>
        <td class="num nowrap money"><?= h(money((float) $c['spent'])) ?></td>
        <td class="nowrap"><?= h(short_day($c['last_order'])) ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php endif; ?>
<?php endif; ?>
<?php page_end();
