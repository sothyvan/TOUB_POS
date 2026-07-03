import { Product, Category, Stall } from '../models/index.js';

/**
 * Fetch all products, including their category and stall associations.
 */
export async function findAllProducts(whereClause = {}) {
  return Product.findAll({
    where: whereClause,
    include: [
      {
        model: Category,
        attributes: ['id', 'name', 'tone'],
      },
      {
        model: Stall,
        as: 'Stalls',
        attributes: ['id', 'name', 'location'],
        through: { attributes: [] },
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

/**
 * Fetch products associated with a specific stall.
 */
export async function findAllProductsForStall(stallId, whereClause = {}) {
  return Product.findAll({
    where: whereClause,
    include: [
      {
        model: Category,
        attributes: ['id', 'name', 'tone'],
      },
      {
        model: Stall,
        as: 'Stalls',
        where: { id: stallId },
        attributes: ['id', 'name', 'location'],
        through: { attributes: [] },
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

/**
 * Find a single product by ID.
 */
export async function findProductById(id) {
  return Product.findByPk(id, {
    include: [
      {
        model: Category,
        attributes: ['id', 'name', 'tone'],
      },
      {
        model: Stall,
        as: 'Stalls',
        attributes: ['id', 'name', 'location'],
        through: { attributes: [] },
      },
    ],
  });
}

/**
 * Create a new product and assign it to stalls.
 */
export async function insertProduct(data, stallIds = []) {
  const product = await Product.create(data);
  if (stallIds && stallIds.length > 0) {
    await product.setStalls(stallIds);
  }
  return findProductById(product.id);
}

/**
 * Update an existing product and its stall assignments.
 */
export async function updateProductById(id, data, stallIds) {
  const [affectedRows] = await Product.update(data, { where: { id } });
  if (stallIds !== undefined) {
    const product = await Product.findByPk(id);
    if (product) {
      await product.setStalls(stallIds);
    }
  }
  return affectedRows > 0 || stallIds !== undefined;
}

/**
 * Delete a product by ID.
 */
export async function deleteProductById(id) {
  const affectedRows = await Product.destroy({ where: { id } });
  return affectedRows > 0;
}
