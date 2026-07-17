# Plan: Bulk-append 100 demo products per owner (standalone seed script)

## Goal
Add a **standalone, idempotent** script that appends **100 new products per owner**, links every
product to **each of that owner's stalls** (via `stall_products`), and gives each product a **remote
faker image URL**. It runs independently of the existing deterministic `seed.js` so the base seed is
untouched.

## Context (verified)
- Owners are dynamic: `User` rows with `role='owner'` (`owner`, `owner_bixby`, `owner_clara`).
- `Product.category_id` is **required (NOT NULL)**; ownership is modeled through `Category.owner_id`
  (Product has no `owner_id`). So products must be assigned to one of the owner's **existing** categories.
- `ProductStall` (`stall_products`) has a **unique index on `(stall_id, product_id)`** and requires
  `price_usd`/`price_khr`/`is_visible`. This is the "separate to each stall" link.
- `image_url` accepts `https://...` or `/`-relative and must be ≤ 500 chars (model: `STRING(500)`).
  Frontend renders it directly as `<img src>` (`frontend/src/services/api.js:72`).
- Existing seeders already provide reusable patterns we mirror: `upsertProduct` (find-or-create by
  `name`) and `upsertStallProduct` (find-or-create by `(stall_id, product_id)`) in
  `backend/src/scripts/seeders/menu.js`; price helpers `roundUsd`/`toKhr` in
  `backend/src/scripts/seeders/helpers.js`.
- Faker v9 available (`@faker-js/faker` ^9.9.0): `faker.commerce.productName()`,
  `faker.image.urlLoremFlickr({ category })`, `faker.image.url()`.

## Approach
Create `backend/src/scripts/seed-bulk-products.js` (ESM). For each owner:
1. Load `Category` (where `owner_id`) and `Stall` (where `owner_id`, active & not deleted). Skip the
   owner with a warning if either is empty (can't create a product without a category/stall).
2. Seed faker **deterministically per owner** (`faker.seed(BULK_SEED_BASE + owner.id)`) so re-runs
   reproduce identical names → idempotent via find-or-create.
3. Generate **100 unique product names** (`faker.commerce.productName()` + in-run `Set` dedup, counter
   suffix on collision). For each:
   - assign to a **random existing category** of that owner,
   - `baseUsd = roundUsd(faker.number.float({ min: 0.5, max: 12, fractionDigits: 2 }))`,
   - `image_url = faker.image.urlLoremFlickr({ category: category.name.toLowerCase() })` (fallback
     `faker.image.url()`), keep ≤ 500 chars,
   - `Product.findOrCreate({ where: { name } })`.
4. **Cross-owner contamination guard**: if the found/created product's `category.owner_id !==
   owner.id` (a name clash with another owner's product), regenerate the name (append owner username
   slug) and retry find-or-create. Keeps products owned by the correct owner.
5. For **each stall** of the owner, `ProductStall.findOrCreate({ where: { stall_id, product_id } })`
   with `price_usd = Math.max(0.5, roundUsd(baseUsd + faker offset))`, `price_khr = toKhr(...)`,
   `is_visible: faker.datatype.boolean({ probability: 0.95 })` (mirrors menu seeder).

Wrap each owner's writes in a single `sequelize.transaction(...)` for atomicity.

## Files
- **Add** `backend/src/scripts/seed-bulk-products.js` — the new script (mirrors `seed.js` header:
  `import 'dotenv/config'`, `ensureDatabaseExists`, `sequelize.authenticate/sync`, `finally` close).
- **Edit** `backend/package.json` — add script:
  `"seed:bulk": "node src/scripts/seed-bulk-products.js"`.
- Reuse (no change): `../models/index.js`, `../scripts/seeders/helpers.js` (`roundUsd`, `toKhr`).

### Pseudocode skeleton
```
const BULK_PRODUCTS_PER_OWNER = 100;
const BULK_SEED_BASE = 20260715;

main():
  await ensureDatabaseExists(); authenticate(); sync();
  const owners = await User.findAll({ where: { role: 'owner' } });
  for (const owner of owners):
    const categories = await Category.findAll({ where: { owner_id: owner.id } });
    const stalls = await Stall.findAll({ where: { owner_id: owner.id, is_active: true, is_deleted: false } });
    if (!categories.length || !stalls.length) { warn + continue; }
    faker.seed(BULK_SEED_BASE + owner.id);
    await sequelize.transaction(async (t) => {
      const used = new Set();
      let created = 0;
      while (created < BULK_PRODUCTS_PER_OWNER):
        let name = faker.commerce.productName();
        if (used.has(name)) name = `${name} ${++counter}`;
        used.add(name);
        const category = faker.helpers.arrayElement(categories);
        const baseUsd = roundUsd(faker.number.float({ min: 0.5, max: 12, fractionDigits: 2 }));
        const image_url = faker.image.urlLoremFlickr({ category: category.name.toLowerCase() }) || faker.image.url();
        const [product] = await Product.findOrCreate({ where: { name }, defaults: { name, category_id: category.id, image_url, is_active: true }, transaction: t });
        if ((await product.getCategory())?.owner_id !== owner.id) { /* regenerate name, retry */ }
        for (const stall of stalls):
          const priceUsd = Math.max(0.5, roundUsd(baseUsd + faker.number.float({ min: -0.25, max: 0.75, fractionDigits: 2 })));
          await ProductStall.findOrCreate({ where: { stall_id: stall.id, product_id: product.id }, defaults: { stall_id, product_id, price_usd: priceUsd, price_khr: toKhr(priceUsd), is_visible: faker.datatype.boolean({ probability: 0.95 }) }, transaction: t });
        created++;
    });
    log(`${owner.username}: +100 products across ${stalls.length} stalls`);
```

## Expected data volume (first run)
- `owner` (3 stalls): 100 products → 300 `stall_products` rows.
- `owner_bixby` (2 stalls): 100 products → 200 rows.
- `owner_clara` (2 stalls): 100 products → 200 rows.

## Validation
1. `cd backend && npm run seed:bulk` — completes with a per-owner summary, no errors.
2. Counts per owner match baseline + 100 products and `100 * stallCount` `stall_products` rows:
   ```sql
   SELECT c.owner_id, COUNT(*) FROM products p
     JOIN categories c ON p.category_id = c.id GROUP BY c.owner_id;
   SELECT s.owner_id, COUNT(*) FROM stall_products sp
     JOIN stalls s ON sp.stall_id = s.id GROUP BY s.owner_id;
   ```
3. Spot-check: `SELECT name, image_url FROM products WHERE image_url LIKE 'https://%' LIMIT 5;`
   confirms remote URLs.
4. **Idempotency**: run `npm run seed:bulk` a second time → product and `stall_products` counts are
   **unchanged**; no duplicate `stall_products` (unique index holds).

## Risks / Notes
- Products are global (no `owner_id`); the cross-owner name guard prevents a product being wrongly
  shared/owned by another owner.
- Remote faker image URLs require network at view time in the browser (per user choice); consistent
  with `normalizeImageUrl` (accepts `https://`).
- Insert volume is small (≤ ~700 `stall_products`); per-row find-or-create is fine. Transaction per
  owner keeps it atomic.
- Existing `seed.js` is **not** modified, so the canonical demo data and `ORDER_COUNT` history are
  untouched; new products simply won't appear in prior seeded orders (acceptable).

## Follow-up
- After implementation, update `context/progress-tracker.md` to record the new `seed:bulk` script.
