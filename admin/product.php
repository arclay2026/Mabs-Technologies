<?php
/* ADD OR EDIT A PRODUCT */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require_admin();

$pdo = db();
$id = q('id');
$p = null;
if ($id !== '') {
    $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $p = $stmt->fetch();
    if (!$p) redirect('products.php');
}
$cats = $pdo->query('SELECT id, name FROM categories ORDER BY sort')->fetchAll();
$brands = $pdo->query('SELECT id, name FROM brands ORDER BY name')->fetchAll();
$types = $pdo->query('SELECT DISTINCT type FROM products ORDER BY type')->fetchAll(PDO::FETCH_COLUMN);

function specs_text(?string $json): string
{
    $lines = [];
    foreach (json_decode($json ?: '[]', true) ?: [] as $pair) $lines[] = $pair[0] . ': ' . $pair[1];
    return implode("\n", $lines);
}

$art = $p ? (json_decode($p['art'] ?: 'null', true) ?: []) : [];
$v = $p ? [
    'id' => $p['id'], 'name' => $p['name'], 'brand' => $p['brand_id'], 'category' => $p['category_id'], 'type' => $p['type'],
    'price' => plain_amount($p['price']), 'was' => plain_amount($p['was_price']), 'stock' => (string) $p['stock'],
    'badge' => $p['badge'] ?? '', 'summary' => $p['summary'] ?? '', 'specs' => specs_text($p['specs']),
    'photos' => implode("\n", json_decode($p['images'] ?? '', true) ?: array_filter([$p['image_url']])), 'featured' => (bool) $p['featured'], 'active' => (bool) $p['active'],
    'art_kind' => $art['kind'] ?? 'phone', 'art_color' => $art['color'] ?? '#2563eb', 'art_body' => $art['body'] ?? 'dark',
] : [
    'id' => '', 'name' => '', 'brand' => '', 'category' => '', 'type' => '', 'price' => '', 'was' => '', 'stock' => '0',
    'badge' => '', 'summary' => '', 'specs' => '', 'photos' => '', 'featured' => false, 'active' => true,
    'art_kind' => 'phone', 'art_color' => '#2563eb', 'art_body' => 'dark',
];
$errors = [];

if (is_post()) {
    if (($_POST['action'] ?? '') === 'delete' && $p) {
        $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$p['id']]);
        delete_unused_photos(product_photos($p));
        flash($p['name'] . ' was deleted. Past orders keep its name and price.');
        redirect('products.php');
    }
    foreach (['id', 'name', 'brand', 'category', 'type', 'price', 'was', 'stock', 'badge', 'summary', 'specs', 'photos', 'art_kind', 'art_color', 'art_body'] as $f) {
        $v[$f] = trim((string) ($_POST[$f] ?? ''));
    }
    $v['featured'] = !empty($_POST['featured']);
    $v['active'] = !empty($_POST['active']);

    $price = parse_money($v['price']);
    $was = $v['was'] === '' ? null : parse_money($v['was']);
    $stock = parse_count($v['stock']);
    $shownStock = parse_count((string) ($_POST['stock_was'] ?? ''));
    if ($p && $stock !== null && $shownStock !== null) {
        if ($stock === $shownStock) {
            $stock = (int) $p['stock']; // not edited: keep whatever orders have done since
        } elseif ((int) $p['stock'] !== $shownStock && (int) $p['stock'] !== $stock) {
            $errors['stock'] = 'Stock changed to ' . (int) $p['stock'] . ' while you were editing (an order or a cancellation). Check the number and save again.';
            $v['stock_was'] = (string) $p['stock'];
        }
    }
    $newId = $p ? $p['id'] : slugify($v['id'] !== '' ? $v['id'] : $v['name']);

    if ($v['name'] === '' || mb_strlen($v['name']) > 200) $errors['name'] = 'Enter the product name.';
    if (!in_array($v['brand'], array_column($brands, 'id'), true)) $errors['brand'] = 'Choose a brand.';
    if (!in_array($v['category'], array_column($cats, 'id'), true)) $errors['category'] = 'Choose a department.';
    if ($v['type'] === '' || mb_strlen($v['type']) > 60) $errors['type'] = 'Enter a type, e.g. Laptop or Smartphone.';
    if ($price === null) $errors['price'] = 'Enter the price in rand, e.g. 8999.';
    if ($v['was'] !== '' && ($was === null || ($price !== null && $was <= $price))) $errors['was'] = 'Leave empty, or enter a price higher than the current price.';
    if ($stock === null) $errors['stock'] = 'Enter how many are in stock (0 or more).';
    if (mb_strlen($v['badge']) > 30) $errors['badge'] = 'Keep the badge to 30 characters.';
    // photos: one path or link per line, plus any uploaded now (added to the end)
    $photos = [];
    foreach (preg_split('/\R/', $v['photos']) as $line) {
        $line = trim($line);
        if ($line === '' || in_array($line, $photos, true)) continue;
        if (!preg_match('#^(https://|assets/)[^\s"\'<>]+$#', $line) || strlen($line) > 255) {
            $errors['photos'] = 'Use paths like assets/products/photo.jpg or https:// links, one per line.';
            break;
        }
        $photos[] = $line;
    }
    [$uploaded, $uploadProblems] = save_photo_uploads('upload', $newId);
    $photos = array_merge($photos, $uploaded);
    $v['photos'] = implode("\n", $photos); // keep new uploads if the form is shown again
    if ($uploadProblems) $errors['upload'] = implode(' ', $uploadProblems);
    if (count($photos) > 12) $errors['photos'] = 'Use up to 12 photos.';
    if (!isset(ART_KINDS[$v['art_kind']])) $v['art_kind'] = 'bag';
    if (!preg_match('/^#[0-9a-f]{6}$/i', $v['art_color'])) $v['art_color'] = '#2563eb';
    if (!isset(ART_BODIES[$v['art_body']])) $v['art_body'] = 'dark';
    if (!$p) {
        if ($newId === '') {
            $errors['id'] = 'Enter a web address name using letters and numbers.';
        } else {
            $taken = $pdo->prepare('SELECT 1 FROM products WHERE id = ?');
            $taken->execute([$newId]);
            if ($taken->fetchColumn()) $errors['id'] = 'Another product already uses “' . $newId . '”. Choose a different web address name.';
        }
    }

    $specs = [];
    foreach (preg_split('/\R/', $v['specs']) as $line) {
        if (trim($line) === '') continue;
        $parts = array_map('trim', explode(':', $line, 2));
        if (count($parts) < 2 || $parts[0] === '' || $parts[1] === '') {
            $errors['specs'] = 'Write each spec on its own line as “Label: value”, e.g. Memory: 8 GB RAM.';
            break;
        }
        $specs[] = $parts;
    }

    if (!$errors) {
        $artJson = json_encode(array_merge($art, ['kind' => $v['art_kind'], 'color' => strtolower($v['art_color']), 'body' => $v['art_body']]));
        $values = [
            $v['name'], $v['brand'], $v['category'], $v['type'], $price, $was, $stock, $v['featured'] ? 1 : 0,
            $v['badge'] !== '' ? $v['badge'] : null, $v['summary'] !== '' ? $v['summary'] : null,
            json_encode($specs, JSON_UNESCAPED_UNICODE), $photos[0] ?? null, count($photos) > 1 ? json_encode($photos, JSON_UNESCAPED_SLASHES) : null, $artJson, $v['active'] ? 1 : 0, $newId,
        ];
        if ($p) {
            $pdo->prepare('UPDATE products SET name = ?, brand_id = ?, category_id = ?, type = ?, price = ?, was_price = ?, stock = ?, featured = ?,
                           badge = ?, summary = ?, specs = ?, image_url = ?, images = ?, art = ?, active = ? WHERE id = ?')->execute($values);
            flash($v['name'] . ' saved.');
        } else {
            $pdo->prepare('INSERT INTO products (name, brand_id, category_id, type, price, was_price, stock, featured, badge, summary, specs,
                           image_url, images, art, active, id, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1000)')->execute($values);
            flash($v['name'] . ' added to the shop.');
        }
        if ($p) delete_unused_photos(array_diff(product_photos($p), $photos)); // photos taken off this product
        redirect('product.php?id=' . rawurlencode($newId));
    }
}

function field_error(array $errors, string $f): string
{
    return isset($errors[$f]) ? '<span class="field-error" id="err-' . $f . '">' . h($errors[$f]) . '</span>' : '';
}
function invalid(array $errors, string $f): string
{
    return isset($errors[$f]) ? ' aria-invalid="true" aria-describedby="err-' . $f . '"' : '';
}

page_start($p ? $p['name'] : 'Add product', 'products');
?>
<p class="crumbs"><a href="products.php">Products</a> / <?= $p ? h($p['name']) : 'Add product' ?></p>
<div class="head">
  <h1><?= $p ? h($p['name']) : 'Add product' ?></h1>
  <?php if ($p && $p['active']): ?><a class="btn btn-ghost" href="../product.html?id=<?= h(rawurlencode($p['id'])) ?>" target="_blank" rel="noopener">View in shop</a><?php endif; ?>
</div>
<?php if ($errors): ?><p class="note note-error" role="alert">Please fix the highlighted fields.</p><?php endif; ?>

<form method="post" class="cols form" enctype="multipart/form-data">
  <?= csrf_field() ?>
  <div class="col-main">
    <section class="card grid2">
      <h2 class="span2">Details</h2>
      <label class="span2">Name <?= field_error($errors, 'name') ?>
        <input name="name" value="<?= h($v['name']) ?>" required maxlength="200"<?= invalid($errors, 'name') ?>></label>
      <?php if (!$p): ?>
        <label class="span2">Web address name <span class="hint">optional — made from the name, e.g. samsung-galaxy-a15. Can’t be changed later.</span> <?= field_error($errors, 'id') ?>
          <input name="id" value="<?= h($v['id']) ?>" maxlength="80" pattern="[A-Za-z0-9\-]*"<?= invalid($errors, 'id') ?>></label>
      <?php endif; ?>
      <label>Brand <?= field_error($errors, 'brand') ?>
        <select name="brand" required<?= invalid($errors, 'brand') ?>><option value="">Choose…</option>
          <?php foreach ($brands as $b): ?><option value="<?= h($b['id']) ?>"<?= $b['id'] === $v['brand'] ? ' selected' : '' ?>><?= h($b['name']) ?></option><?php endforeach; ?></select></label>
      <label>Department <?= field_error($errors, 'category') ?>
        <select name="category" required<?= invalid($errors, 'category') ?>><option value="">Choose…</option>
          <?php foreach ($cats as $c): ?><option value="<?= h($c['id']) ?>"<?= $c['id'] === $v['category'] ? ' selected' : '' ?>><?= h($c['name']) ?></option><?php endforeach; ?></select></label>
      <label>Type <?= field_error($errors, 'type') ?>
        <input name="type" value="<?= h($v['type']) ?>" list="types" required maxlength="60"<?= invalid($errors, 'type') ?>>
        <datalist id="types"><?php foreach ($types as $t): ?><option value="<?= h($t) ?>"><?php endforeach; ?></datalist></label>
      <label>Badge <span class="hint">optional, e.g. New</span> <?= field_error($errors, 'badge') ?>
        <input name="badge" value="<?= h($v['badge']) ?>" maxlength="30"<?= invalid($errors, 'badge') ?>></label>
      <label class="span2">Summary <span class="hint">one or two sentences</span>
        <textarea name="summary" rows="2" maxlength="600"><?= h($v['summary']) ?></textarea></label>
      <label class="span2">Specs <span class="hint">one per line, as “Label: value”. Colour, Storage, Memory, Processor, Display (with the size in inches), Network, Headphone jack, Lens type and Condition also become shop filters.</span> <?= field_error($errors, 'specs') ?>
        <textarea name="specs" rows="6" placeholder="Processor: Intel Core i5&#10;Memory: 8 GB RAM"<?= invalid($errors, 'specs') ?>><?= h($v['specs']) ?></textarea></label>
    </section>

    <section class="card grid2">
      <h2 class="span2">Photos</h2>
      <?php $list = array_values(array_filter(array_map('trim', preg_split('/\R/', $v['photos'])))); ?>
      <?php if ($list): ?>
        <ol class="photo-list span2" aria-label="Current photos">
          <?php foreach ($list as $i => $src): ?>
            <li><img src="<?= h(photo_src($src)) ?>" alt=""><span><?= $i === 0 ? 'Main' : $i + 1 ?></span></li>
          <?php endforeach; ?>
        </ol>
      <?php endif; ?>
      <label class="span2">Add photos <span class="hint">JPG, PNG or WebP, up to <?= h(photo_limit()) ?> each — square photos on a white background look best</span> <?= field_error($errors, 'upload') ?>
        <input type="file" name="upload[]" accept="image/jpeg,image/png,image/webp" multiple<?= invalid($errors, 'upload') ?>></label>
      <label class="span2">Photo order <span class="hint">one per line; the first is the main photo. Delete a line to remove a photo.</span> <?= field_error($errors, 'photos') ?>
        <textarea name="photos" rows="<?= max(2, count($list) + 1) ?>" placeholder="assets/products/galaxy-a15-front.jpg&#10;https://…"<?= invalid($errors, 'photos') ?>><?= h($v['photos']) ?></textarea></label>
      <p class="span2 muted">Without a photo, the shop draws an illustration:</p>
      <label>Drawing
        <?= art_kind_select('art_kind', $v['art_kind']) ?></label>
      <div class="grid2 tight">
        <label>Colour <input type="color" name="art_color" value="<?= h($v['art_color']) ?>"></label>
        <label>Body
          <select name="art_body"><?php foreach (ART_BODIES as $k => $label): ?><option value="<?= h($k) ?>"<?= $k === $v['art_body'] ? ' selected' : '' ?>><?= h($label) ?></option><?php endforeach; ?></select></label>
      </div>
    </section>
  </div>

  <aside class="col-side">
    <section class="card">
      <h2>Price &amp; stock</h2>
      <label>Price (R, incl. VAT) <?= field_error($errors, 'price') ?>
        <input name="price" value="<?= h($v['price']) ?>" inputmode="decimal" required<?= invalid($errors, 'price') ?>></label>
      <label>Was price (R) <span class="hint">optional — shows a sale tag</span> <?= field_error($errors, 'was') ?>
        <input name="was" value="<?= h($v['was']) ?>" inputmode="decimal"<?= invalid($errors, 'was') ?>></label>
      <label>In stock <?= field_error($errors, 'stock') ?>
        <input name="stock" value="<?= h($v['stock']) ?>" inputmode="numeric" required<?= invalid($errors, 'stock') ?>></label>
      <input type="hidden" name="stock_was" value="<?= h($v['stock_was'] ?? ($p ? (string) $p['stock'] : '')) ?>">
      <label class="check"><input type="checkbox" name="active" value="1"<?= $v['active'] ? ' checked' : '' ?>> Show in the shop</label>
      <label class="check"><input type="checkbox" name="featured" value="1"<?= $v['featured'] ? ' checked' : '' ?>> Featured</label>
      <button class="btn btn-block" type="submit"><?= $p ? 'Save product' : 'Add product' ?></button>
    </section>
  </aside>
</form>

<?php if ($p): ?>
  <details class="danger card">
    <summary>Delete this product</summary>
    <form method="post">
      <?= csrf_field() ?><input type="hidden" name="action" value="delete">
      <p class="muted">To take it off the shop for now, untick “Show in the shop” instead. Deleting can’t be undone; past orders keep its name and price.</p>
      <button class="btn btn-danger" type="submit">Delete <?= h($p['name']) ?></button>
    </form>
  </details>
<?php endif; ?>
<?php page_end();
