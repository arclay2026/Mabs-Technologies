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

page_start('Departments & brands', 'departments');
?>
<div class="head"><h1>Departments &amp; brands</h1></div>
<?php if (!$hasArt): ?>
  <p class="note note-info">Update the database to choose a picture for each department. <a href="setup.php">Update it now</a></p>
<?php endif; ?>

<section class="card table-wrap">
  <form method="post">
    <?= csrf_field() ?><input type="hidden" name="action" value="departments">
    <table class="table table-edit">
      <thead><tr><th>Department</th><th>Description <span class="hint">under the name in menus</span></th><?php if ($hasArt): ?><th>Picture</th><th>Colour</th><?php endif; ?><th class="num">Order</th><th class="num">Products</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($depts as $d): $k = 'rows[' . h($d['id']) . ']'; $art = json_decode((string) ($d['art'] ?? ''), true) ?: []; ?>
        <tr>
          <td><input name="<?= $k ?>[name]" value="<?= h($d['name']) ?>" required maxlength="80" aria-label="Name"></td>
          <td><input name="<?= $k ?>[blurb]" value="<?= h($d['blurb']) ?>" maxlength="160" aria-label="Description of <?= h($d['name']) ?>"></td>
          <?php if ($hasArt): ?>
          <td><?= art_kind_select($k . '[kind]', (string) ($art['kind'] ?? 'bag'), 'Picture for ' . $d['name']) ?></td>
          <td><input type="color" name="<?= $k ?>[color]" value="<?= h($art['color'] ?? '#2563eb') ?>" aria-label="Colour for <?= h($d['name']) ?>"></td>
          <?php endif; ?>
          <td class="num"><input class="in-num in-order" name="<?= $k ?>[sort]" value="<?= (int) $d['sort'] ?>" inputmode="numeric" aria-label="Position of <?= h($d['name']) ?>"></td>
          <td class="num"><a href="products.php?cat=<?= h(rawurlencode($d['id'])) ?>&amp;show=all"><?= (int) $d['n'] ?></a></td>
          <td class="nowrap"><?php if ((int) $d['n'] === 0): ?><button class="link link-danger" name="delete" value="<?= h($d['id']) ?>" formnovalidate>Remove</button><?php endif; ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <div class="savebar"><span class="muted">Lower numbers come first. A department shows in the shop once it has a product.</span><button class="btn" type="submit">Save departments</button></div>
  </form>
</section>

<section class="card">
  <h2>Add a department</h2>
  <form method="post" class="form form-inline">
    <?= csrf_field() ?><input type="hidden" name="action" value="add-department">
    <?= isset($errors['dept']) ? '<span class="field-error span-all">' . h($errors['dept']) . '</span>' : '' ?>
    <label>Name <input name="name" value="<?= h($newDept['name']) ?>" required maxlength="80" placeholder="e.g. Pets"></label>
    <label>Description <input name="blurb" value="<?= h($newDept['blurb']) ?>" maxlength="160" placeholder="e.g. Food, beds & toys"></label>
    <?php if ($hasArt): ?>
    <label>Picture <?= art_kind_select('kind', $newDept['kind']) ?></label>
    <label>Colour <input type="color" name="color" value="<?= h($newDept['color']) ?>"></label>
    <?php endif; ?>
    <button class="btn" type="submit">Add department</button>
  </form>
</section>

<div class="cols cols-even" id="brands">
  <section class="card table-wrap">
    <form method="post">
      <?= csrf_field() ?><input type="hidden" name="action" value="brands">
      <table class="table table-edit">
        <thead><tr><th>Brand</th><th class="num">Products</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($brands as $b): ?>
          <tr>
            <td><input name="brands[<?= h($b['id']) ?>]" value="<?= h($b['name']) ?>" required maxlength="80" aria-label="Brand name"></td>
            <td class="num"><a href="products.php?brand=<?= h(rawurlencode($b['id'])) ?>&amp;show=all"><?= (int) $b['n'] ?></a></td>
            <td class="nowrap"><?php if ((int) $b['n'] === 0): ?><button class="link link-danger" name="delete" value="<?= h($b['id']) ?>" formnovalidate>Remove</button><?php endif; ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <div class="savebar"><span class="muted"><?= count($brands) ?> brands</span><button class="btn" type="submit">Save brands</button></div>
    </form>
  </section>
  <section class="card">
    <h2>Add a brand</h2>
    <form method="post" class="form">
      <?= csrf_field() ?><input type="hidden" name="action" value="add-brand">
      <label>Brand name <?= isset($errors['brand']) ? '<span class="field-error">' . h($errors['brand']) . '</span>' : '' ?>
        <input name="name" value="<?= h($newBrand) ?>" required maxlength="80" placeholder="e.g. Russell Hobbs"></label>
      <button class="btn" type="submit">Add brand</button>
      <p class="muted">Logos in the homepage’s “Featured brands” strip are set up separately; ask your web developer to add one.</p>
    </form>
  </section>
</div>
<?php page_end();
