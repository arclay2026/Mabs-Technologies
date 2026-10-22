<?php
/* PRODUCTS — search, filter and quick-edit prices, sale prices, stock and visibility */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require_admin();

$pdo = db();
$q = trim((string) ($_GET['q'] ?? ''));
$cat = (string) ($_GET['cat'] ?? '');
$brand = (string) ($_GET['brand'] ?? '');
$stock = (string) ($_GET['stock'] ?? '');
$show = (string) ($_GET['show'] ?? '');
$back = 'products.php' . (!empty($_SERVER['QUERY_STRING']) ? '?' . $_SERVER['QUERY_STRING'] : '');

if (is_post()) {
    $find = $pdo->prepare('SELECT id, name, price, was_price, stock, active FROM products WHERE id = ?');
    $save = $pdo->prepare('UPDATE products SET price = ?, was_price = ?, stock = ?, active = ? WHERE id = ?');
    $changed = 0;
    $problems = [];
    foreach ((array) ($_POST['rows'] ?? []) as $id => $row) {
        $find->execute([(string) $id]);
        $p = $find->fetch();
        if (!$p || !is_array($row)) continue;
        $price = parse_money((string) ($row['price'] ?? ''));
        $wasRaw = trim((string) ($row['was'] ?? ''));
        $was = $wasRaw === '' ? null : parse_money($wasRaw);
        $units = parse_count((string) ($row['stock'] ?? ''));
        $active = !empty($row['active']) ? 1 : 0;
        if ($price === null || $units === null || ($wasRaw !== '' && $was === null)) {
            $problems[] = $p['name'] . ': check the price and stock';
            continue;
        }
        if ($was !== null && $was <= $price) {
            $problems[] = $p['name'] . ': the “was” price must be higher than the price (or empty)';
            continue;
        }
        if ($price != $p['price'] || $was != $p['was_price'] || ($was === null) !== ($p['was_price'] === null)
            || $units !== (int) $p['stock'] || $active !== (int) $p['active']) {
            $save->execute([$price, $was, $units, $active, $p['id']]);
            $changed++;
        }
    }
    if ($changed) flash($changed === 1 ? '1 product updated.' : "$changed products updated.");
    if (!$changed && !$problems) flash('Nothing changed.', 'info');
    foreach ($problems as $msg) flash('Not saved — ' . $msg, 'error');
    redirect($back);
}

$where = [];
$args = [];
if ($q !== '') {
    $where[] = '(p.name LIKE ? OR p.id LIKE ? OR p.type LIKE ?)';
    $like = '%' . addcslashes($q, '%_\\') . '%';
    array_push($args, $like, $like, $like);
}
if ($cat !== '') { $where[] = 'p.category_id = ?'; $args[] = $cat; }
if ($brand !== '') { $where[] = 'p.brand_id = ?'; $args[] = $brand; }
if ($stock === 'low') $where[] = 'p.stock BETWEEN 1 AND 2';
if ($stock === 'out') $where[] = 'p.stock = 0';
if ($show === 'hidden') $where[] = 'p.active = 0';
if ($show === '') $where[] = 'p.active = 1';
$stmt = $pdo->prepare('SELECT p.*, b.name AS brand_name FROM products p JOIN brands b ON b.id = p.brand_id '
    . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY p.category_id, p.sort, p.name');
$stmt->execute($args);
$products = $stmt->fetchAll();
$cats = $pdo->query('SELECT id, name FROM categories ORDER BY sort')->fetchAll();
$brands = $pdo->query('SELECT id, name FROM brands ORDER BY name')->fetchAll();
$catName = array_column($cats, 'name', 'id');

page_start('Products', 'products');
?>
<div class="head">
  <h1>Products</h1>
  <a class="btn" href="product.php">Add product</a>
</div>

<form class="filters" method="get">
  <input type="search" name="q" value="<?= h($q) ?>" placeholder="Search products" aria-label="Search products">
  <select name="cat" aria-label="Department"><option value="">All departments</option>
    <?php foreach ($cats as $c): ?><option value="<?= h($c['id']) ?>"<?= $c['id'] === $cat ? ' selected' : '' ?>><?= h($c['name']) ?></option><?php endforeach; ?></select>
  <select name="brand" aria-label="Brand"><option value="">All brands</option>
    <?php foreach ($brands as $b): ?><option value="<?= h($b['id']) ?>"<?= $b['id'] === $brand ? ' selected' : '' ?>><?= h($b['name']) ?></option><?php endforeach; ?></select>
  <select name="stock" aria-label="Stock"><option value="">Any stock</option>
    <option value="low"<?= $stock === 'low' ? ' selected' : '' ?>>Low (1–2)</option>
    <option value="out"<?= $stock === 'out' ? ' selected' : '' ?>>Sold out</option></select>
  <select name="show" aria-label="Visibility"><option value="">In the shop</option>
    <option value="hidden"<?= $show === 'hidden' ? ' selected' : '' ?>>Hidden</option>
    <option value="all"<?= $show === 'all' ? ' selected' : '' ?>>All</option></select>
  <button class="btn btn-ghost" type="submit">Filter</button>
</form>

<?php if (!$products): ?>
  <div class="card empty"><p>No products match these filters.</p></div>
<?php else: ?>
<form method="post" class="card table-wrap">
  <?= csrf_field() ?>
  <table class="table table-edit">
    <thead><tr><th>Product</th><th>Department</th><th class="num">Price (R)</th><th class="num">Was (R)</th><th class="num">Stock</th><th class="center">In shop</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($products as $p): $k = 'rows[' . h($p['id']) . ']'; ?>
      <tr class="<?= $p['active'] ? '' : 'is-hidden' ?>">
        <td><span class="strong"><?= h($p['name']) ?></span><br><small class="muted"><?= h($p['brand_name']) ?> · <?= h($p['type']) ?></small></td>
        <td><?= h($catName[$p['category_id']] ?? $p['category_id']) ?></td>
        <td class="num"><input class="in-num" name="<?= $k ?>[price]" value="<?= h(plain_amount($p['price'])) ?>" inputmode="decimal" required aria-label="Price of <?= h($p['name']) ?>"></td>
        <td class="num"><input class="in-num" name="<?= $k ?>[was]" value="<?= h(plain_amount($p['was_price'])) ?>" inputmode="decimal" placeholder="—" aria-label="Was price of <?= h($p['name']) ?>"></td>
        <td class="num"><input class="in-num in-stock<?= (int) $p['stock'] === 0 ? ' is-out' : ((int) $p['stock'] <= 2 ? ' is-low' : '') ?>" name="<?= $k ?>[stock]" value="<?= (int) $p['stock'] ?>" inputmode="numeric" required aria-label="Stock of <?= h($p['name']) ?>"></td>
        <td class="center"><input type="checkbox" name="<?= $k ?>[active]" value="1"<?= $p['active'] ? ' checked' : '' ?> aria-label="Show <?= h($p['name']) ?> in the shop"></td>
        <td class="nowrap"><a href="product.php?id=<?= h(rawurlencode($p['id'])) ?>">Edit</a></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <div class="savebar"><span class="muted"><?= count($products) ?> product<?= count($products) === 1 ? '' : 's' ?> · a “was” price shows the item as on sale</span><button class="btn" type="submit">Save changes</button></div>
</form>
<?php endif; ?>
<?php page_end();
