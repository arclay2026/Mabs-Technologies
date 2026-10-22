<?php
/* REVIEWS — approve, reject, reply to or delete customer reviews */
declare(strict_types=1);
require __DIR__ . '/_admin.php';
require_admin();

const REVIEW_TABS = ['pending' => 'Waiting', 'approved' => 'Published', 'rejected' => 'Rejected'];
const PER_PAGE = 20;

$pdo = db();
$tab = isset(REVIEW_TABS[q('tab')]) ? q('tab') : 'pending';
$page = max(1, (int) (q('page') ?: 1));
$self = 'reviews.php?' . http_build_query(['tab' => $tab, 'page' => $page > 1 ? $page : null]);

if (is_post()) {
    $id = (int) ($_POST['id'] ?? 0);
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'approve') {
        $pdo->prepare("UPDATE reviews SET status = 'approved', approved_at = COALESCE(approved_at, NOW()) WHERE id = ?")->execute([$id]);
        flash('Review published.');
    } elseif ($action === 'reject') {
        $pdo->prepare("UPDATE reviews SET status = 'rejected' WHERE id = ?")->execute([$id]);
        flash('Review rejected. It won’t show in the shop.');
    } elseif ($action === 'reply') {
        $reply = mb_substr(trim((string) ($_POST['reply'] ?? '')), 0, 2000);
        $pdo->prepare('UPDATE reviews SET reply = ? WHERE id = ?')->execute([$reply !== '' ? $reply : null, $id]);
        flash($reply !== '' ? 'Reply saved. It shows under the review.' : 'Reply removed.');
    } elseif ($action === 'delete') {
        $pdo->prepare('DELETE FROM reviews WHERE id = ?')->execute([$id]);
        flash('Review deleted.');
    }
    redirect($self);
}

$counts = array_column($pdo->query('SELECT status, COUNT(*) n FROM reviews GROUP BY status')->fetchAll(), 'n', 'status');
$total = (int) ($counts[$tab] ?? 0);
$pages = max(1, (int) ceil($total / PER_PAGE));
$page = min($page, $pages);
$stmt = $pdo->prepare('SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id
                       WHERE r.status = ? ORDER BY r.created_at ' . ($tab === 'pending' ? 'ASC' : 'DESC') . ', r.id DESC
                       LIMIT ' . PER_PAGE . ' OFFSET ' . (($page - 1) * PER_PAGE));
$stmt->execute([$tab]);
$reviews = $stmt->fetchAll();
$avg = $pdo->query("SELECT ROUND(AVG(rating), 1) a, COUNT(*) n FROM reviews WHERE status = 'approved'")->fetch();

page_start('Reviews', 'reviews');
?>
<div class="head">
  <h1>Reviews</h1>
  <?php if ((int) $avg['n']): ?><p class="muted"><?= stars((int) round((float) $avg['a'])) ?> <?= h($avg['a']) ?> average from <?= (int) $avg['n'] ?> published review<?= $avg['n'] == 1 ? '' : 's' ?></p><?php endif; ?>
</div>

<nav class="tabs" aria-label="Review status">
  <?php foreach (REVIEW_TABS as $key => $label): ?>
    <a href="reviews.php?tab=<?= h($key) ?>"<?= $key === $tab ? ' aria-current="page"' : '' ?>><?= h($label) ?> <span class="count"><?= (int) ($counts[$key] ?? 0) ?></span></a>
  <?php endforeach; ?>
</nav>

<?php if (!$reviews): ?>
  <div class="card empty"><p><?= $tab === 'pending' ? 'No reviews waiting. New reviews appear here before they show in the shop.' : 'Nothing here yet.' ?></p></div>
<?php endif; ?>

<?php foreach ($reviews as $r): ?>
  <article class="card review">
    <div class="review-head">
      <div>
        <p><?= stars((int) $r['rating']) ?> <?php if ($r['title']): ?><b><?= h($r['title']) ?></b><?php endif; ?></p>
        <p class="muted"><?= h($r['name']) ?> · <a href="mailto:<?= h($r['email']) ?>"><?= h($r['email']) ?></a> · <?= h(when($r['created_at'])) ?>
          <?php if ($r['verified']): ?> · <span class="verified">Verified buyer</span><?php endif; ?></p>
      </div>
      <a class="review-product" href="product.php?id=<?= h(rawurlencode($r['product_id'])) ?>"><?= h($r['product_name']) ?></a>
    </div>
    <p class="pre"><?= h($r['body']) ?></p>

    <form method="post" class="reply">
      <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><input type="hidden" name="action" value="reply">
      <label>Your public reply <span class="hint">optional — shows under the review as Mabs Technologies</span>
        <textarea name="reply" rows="2" maxlength="2000"><?= h($r['reply'] ?? '') ?></textarea></label>
      <button class="btn btn-ghost btn-sm" type="submit">Save reply</button>
    </form>

    <div class="review-actions">
      <?php if ($r['status'] !== 'approved'): ?>
        <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><input type="hidden" name="action" value="approve"><button class="btn btn-sm" type="submit">Publish</button></form>
      <?php endif; ?>
      <?php if ($r['status'] !== 'rejected'): ?>
        <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><input type="hidden" name="action" value="reject"><button class="btn btn-ghost btn-sm" type="submit"><?= $r['status'] === 'approved' ? 'Unpublish' : 'Reject' ?></button></form>
      <?php endif; ?>
      <details class="danger inline">
        <summary>Delete</summary>
        <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $r['id'] ?>"><input type="hidden" name="action" value="delete"><button class="btn btn-danger btn-sm" type="submit">Delete for good</button></form>
      </details>
    </div>
  </article>
<?php endforeach; ?>

<?php if ($pages > 1): ?>
  <nav class="pager" aria-label="Pages">
    <?php if ($page > 1): ?><a class="btn btn-ghost" href="reviews.php?tab=<?= h($tab) ?>&amp;page=<?= $page - 1 ?>">Previous</a><?php endif; ?>
    <span>Page <?= $page ?> of <?= $pages ?></span>
    <?php if ($page < $pages): ?><a class="btn btn-ghost" href="reviews.php?tab=<?= h($tab) ?>&amp;page=<?= $page + 1 ?>">Next</a><?php endif; ?>
  </nav>
<?php endif; ?>
<?php page_end();
