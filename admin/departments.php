<?php
/* DEPARTMENTS & BRANDS — add, rename, reorder and remove the shop's departments
   (with the drawing on each department tile) and the brands products belong to */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require_admin();

$pdo = db();
$hasArt = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'categories' AND column_name = 'art'")->fetchColumn() > 0;
$errors = [];
$newDept = ['name' => '', 'blurb' => '', 'kind' => 'bag', 'color' => '#2563eb'];
$newBrand = '';

function used_by(PDO $pdo, string $column, string $id): int
{
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE $column = ?"); // $column is one of two fixed names
    $stmt->execute([$id]);
    return (int) $stmt->fetchColumn();
}

function art_json(string $kind, string $color): string
{
    if (!isset(ART_KINDS[$kind])) $kind = 'bag';
    if (!preg_match('/^#[0-9a-f]{6}$/i', $color)) $color = '#2563eb';
    return json_encode(['kind' => $kind, 'color' => strtolower($color)]);
}

if (is_post()) {
    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'departments' && isset($_POST['delete'])) {
        $id = (string) $_POST['delete'];
        $n = used_by($pdo, 'category_id', $id);
        if ($n > 0) {
            flash('That department still has ' . $n . ' product' . ($n === 1 ? '' : 's') . '. Move them to another department first.', 'error');
        } else {
            $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
            flash('Department removed.');
        }
        redirect('departments.php');
    }

    if ($action === 'departments') {
        $save = $pdo->prepare($hasArt ? 'UPDATE categories SET name = ?, blurb = ?, sort = ?, art = ? WHERE id = ?'
                                      : 'UPDATE categories SET name = ?, blurb = ?, sort = ? WHERE id = ?');
        $problems = [];
        $pdo->beginTransaction();
        foreach ((array) ($_POST['rows'] ?? []) as $id => $row) {
            if (!is_array($row)) continue;
            $name = trim((string) ($row['name'] ?? ''));
            $blurb = trim((string) ($row['blurb'] ?? ''));
            $sort = parse_count((string) ($row['sort'] ?? '')) ?? 0;
            if ($name === '' || mb_strlen($name) > 80) { $problems[] = 'Every department needs a name (up to 80 characters).'; continue; }
            if (mb_strlen($blurb) > 160) { $problems[] = $name . ': keep the description under 160 characters.'; continue; }
            $args = [$name, $blurb === '' ? null : $blurb, $sort];
            if ($hasArt) $args[] = art_json((string) ($row['kind'] ?? ''), (string) ($row['color'] ?? ''));
            $args[] = (string) $id;
            $save->execute($args);
        }
        $pdo->commit();
        foreach (array_unique($problems) as $msg) flash('Not saved — ' . $msg, 'error');
        if (!$problems) flash('Departments saved. The shop shows the changes within 5 minutes.');
        redirect('departments.php');
    }

    if ($action === 'add-department') {
        $newDept = ['name' => trim((string) ($_POST['name'] ?? '')), 'blurb' => trim((string) ($_POST['blurb'] ?? '')),
                    'kind' => (string) ($_POST['kind'] ?? 'bag'), 'color' => (string) ($_POST['color'] ?? '#2563eb')];
        $id = slugify($newDept['name'], 40);
        if ($newDept['name'] === '' || mb_strlen($newDept['name']) > 80 || $id === '') $errors['dept'] = 'Give the department a name (up to 80 characters).';
        elseif (mb_strlen($newDept['blurb']) > 160) $errors['dept'] = 'Keep the description under 160 characters.';
        else {
                        $taken = $pdo->prepare('SELECT COUNT(*) FROM categories WHERE id = ? OR name = ?');
            $taken->execute([$id, $newDept['name']]);
            if ((int) $taken->fetchColumn() > 0) $errors['dept'] = 'There’s already a department with that name.';
        }
        if (!$errors) {
            $sort = (int) $pdo->query('SELECT COALESCE(MAX(sort), -1) + 1 FROM categories')->fetchColumn();
            if ($hasArt) {
                $pdo->prepare('INSERT INTO categories (id, name, blurb, art, sort) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$id, $newDept['name'], $newDept['blurb'] ?: null, art_json($newDept['kind'], $newDept['color']), $sort]);
            } else {
                $pdo->prepare('INSERT INTO categories (id, name, blurb, sort) VALUES (?, ?, ?, ?)')->execute([$id, $newDept['name'], $newDept['blurb'] ?: null, $sort]);
            }
            flash('“' . $newDept['name'] . '” added. It appears in the shop once it has a product.');
            redirect('departments.php');
        }
    }

    if ($action === 'brands' && isset($_POST['delete'])) {
        $id = (string) $_POST['delete'];
        $n = used_by($pdo, 'brand_id', $id);
        if ($n > 0) {
            flash('That brand still has ' . $n . ' product' . ($n === 1 ? '' : 's') . '. Change their brand first.', 'error');
        } else {
            $pdo->prepare('DELETE FROM brands WHERE id = ?')->execute([$id]);
            flash('Brand removed.');
        }
        redirect('departments.php#brands');
    }

    if ($action === 'brands') {
        $save = $pdo->prepare('UPDATE brands SET name = ? WHERE id = ?');
        $problems = [];
        foreach ((array) ($_POST['brands'] ?? []) as $id => $name) {
            $name = trim((string) $name);
            if ($name === '' || mb_strlen($name) > 80) { $problems[] = 'Every brand needs a name (up to 80 characters).'; continue; }
            try {
                $save->execute([$name, (string) $id]);
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000') throw $e;
                $problems[] = 'There’s already a brand called “' . $name . '”.';
            }
        }
        foreach (array_unique($problems) as $msg) flash('Not saved — ' . $msg, 'error');
        if (!$problems) flash('Brands saved.');
        redirect('departments.php#brands');
    }

    if ($action === 'add-brand') {
        $newBrand = trim((string) ($_POST['name'] ?? ''));
        $id = slugify($newBrand, 40);
        if ($newBrand === '' || mb_strlen($newBrand) > 80 || $id === '') $errors['brand'] = 'Give the brand a name (up to 80 characters).';
        else {
            $taken = $pdo->prepare('SELECT COUNT(*) FROM brands WHERE id = ? OR name = ?');
            $taken->execute([$id, $newBrand]);
            if ((int) $taken->fetchColumn() > 0) $errors['brand'] = 'That brand is already on the list.';
        }
        if (!$errors) {
            $sort = (int) $pdo->query('SELECT COALESCE(MAX(sort), -1) + 1 FROM brands')->fetchColumn();
            $pdo->prepare('INSERT INTO brands (id, name, sort) VALUES (?, ?, ?)')->execute([$id, $newBrand, $sort]);
            flash('“' . $newBrand . '” added. Choose it when you add or edit a product.');
            redirect('departments.php#brands');
        }
    }
}

$depts = $pdo->query('SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS n FROM categories c ORDER BY c.sort, c.name')->fetchAll();
$brands = $pdo->query('SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS n FROM brands b ORDER BY b.name')->fetchAll();

$deptCount = count($depts);
page_start('Departments & brands', 'departments');
?>
<div class="head">
  <div><h1>Departments &amp; brands</h1>
    <p class="head-sub"><?= $deptCount ?> department<?= $deptCount === 1 ? '' : 's' ?> · <?= count($brands) ?> brand<?= count($brands) === 1 ? '' : 's' ?> · a department appears in the shop once it has a product</p></div>
  <div class="head-actions"><a class="btn btn-ghost" href="#add-dept"><?= icon('new') ?>Department</a><a class="btn btn-ghost" href="#brands"><?= icon('new') ?>Brand</a></div>
</div>
<?php if (!$hasArt): ?>
  <p class="note note-info">Update the database to choose a picture for each department. <a href="setup.php">Update it now</a></p>
<?php endif; ?>

<section class="card table-wrap">
  <form method="post">
    <?= csrf_field() ?><input type="hidden" name="action" value="departments">
    <table class="table table-edit">
      <thead><tr><th>Department</th><?php if ($hasArt): ?><th>Picture &amp; colour</th><?php endif; ?><th class="num">Order</th><th class="num">Products</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($depts as $d): $k = 'rows[' . h($d['id']) . ']'; $art = json_decode((string) ($d['art'] ?? ''), true) ?: []; ?>
        <tr data-art-row>
          <td><div class="dept-cell">
            <?php if ($hasArt): ?><span class="art" data-art data-kind="<?= h($art['kind'] ?? 'bag') ?>" data-color="<?= h($art['color'] ?? '#2563eb') ?>"></span><?php endif; ?>
            <div class="dept-fields">
              <input class="in-name" name="<?= $k ?>[name]" value="<?= h($d['name']) ?>" required maxlength="80" aria-label="Name">
              <input class="in-blurb" name="<?= $k ?>[blurb]" value="<?= h($d['blurb']) ?>" maxlength="160" placeholder="Short description, shown in menus" aria-label="Description of <?= h($d['name']) ?>">
            </div></div></td>
          <?php if ($hasArt): ?>
          <td><div class="kind-cell"><?= art_kind_select($k . '[kind]', (string) ($art['kind'] ?? 'bag'), 'Picture for ' . $d['name']) ?>
            <input type="color" name="<?= $k ?>[color]" value="<?= h($art['color'] ?? '#2563eb') ?>" aria-label="Colour for <?= h($d['name']) ?>"></div></td>
          <?php endif; ?>
          <td class="num"><input class="in-num in-order" name="<?= $k ?>[sort]" value="<?= (int) $d['sort'] ?>" inputmode="numeric" aria-label="Position of <?= h($d['name']) ?>"></td>
          <td class="num"><a class="n-link<?= (int) $d['n'] ? '' : ' n-zero' ?>" href="products.php?cat=<?= h(rawurlencode($d['id'])) ?>&amp;show=all" title="See its products"><?= (int) $d['n'] ?></a></td>
          <td class="nowrap"><?php if ((int) $d['n'] === 0): ?><button class="link link-danger" name="delete" value="<?= h($d['id']) ?>" formnovalidate>Remove</button><?php endif; ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <div class="savebar"><span class="muted">Lower order numbers come first in menus and on the homepage.</span><button class="btn" type="submit"><?= icon('check') ?>Save departments</button></div>
  </form>
</section>

<section class="card" id="add-dept">
  <h2>Add a department</h2>
  <div class="add-dept" data-art-row>
    <?php if ($hasArt): ?><span class="art art-lg" data-art data-kind="<?= h($newDept['kind']) ?>" data-color="<?= h($newDept['color']) ?>"></span><?php endif; ?>
    <form method="post" class="form form-inline">
      <?= csrf_field() ?><input type="hidden" name="action" value="add-department">
      <?= isset($errors['dept']) ? '<span class="field-error span-all">' . h($errors['dept']) . '</span>' : '' ?>
      <label>Name <input name="name" value="<?= h($newDept['name']) ?>" required maxlength="80" placeholder="e.g. Pets"></label>
      <label>Description <input name="blurb" value="<?= h($newDept['blurb']) ?>" maxlength="160" placeholder="e.g. Food, beds & toys"></label>
      <?php if ($hasArt): ?>
      <label>Picture <?= art_kind_select('kind', $newDept['kind']) ?></label>
      <label class="color-label">Colour <input type="color" name="color" value="<?= h($newDept['color']) ?>"></label>
      <?php endif; ?>
      <button class="btn" type="submit"><?= icon('new') ?>Add department</button>
    </form>
  </div>
</section>

<section class="card table-wrap" id="brands">
  <div class="card-head card-head-pad">
    <h2>Brands <span class="count"><?= count($brands) ?></span></h2>
    <form method="post" class="add-brand">
      <?= csrf_field() ?><input type="hidden" name="action" value="add-brand">
      <input name="name" value="<?= h($newBrand) ?>" required maxlength="80" placeholder="New brand, e.g. Russell Hobbs" aria-label="New brand name"<?= isset($errors['brand']) ? ' aria-invalid="true"' : '' ?>>
      <button class="btn" type="submit"><?= icon('new') ?>Add brand</button>
    </form>
  </div>
  <?= isset($errors['brand']) ? '<p class="field-error brand-error">' . h($errors['brand']) . '</p>' : '' ?>
  <form method="post">
    <?= csrf_field() ?><input type="hidden" name="action" value="brands">
    <div class="brand-list">
    <?php foreach ($brands as $b): ?>
      <div class="brand-row">
        <?= monogram($b['name']) ?>
        <input name="brands[<?= h($b['id']) ?>]" value="<?= h($b['name']) ?>" required maxlength="80" aria-label="Brand name">
        <a class="n-link<?= (int) $b['n'] ? '' : ' n-zero' ?>" href="products.php?brand=<?= h(rawurlencode($b['id'])) ?>&amp;show=all" title="<?= (int) $b['n'] ?> product<?= (int) $b['n'] === 1 ? '' : 's' ?>"><?= (int) $b['n'] ?></a>
        <?php if ((int) $b['n'] === 0): ?><button class="link link-x" name="delete" value="<?= h($b['id']) ?>" formnovalidate title="Remove <?= h($b['name']) ?>" aria-label="Remove <?= h($b['name']) ?>">×</button><?php endif; ?>
      </div>
    <?php endforeach; ?>
    </div>
    <div class="savebar"><span class="muted">Click a name to rename it. Brands without products can be removed.</span><button class="btn" type="submit"><?= icon('check') ?>Save brands</button></div>
  </form>
</section>
<?php page_end();
