import { sequelize, Product, ProductStall, Category, Stall } from '../models/index.js';
import { parsePagination, buildOrderClause, paginatedResponse } from '../utils/pagination.js';

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
export async function findAllProducts(whereClause = {}, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'name'], [['created_at', 'DESC']]);

  const { rows, count } = await Product.findAndCountAll({
    where: { ...whereClause, is_deleted: false },
    include: buildProductIncludes(),
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
    subQuery: false,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Fetch all products assigned to a specific owner's stalls.
 */
export async function findAllProductsByOwnerId(ownerId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'name'], [['created_at', 'DESC']]);

  const { rows, count } = await Product.findAndCountAll({
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
    ],
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
    subQuery: false,
  });
  return paginatedResponse({ rows, count }, pagination);
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
 * Fetch ALL products for a specific stall — no pagination.
 * Cashiers need the full menu visible at once; the stall-scoped
 * dataset is small enough that loading everything is the right call.
 */
export async function findAllProductsForStall(stallId, assignmentWhereClause = {}) {
  const rows = await Product.findAll({
    where: { is_deleted: false, is_active: true },
    include: buildProductIncludes({ stall_id: stallId, ...assignmentWhereClause }),
    order: [['name', 'ASC']],
    subQuery: false,
  });
  return rows;
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
