<?php
/* ONE ORDER — details, status, payment and cancelling */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require_admin();

$pdo = db();
$number = q('n');
$load = $pdo->prepare('SELECT * FROM orders WHERE number = ?');
$load->execute([$number]);
$o = $load->fetch();
if (!$o) {
    http_response_code(404);
    page_start('Order not found', 'orders');
    echo '<div class="card empty"><p>There’s no order ', h($number), '.</p><p><a href="orders.php">Back to orders</a></p></div>';
    page_end();
    exit;
}
$self = 'order.php?n=' . rawurlencode($o['number']);

// statuses that make sense for how this order is fulfilled
$flow = $o['fulfilment'] === 'collect'
    ? ['placed', 'confirmed', 'ready_for_collection', 'collected']
    : ['placed', 'confirmed', 'out_for_delivery', 'delivered'];

if (is_post()) {
    $action = $_POST['action'] ?? '';
    if ($o['status'] === 'cancelled') {
        flash('This order is cancelled and can’t be changed.', 'error');
    } elseif ($action === 'status' && in_array($_POST['status'] ?? '', $flow, true)) {
        $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$_POST['status'], $o['id']]);
        flash('Status changed to ' . ORDER_STATUSES[$_POST['status']] . '.');
    } elseif ($action === 'payment' && isset(PAYMENT_STATUSES[$_POST['payment_status'] ?? ''])) {
        $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute([$_POST['payment_status'], $o['id']]);
        flash('Payment marked as ' . strtolower(PAYMENT_STATUSES[$_POST['payment_status']]) . '.');
    } elseif ($action === 'cancel' && in_array($o['status'], ['delivered', 'collected'], true)) {
        flash('This order has already been ' . $o['status'] . ', so it can’t be cancelled. Arrange a return instead.', 'error');
    } elseif ($action === 'cancel') {
        flash(cancel_order($o['number']) ? 'Order cancelled and its items put back in stock.' : 'This order was already cancelled.');
    }
    redirect($self);
}

$items = $pdo->prepare('SELECT i.*, p.stock FROM order_items i LEFT JOIN products p ON p.id = i.product_id WHERE i.order_id = ? ORDER BY i.id');
$items->execute([$o['id']]);
$items = $items->fetchAll();
$address = $o['address'] ? json_decode($o['address'], true) : null;
$step = array_search($o['status'], $flow, true);

page_start('Order ' . $o['number'], 'orders');
?>
<p class="crumbs"><a href="orders.php">Orders</a> / <?= h($o['number']) ?></p>
<div class="head">
  <div>
    <h1><?= h($o['number']) ?> <?= status_pill($o['status']) ?></h1>
    <p class="muted">Placed <?= h(when($o['created_at'])) ?><?= $o['updated_at'] !== $o['created_at'] ? ' · updated ' . h(when($o['updated_at'])) : '' ?></p>
  </div>
</div>

<?php if ($o['status'] !== 'cancelled'): ?>
<ol class="track" aria-label="Progress">
  <?php foreach ($flow as $i => $s): ?>
    <li class="<?= $i < $step ? 'done' : ($i === $step ? 'now' : '') ?>"><?= h(ORDER_STATUSES[$s]) ?></li>
  <?php endforeach; ?>
</ol>
<?php endif; ?>

<div class="cols">
  <div class="col-main">
    <section class="card">
      <h2>Items</h2>
      <table class="table">
        <thead><tr><th>Product</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Total</th></tr></thead>
        <tbody>
        <?php foreach ($items as $i): ?>
          <tr>
            <td><?= $i['product_id'] ? '<a href="product.php?id=' . h(rawurlencode($i['product_id'])) . '">' . h($i['name']) . '</a>' : h($i['name']) ?>
              <?php if (!empty($i['size'])): ?><br><span class="pill pill-size">Size <?= h($i['size']) ?></span><?php endif; ?>
              <?php if ($i['product_id'] && $o['status'] !== 'cancelled'): ?><br><small class="muted"><?= (int) $i['stock'] ?> left in stock</small><?php endif; ?></td>
            <td class="num nowrap"><?= h(money((float) $i['unit_price'])) ?></td>
            <td class="num"><?= (int) $i['qty'] ?></td>
            <td class="num nowrap"><?= h(money((float) $i['unit_price'] * (int) $i['qty'])) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
        <tfoot>
          <tr><td colspan="3">Subtotal</td><td class="num nowrap"><?= h(money((float) $o['subtotal'])) ?></td></tr>
          <tr><td colspan="3"><?= $o['fulfilment'] === 'collect' ? 'Collection' : 'Delivery' ?></td><td class="num nowrap"><?= (float) $o['delivery_fee'] > 0 ? h(money((float) $o['delivery_fee'])) : 'Free' ?></td></tr>
          <tr class="grand"><td colspan="3">Total</td><td class="num nowrap"><?= h(money((float) $o['total'])) ?></td></tr>
        </tfoot>
      </table>
    </section>
    <?php if ($o['notes']): ?>
      <section class="card"><h2>Customer notes</h2><p class="pre"><?= h($o['notes']) ?></p></section>
    <?php endif; ?>
  </div>

  <aside class="col-side">
    <section class="card">
      <h2>Customer</h2>
      <p class="strong"><?= h($o['customer_name']) ?></p>
      <p><a href="tel:<?= h(preg_replace('/[^0-9+]/', '', $o['customer_phone'])) ?>"><?= h($o['customer_phone']) ?></a><br>
         <a href="mailto:<?= h($o['customer_email']) ?>?subject=<?= h(rawurlencode('Your Mabs Technologies order ' . $o['number'])) ?>"><?= h($o['customer_email']) ?></a></p>
      <?php
        $wa = preg_replace('/[^0-9]/', '', $o['customer_phone']);
        if (str_starts_with($wa, '0')) $wa = '27' . substr($wa, 1);
      ?>
      <p><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/<?= h($wa) ?>">WhatsApp customer</a></p>
      <h3><?= $o['fulfilment'] === 'collect' ? 'Collect in store' : 'Courier delivery' ?></h3>
      <?php if ($address): ?>
        <p><?= h($address['street']) ?><?= $address['suburb'] ? '<br>' . h($address['suburb']) : '' ?><br><?= h($address['city']) ?>, <?= h($address['postal']) ?><br><?= h($address['province']) ?></p>
      <?php endif; ?>
    </section>

    <section class="card">
      <h2>Manage</h2>
      <?php if ($o['status'] === 'cancelled'): ?>
        <p class="muted">Cancelled — its items were put back in stock.</p>
      <?php else: ?>
        <form method="post" class="form">
          <?= csrf_field() ?><input type="hidden" name="action" value="status">
          <label>Order status
            <select name="status"><?php foreach ($flow as $s): ?><option value="<?= h($s) ?>"<?= $s === $o['status'] ? ' selected' : '' ?>><?= h(ORDER_STATUSES[$s]) ?></option><?php endforeach; ?></select></label>
          <button class="btn" type="submit">Update status</button>
        </form>
      <?php endif; ?>
      <form method="post" class="form">
        <?= csrf_field() ?><input type="hidden" name="action" value="payment">
        <label>Payment · <?= h(pay_label($o)) ?>
          <select name="payment_status"<?= $o['status'] === 'cancelled' ? ' disabled' : '' ?>><?php foreach (PAYMENT_STATUSES as $k => $label): ?><option value="<?= h($k) ?>"<?= $k === $o['payment_status'] ? ' selected' : '' ?>><?= h($label) ?></option><?php endforeach; ?></select></label>
        <?php if ($o['status'] !== 'cancelled'): ?><button class="btn btn-ghost" type="submit">Update payment</button><?php endif; ?>
      </form>
      <?php if ($o['status'] !== 'cancelled' && !in_array($o['status'], ['delivered', 'collected'], true)): ?>
        <details class="danger">
          <summary>Cancel this order</summary>
          <form method="post">
            <?= csrf_field() ?><input type="hidden" name="action" value="cancel">
            <p class="muted">The items go back into stock. This can’t be undone.</p>
            <button class="btn btn-danger" type="submit">Yes, cancel order</button>
          </form>
        </details>
      <?php endif; ?>
    </section>
  </aside>
</div>
<?php page_end();
