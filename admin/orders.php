<?php
/* ORDERS — newest first, filtered by status tab and search */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require_admin();

const PER_PAGE = 25;
const TABS = [
    'open' => ['Open', ['placed', 'confirmed', 'out_for_delivery', 'ready_for_collection']],
    'placed' => ['New', ['placed']],
    'confirmed' => ['Confirmed', ['confirmed']],
    'on_the_way' => ['Out / ready', ['out_for_delivery', 'ready_for_collection']],
    'completed' => ['Completed', ['delivered', 'collected']],
    'cancelled' => ['Cancelled', ['cancelled']],
    'all' => ['All', []],
];

$pdo = db();
$tab = isset(TABS[q('tab')]) ? q('tab') : 'open';
$q = trim(q('q'));
$page = max(1, (int) (q('page') ?: 1));

$counts = array_column($pdo->query('SELECT status, COUNT(*) n FROM orders GROUP BY status')->fetchAll(), 'n', 'status');
$tabCount = fn (array $statuses) => array_sum(array_map(fn ($s) => (int) ($counts[$s] ?? 0), $statuses ?: array_keys(ORDER_STATUSES)));

$where = [];
$args = [];
if (TABS[$tab][1]) {
    $where[] = 'o.status IN (' . implode(',', array_fill(0, count(TABS[$tab][1]), '?')) . ')';
    array_push($args, ...TABS[$tab][1]);
}
if ($q !== '') {
    $where[] = '(o.number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR REPLACE(o.customer_phone, \' \', \'\') LIKE ?)';
    $like = '%' . addcslashes($q, '%_\\') . '%';
    array_push($args, $like, $like, $like, '%' . addcslashes(str_replace(' ', '', $q), '%_\\') . '%');
}
$sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$total = $pdo->prepare("SELECT COUNT(*) FROM orders o $sqlWhere");
$total->execute($args);
$total = (int) $total->fetchColumn();
$pages = max(1, (int) ceil($total / PER_PAGE));
$page = min($page, $pages);

$stmt = $pdo->prepare("SELECT o.*, (SELECT SUM(qty) FROM order_items i WHERE i.order_id = o.id) AS units
                       FROM orders o $sqlWhere ORDER BY o.created_at DESC, o.id DESC LIMIT " . PER_PAGE . ' OFFSET ' . (($page - 1) * PER_PAGE));
$stmt->execute($args);
$orders = $stmt->fetchAll();

$link = fn (array $over) => 'orders.php?' . http_build_query(array_filter(array_merge(['tab' => $tab, 'q' => $q, 'page' => null], $over)));

$today = $pdo->query("SELECT COUNT(*) n, COALESCE(SUM(total), 0) t FROM orders WHERE status <> 'cancelled' AND created_at >= CURDATE()")->fetch();
$month = $pdo->query("SELECT COUNT(*) n, COALESCE(SUM(total), 0) t FROM orders WHERE status <> 'cancelled' AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')")->fetch();
$low = (int) $pdo->query('SELECT COUNT(*) FROM products WHERE active = 1 AND stock <= 2')->fetchColumn();

page_start('Orders', 'orders');
?>
<div class="head">
  <h1>Orders</h1>
  <form class="search" method="get" role="search">
    <input type="hidden" name="tab" value="<?= h($tab) ?>">
    <input type="search" name="q" value="<?= h($q) ?>" placeholder="Order number, name, email or phone" aria-label="Search orders">
    <button class="btn btn-ghost" type="submit">Search</button>
  </form>
</div>

<div class="stats">
  <div class="stat"><span>New orders</span><b><?= (int) ($counts['placed'] ?? 0) ?></b></div>
  <div class="stat"><span>Today</span><b><?= h(money((float) $today['t'])) ?></b><small><?= (int) $today['n'] ?> order<?= $today['n'] == 1 ? '' : 's' ?></small></div>
  <div class="stat"><span>This month</span><b><?= h(money((float) $month['t'])) ?></b><small><?= (int) $month['n'] ?> order<?= $month['n'] == 1 ? '' : 's' ?></small></div>
  <a class="stat<?= $low ? ' stat-warn' : '' ?>" href="products.php?stock=low"><span>Low on stock</span><b><?= $low ?></b><small>products with 2 or fewer</small></a>
</div>

<nav class="tabs" aria-label="Order status">
  <?php foreach (TABS as $key => [$label, $statuses]): ?>
    <a href="<?= h($link(['tab' => $key, 'page' => null])) ?>"<?= $key === $tab ? ' aria-current="page"' : '' ?>><?= h($label) ?> <span class="count"><?= $tabCount($statuses) ?></span></a>
  <?php endforeach; ?>
</nav>

<?php if (!$orders): ?>
  <div class="card empty"><p><?= $q !== '' ? 'No orders match “' . h($q) . '”.' : 'No orders here yet.' ?></p></div>
<?php else: ?>
  <div class="card table-wrap">
    <table class="table">
      <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th class="num">Items</th><th class="num">Total</th><th>Method</th><th>Payment</th><th>Status</th></tr></thead>
      <tbody>
      <?php foreach ($orders as $o): ?>
        <tr>
          <td class="nowrap"><a class="strong" href="order.php?n=<?= h(rawurlencode($o['number'])) ?>"><?= h($o['number']) ?></a></td>
          <td class="nowrap"><?= h(when($o['created_at'])) ?></td>
          <td><?= h($o['customer_name']) ?><br><small class="muted"><?= h($o['customer_phone']) ?></small></td>
          <td class="num"><?= (int) $o['units'] ?></td>
          <td class="num nowrap"><?= h(money((float) $o['total'])) ?></td>
          <td><?= $o['fulfilment'] === 'collect' ? 'Collect' : 'Courier' ?></td>
          <td><?= h(pay_label($o)) ?><br><small class="pay pay-<?= h($o['payment_status']) ?>"><?= h(PAYMENT_STATUSES[$o['payment_status']]) ?></small></td>
          <td><?= status_pill($o['status']) ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php if ($pages > 1): ?>
    <nav class="pager" aria-label="Pages">
      <?php if ($page > 1): ?><a class="btn btn-ghost" href="<?= h($link(['page' => $page - 1])) ?>">Previous</a><?php endif; ?>
      <span>Page <?= $page ?> of <?= $pages ?></span>
      <?php if ($page < $pages): ?><a class="btn btn-ghost" href="<?= h($link(['page' => $page + 1])) ?>">Next</a><?php endif; ?>
    </nav>
  <?php endif; ?>
<?php endif; ?>
<?php page_end();
