import { sequelize, Product, ProductStall, Category, Stall } from '../models/index.js';

function buildProductIncludes(stallProductWhere) {
  const productStallInclude = {
    model: ProductStall,
    required: Boolean(stallProductWhere),
    ...(stallProductWhere ? { where: stallProductWhere } : {}),
    include: [
      {
        model: Stall,
        attributes: ['id', 'name', 'location'],
      },
    ],
  };

  return [
    {
      model: Category,
      attributes: ['id', 'name', 'tone'],
    },
    productStallInclude,
    {
      model: Stall,
      as: 'Stalls',
      attributes: ['id', 'name', 'location'],
      through: {
        attributes: ['id', 'price_usd', 'price_khr', 'is_visible'],
      },
    },
  ];
}

function buildAssignments(productId, stallIds, assignmentData) {
  return stallIds.map((stallId) => ({
    product_id: productId,
    stall_id: stallId,
    price_usd: assignmentData.price_usd,
    price_khr: assignmentData.price_khr,
    is_visible: assignmentData.is_visible ?? true,
  }));
}

/**
 * Fetch all products, including category and stall-specific price/visibility assignments.
 */
export function findAllProducts(whereClause = {}) {
  return Product.findAll({
    where: { ...whereClause, is_deleted: false },
    include: buildProductIncludes(),
    order: [['created_at', 'DESC']],
  });
}

/**
 * Fetch all products assigned to a specific owner's stalls.
 */
export function findAllProductsByOwnerId(ownerId) {
  return Product.findAll({
    where: { is_deleted: false },
    include: [
      {
        model: Category,
        attributes: ['id', 'name', 'tone'],
      },
      {
        model: ProductStall,
        required: true,
        include: [
          {
            model: Stall,
            where: { owner_id: ownerId },
            attributes: ['id', 'name', 'location'],
          },
        ],
      },
      {
        model: Stall,
        as: 'Stalls',
        required: true,
        where: { owner_id: ownerId },
        attributes: ['id', 'name', 'location'],
        through: {
          attributes: ['id', 'price_usd', 'price_khr', 'is_visible'],
        },
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

/**
 * Check if a product belongs to any stall owned by the specified owner.
 */
export async function checkProductOwnership(productId, ownerId) {
  const count = await ProductStall.count({
    where: { product_id: productId },
    include: [
      {
        model: Stall,
        where: { owner_id: ownerId },
        required: true,
      },
    ],
  });
  return count > 0;
}

/**
 * Fetch products associated with a specific stall.
 */
export function findAllProductsForStall(stallId, assignmentWhereClause = {}) {
  return Product.findAll({
    where: { is_deleted: false, is_active: true },
    include: buildProductIncludes({ stall_id: stallId, ...assignmentWhereClause }),
    order: [['created_at', 'DESC']],
  });
}

/**
 * Find a single product by ID.
 */
export function findProductById(id) {
  return Product.findOne({
    where: { id, is_deleted: false },
    include: buildProductIncludes(),
  });
}

export function findStallProduct(productId, stallId, options = {}) {
  return ProductStall.findOne({
    where: {
      product_id: productId,
      stall_id: stallId,
    },
    include: [
      {
        model: Product,
        where: { is_deleted: false, is_active: true },
        include: [
          {
            model: Category,
            attributes: ['id', 'name', 'tone'],
          },
        ],
      },
    ],
    ...options,
  });
}

/**
 * Create a new product and assign it to stalls.
 */
export async function insertProduct(productData, assignmentData, stallIds = []) {
  const product = await sequelize.transaction(async (transaction) => {
    const createdProduct = await Product.create(productData, { transaction });

    if (stallIds.length > 0) {
      await ProductStall.bulkCreate(
        buildAssignments(createdProduct.id, stallIds, assignmentData),
        { transaction }
      );
    }

    return createdProduct;
  });

  return findProductById(product.id);
}

/**
 * Update an existing product and its stall assignments.
 */
export function updateProductById(id, productData, assignmentData) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      return false;
    }

    if (Object.keys(productData).length > 0) {
      await product.update(productData, { transaction });
    }

    if (assignmentData !== undefined) {
      const existingAssignments = await ProductStall.findAll({
        where: { product_id: id },
        transaction,
      });
      const existingByStall = new Map(existingAssignments.map((assignment) => [
        Number(assignment.stall_id),
        assignment,
      ]));
      const defaultAssignment = existingAssignments[0];
      const stallIds = assignmentData.stallIds ?? existingAssignments.map((assignment) => assignment.stall_id);

      await ProductStall.destroy({
        where: { product_id: id },
        transaction,
      });

      if (stallIds.length > 0) {
        const assignments = stallIds.map((stallId) => {
          const existing = existingByStall.get(Number(stallId));
          const priceUsd = assignmentData.price_usd ?? existing?.price_usd ?? defaultAssignment?.price_usd;
          const priceKhr = assignmentData.price_khr ?? existing?.price_khr ?? defaultAssignment?.price_khr;
          const isVisible = assignmentData.is_visible ?? existing?.is_visible ?? defaultAssignment?.is_visible ?? true;
          if (!priceUsd || !priceKhr) {
            const error = new Error('price_usd and price_khr are required before assigning a product to stalls.');
            error.status = 400;
            throw error;
          }
          return {
            product_id: id,
            stall_id: stallId,
            price_usd: priceUsd,
            price_khr: priceKhr,
            is_visible: isVisible,
          };
        });

        await ProductStall.bulkCreate(assignments, { transaction });
      }
    }

    return true;
  });
}

/**
 * Delete a product by ID.
 */
export async function deleteProductById(id) {
  const product = await Product.findByPk(id);
  if (!product) {
    return false;
  }

  const [affectedRows] = await Product.update(
    { 
      is_deleted: true, 
      is_active: false,
      name: `${product.name}_deleted_${Date.now()}`
    },
    { where: { id } }
  );
  return affectedRows > 0;
}
