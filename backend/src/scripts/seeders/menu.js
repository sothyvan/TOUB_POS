import { faker } from '@faker-js/faker';
import { Category, Product, ProductStall } from '../../models/index.js';
import { CATEGORY_SEEDS, PRODUCT_SEEDS } from './data.js';
import { roundUsd, toKhr } from './helpers.js';

export async function upsertCategory(seed) {
  const [category, created] = await Category.findOrCreate({
    where: { name: seed.name },
    defaults: seed,
  });

  if (!created) {
    await category.update({ tone: seed.tone });
  }

  return category;
}

export async function upsertProduct(seed, categoryId) {
  const [product, created] = await Product.findOrCreate({
    where: { name: seed.name },
    defaults: {
      category_id: categoryId,
      name: seed.name,
      image_url: seed.imageUrl,
    },
  });

  if (!created) {
    await product.update({
      category_id: categoryId,
      image_url: seed.imageUrl,
    });
  }

  return product;
}

export async function upsertStallProduct({ stallId, productId, priceUsd, visible = true }) {
  const [stallProduct, created] = await ProductStall.findOrCreate({
    where: {
      stall_id: stallId,
      product_id: productId,
    },
    defaults: {
      stall_id: stallId,
      product_id: productId,
      price_usd: priceUsd,
      price_khr: toKhr(priceUsd),
      is_visible: visible,
    },
  });

  if (!created) {
    await stallProduct.update({
      price_usd: priceUsd,
      price_khr: toKhr(priceUsd),
      is_visible: visible,
    });
  }

  return stallProduct;
}

export async function seedMenu(stallsByName) {
  const categoriesByName = new Map();
  for (const categorySeed of CATEGORY_SEEDS) {
    const category = await upsertCategory(categorySeed);
    categoriesByName.set(category.name, category);
  }

  const products = [];
  for (const productSeed of PRODUCT_SEEDS) {
    const category = categoriesByName.get(productSeed.categoryName);
    const product = await upsertProduct(productSeed, category.id);
    products.push({ product, seed: productSeed });
  }

  for (const stall of stallsByName.values()) {
    for (const { product, seed } of products) {
      const priceOffset = faker.number.float({ min: -0.25, max: 0.75, fractionDigits: 2 });
      await upsertStallProduct({
        stallId: stall.id,
        productId: product.id,
        priceUsd: Math.max(1, roundUsd(seed.baseUsd + priceOffset)),
        visible: faker.datatype.boolean({ probability: 0.9 }),
      });
    }
  }

  return { categoriesByName, products };
}
