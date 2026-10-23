// Rebuilds database/seed.sql from js/catalog.js. Run from the site folder:  node database/build-seed.js > database/seed.sql
global.window = {};
require(process.cwd() + "/js/catalog.js");
const M = window.MABS;
const q = v => v == null ? "NULL" : typeof v === "number" ? String(v) : typeof v === "boolean" ? (v ? "true" : "false")
  : "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
const slug = n => n.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const brands = [], seen = {};
M.brands.forEach(b => { seen[b.name] = 1; brands.push([slug(b.name), b.name, b.logo, b.h]); });
M.products.forEach(p => { if (!seen[p.brand]) { seen[p.brand] = 1; brands.push([slug(p.brand), p.brand, null, null]); } });
const out = [];
out.push("-- =====================================================================");
out.push("-- Mabs Technologies — starting catalogue");
out.push(`-- Generated from js/catalog.js: ${M.categories.length} departments, ${brands.length} brands, ${M.products.length} products.`);
out.push("-- Prices in rand (VAT inclusive). Manage them in the admin panel from here on.");
out.push("-- =====================================================================");
out.push("");
out.push("INSERT IGNORE INTO categories (id, name, blurb, art, sort) VALUES");
out.push(M.categories.map((c, i) => `  (${q(c.id)}, ${q(c.name)}, ${q(c.blurb)}, ${q(JSON.stringify(c.art))}, ${i})`).join(",\n") + ";");
out.push("");
out.push("INSERT IGNORE INTO brands (id, name, logo_url, logo_height, sort) VALUES");
out.push(brands.map((b, i) => `  (${q(b[0])}, ${q(b[1])}, ${q(b[2])}, ${q(b[3])}, ${i})`).join(",\n") + ";");
out.push("");
out.push("INSERT IGNORE INTO products (id, name, brand_id, category_id, type, price, was_price, stock, featured, badge, summary, specs, image_url, art, sort) VALUES");
out.push(M.products.map((p, i) => `  (${[p.id, p.name, slug(p.brand), p.category, p.type, p.price, p.was || null, p.stock, !!p.featured, p.badge || null, p.summary, JSON.stringify(p.specs), null, JSON.stringify(p.art)].map(q).join(", ")}, ${i})`).join(",\n") + ";");
out.push("");
const d = M.store.delivery;
out.push(`UPDATE store_settings SET courier_fee = ${d.courierFee}, free_over = ${d.freeOver}, collect = ${d.collect ? 1 : 0} WHERE id = 1;`);
out.push("");
out.push("-- demo photo galleries (made from the drawings) for four products; replace with real photos in the admin panel");
M.products.filter(p => p.images && p.images.length > 1).forEach(p => {
  out.push(`UPDATE products SET image_url = ${q(p.image)}, images = ${q(JSON.stringify(p.images))} WHERE id = ${q(p.id)} AND image_url IS NULL;`);
});
console.log(out.join("\n"));
