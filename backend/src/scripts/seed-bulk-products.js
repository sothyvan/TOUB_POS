/* eslint-disable no-console */
/**
 * Standalone, idempotent bulk product seeder.
 *
 * Appends BULK_PRODUCTS_PER_OWNER new demo products per owner, assigns each to one
 * of that owner's existing categories, links every product to each of the owner's
 * active stalls (via stall_products), and gives each product a remote faker image URL.
 *
 * Runs independently of the deterministic seed.js so the canonical demo data is untouched.
 * Re-running it does not create duplicates (find-or-create by product name and by
 * (stall_id, product_id)).
 */
import 'dotenv/config';
import { faker } from '@faker-js/faker';
import sequelize, { ensureDatabaseExists } from '../config/db.js';
import { User, Category, Stall, Product, ProductStall } from '../models/index.js';
import { roundUsd, toKhr } from './seeders/helpers.js';

const BULK_PRODUCTS_PER_OWNER = 100;
const BULK_SEED_BASE = 20260715;
const MAX_IMAGE_URL_LENGTH = 500;
const MAX_NAME_RETRIES = 25;

function clampImageUrl(url) {
  if (!url) {
    return null;
  }
  return url.length > MAX_IMAGE_URL_LENGTH ? url.slice(0, MAX_IMAGE_URL_LENGTH) : url;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedOwner(owner) {
  const categories = await Category.findAll({ where: { owner_id: owner.id } });
  const stalls = await Stall.findAll({
    where: { owner_id: owner.id, is_active: true, is_deleted: false },
  });

  if (categories.length === 0 || stalls.length === 0) {
    console.warn(
      `[seed:bulk] Skipping ${owner.username}: needs >=1 category and >=1 active stall ` +
        `(categories=${categories.length}, stalls=${stalls.length}).`,
    );
    return;
  }

  const ownerCategoryIds = new Set(categories.map((category) => category.id));
  const ownerSlug = slugify(owner.username);

  // Deterministic per owner so re-runs reproduce identical names => idempotent.
  faker.seed(BULK_SEED_BASE + owner.id);

  let productsCreated = 0;
  let linksCreated = 0;

  await sequelize.transaction(async (t) => {
    const usedNames = new Set();
    let suffixCounter = 0;

    for (let i = 0; i < BULK_PRODUCTS_PER_OWNER; i += 1) {
      const category = faker.helpers.arrayElement(categories);
      const baseUsd = roundUsd(faker.number.float({ min: 0.5, max: 12, fractionDigits: 2 }));
      const imageUrl = clampImageUrl(
        faker.image.urlLoremFlickr({ category: category.name.toLowerCase() }) ||
          faker.image.url(),
      );

      // In-run unique name (counter suffix on collision).
      let name = faker.commerce.productName();
      while (usedNames.has(name)) {
        suffixCounter += 1;
        name = `${faker.commerce.productName()} ${suffixCounter}`;
      }

      // Find-or-create with a cross-owner contamination guard: if a product with this
      // name already exists under a *different* owner's category, regenerate the name.
      let product;
      let attempts = 0;
      while (true) {
        const [record, created] = await Product.findOrCreate({
          where: { name },
          defaults: {
            category_id: category.id,
            name,
            image_url: imageUrl,
            is_active: true,
          },
          transaction: t,
        });

        if (created || ownerCategoryIds.has(record.category_id)) {
          product = record;
          if (created) {
            productsCreated += 1;
          }
          break;
        }

        attempts += 1;
        if (attempts > MAX_NAME_RETRIES) {
          throw new Error(
            `[seed:bulk] Unable to resolve a unique product name for ${owner.username}.`,
          );
        }
        suffixCounter += 1;
        name = `${faker.commerce.productName()} ${ownerSlug} ${suffixCounter}`;
      }

      usedNames.add(product.name);

      // Link the product to each of the owner's stalls (separate row per stall).
      for (const stall of stalls) {
        const priceOffset = faker.number.float({ min: -0.25, max: 0.75, fractionDigits: 2 });
        const priceUsd = Math.max(0.5, roundUsd(baseUsd + priceOffset));
        const [, linkCreated] = await ProductStall.findOrCreate({
          where: { stall_id: stall.id, product_id: product.id },
          defaults: {
            stall_id: stall.id,
            product_id: product.id,
            price_usd: priceUsd,
            price_khr: toKhr(priceUsd),
            is_visible: faker.datatype.boolean({ probability: 0.95 }),
          },
          transaction: t,
        });
        if (linkCreated) {
          linksCreated += 1;
        }
      }
    }
  });

  console.log(
    `[seed:bulk] ${owner.username}: +${productsCreated} new products, ` +
      `+${linksCreated} new stall links across ${stalls.length} stalls.`,
  );
}

async function main() {
  await ensureDatabaseExists();
  await sequelize.authenticate();
  const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : {};
  await sequelize.sync(syncOptions);

  console.log('[seed:bulk] Database connection established.');

  const owners = await User.findAll({
    where: { role: 'owner' },
    order: [['id', 'ASC']],
  });

  if (owners.length === 0) {
    console.warn('[seed:bulk] No owners found (role="owner"). Run `npm run seed` first.');
    return;
  }

  for (const owner of owners) {
    await seedOwner(owner);
  }

  console.log('[seed:bulk] Bulk product seeding complete.');
}

main()
  .catch((error) => {
    console.error('[seed:bulk] Failed to seed bulk products:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
