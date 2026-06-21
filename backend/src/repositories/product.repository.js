import { Product, Category } from '../models/index.js';

/**
 * Fetch all products, including their category association.
 */
export async function findAllProducts() {
  return Product.findAll({
    include: [
      {
        model: Category,
        attributes: ['id', 'name', 'tone'],
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
    ],
  });
}

/**
 * Create a new product.
 */
export async function insertProduct(data) {
  return Product.create(data);
}

/**
 * Update an existing product.
 */
export async function updateProductById(id, data) {
  const [affectedRows] = await Product.update(data, { where: { id } });
  return affectedRows > 0;
}

/**
 * Delete a product by ID.
 */
export async function deleteProductById(id) {
  const affectedRows = await Product.destroy({ where: { id } });
  return affectedRows > 0;
}
