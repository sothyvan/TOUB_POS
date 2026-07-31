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
 * Fetch all products in a specific owner's catalog.
 *
 * Category ownership keeps unassigned products manageable, while the optional
 * stall include returns only assignments that belong to the same business.
 */
export async function findAllProductsByOwnerId(ownerId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'name'], [['created_at', 'DESC']]);

  const { rows, count } = await Product.findAndCountAll({
    where: { is_deleted: false },
    include: [
      {
        model: Category,
        where: { owner_id: ownerId },
        required: true,
        attributes: ['id', 'name', 'tone'],
      },
      {
        model: ProductStall,
        required: false,
        include: [
          {
            model: Stall,
            where: { owner_id: ownerId },
            required: true,
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
 * Check if a product belongs to the specified owner's catalog.
 *
 * Products may intentionally have no stall assignments, so ownership comes
 * from their required owner-scoped category rather than the assignment table.
 */
export async function checkProductOwnership(productId, ownerId) {
  const count = await Product.count({
    where: { id: productId, is_deleted: false },
    include: [
      {
        model: Category,
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
export function findProductById(id, options = {}) {
  return Product.findOne({
    where: { id, is_deleted: false },
    include: buildProductIncludes(),
    ...options,
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
export async function insertProduct(productData, assignmentData, stallIds = [], options = {}) {
  const createProduct = async (transaction) => {
    const createdProduct = await Product.create(productData, { transaction });

    if (stallIds.length > 0) {
      await ProductStall.bulkCreate(
        buildAssignments(createdProduct.id, stallIds, assignmentData),
        { transaction }
      );
    }

    return createdProduct;
  };
  const product = options.transaction
    ? await createProduct(options.transaction)
    : await sequelize.transaction(createProduct);

  return findProductById(product.id, options);
}

/**
 * Update an existing product and its stall assignments.
 */
export function updateProductById(id, productData, assignmentData, options = {}) {
  const updateProduct = async (transaction) => {
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
          const priceUsd = assignmentData.price_usd
            ?? existing?.price_usd
            ?? defaultAssignment?.price_usd
            ?? product.default_price_usd;
          const priceKhr = assignmentData.price_khr
            ?? existing?.price_khr
            ?? defaultAssignment?.price_khr
            ?? product.default_price_khr;
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
  };
  return options.transaction
    ? updateProduct(options.transaction)
    : sequelize.transaction(updateProduct);
}

/**
 * Delete a product by ID.
 */
export async function deleteProductById(id, options = {}) {
  const product = await Product.findByPk(id, options);
  if (!product) {
    return false;
  }

  const [affectedRows] = await Product.update(
    { 
      is_deleted: true, 
      is_active: false,
      name: `${product.name}_deleted_${Date.now()}`
    },
    { where: { id }, ...options }
  );
  return affectedRows > 0;
}
