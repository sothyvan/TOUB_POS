# Fix: Base seed overwrites existing product images with placeholders

## Context (verified in code)
- Running `npm run seed` (base seed) re-upserts seed products through `seeders/menu.js` → `upsertProduct`.
- On an **existing** product (`!created`), it runs `product.update({ category_id: categoryId, image_url: seed.imageUrl })` (`menu.js`), overwriting `image_url` with the static placeholder local path from `data.js` (e.g. `Pork Skewers → '/images/products/pork-skewers.jpg'`).
- This clobbers real images a user uploaded (e.g. ImageKit `https://...` URLs), reverting them to broken placeholders.
- **The bulk script is NOT the cause.** `seed-bulk-products.js:85` uses `Product.findOrCreate({ where: { name } })` with no `update`, and new products get remote faker URLs (`https://loremflickr.com/...`), never a local `/images/products/*.jpg`. So it never touches existing products or writes placeholder paths.
- Decision: **preserve `image_url` on existing products**; keep the seed's current category/price reassignment behavior.

## Change
File: `backend/src/scripts/seeders/menu.js` — function `upsertProduct`.

Remove `image_url` from the `!created` update branch. Keep `image_url` only in `defaults` (the create path).

Before:
```js
if (!created) {
  await product.update({ category_id: categoryId, image_url: seed.imageUrl });
}
```
After:
```js
if (!created) {
  await product.update({ category_id: categoryId });
}
```

No change to `seed-bulk-products.js` (already append-only and image-safe).

## Validation
1. `cd backend && npx eslint src/scripts/seeders/menu.js` — clean.
2. Via UI, upload a real image to a seed product (e.g. "Pork Skewers"); confirm its `image_url` is an `https://` URL.
3. Run `npm run seed` **twice**; confirm that product's `image_url` is unchanged (still the `https://` URL) and it still maps to the correct category.
4. On a fresh DB, run `npm run seed`; confirm newly created seed products still receive the placeholder `image_url` from `defaults`.
5. SQL sanity check before/after: `SELECT name, image_url FROM products WHERE name = 'Pork Skewers';` — image_url preserved across re-seed.

## Risks / Notes
- User-created (never-seeded) products: unaffected (their images were never clobbered by this path anyway).
- Seed products whose image a user intentionally wants reset to the placeholder will no longer reset on re-seed (acceptable; editable manually).
- `category_id` reassignment on existing products is intentionally unchanged per the chosen scope.
- `upsertStallProduct` (per-stall price/visibility) is unchanged — outside the reported issue.
