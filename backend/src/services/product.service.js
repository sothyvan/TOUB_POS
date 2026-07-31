import * as productRepository from '../repositories/product.repository.js';
import * as stallRepository from '../repositories/stall.repository.js';
import * as categoryRepository from '../repositories/category.repository.js';
import * as imagekitService from './imagekit.service.js';
import { httpError } from '../utils/http-error.util.js';
import { sequelize } from '../models/index.js';
import { AUDIT_ACTIONS, writeAdministrativeAudit } from './audit.service.js';

const MAX_IMAGE_URL_LENGTH = 500;

function resolveOwnerId(actor) {
  return actor.role === 'owner' ? actor.id : actor.owner_id;
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeImageUrl(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw httpError('image_url must be a string.');
  }

  const trimmed = value.trim();
  if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
    throw httpError(`image_url must be ${MAX_IMAGE_URL_LENGTH} characters or fewer.`);
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    throw httpError('image_url must be an absolute URL or an app-relative path.');
  }
  return trimmed;
}

function parseStallIds({ stall_id, stall_ids }, includeWhenMissing = true) {
  if (!includeWhenMissing && stall_ids === undefined && stall_id === undefined) {
    return undefined;
  }

  const rawStallIds = Array.isArray(stall_ids)
    ? stall_ids
    : stall_id
      ? [stall_id]
      : [];
  return rawStallIds.map((id) => parsePositiveInteger(id)).filter(Boolean);
}

async function validateStalls(stallIds, ownerId) {
  for (const id of stallIds) {
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      throw httpError(`Stall with ID ${id} not found.`, 404);
    }
    if (stall.owner_id !== ownerId) {
      throw httpError(`Forbidden: Stall with ID ${id} belongs to another owner.`, 403);
    }
  }
}

async function validateCategory(categoryId, ownerId) {
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) {
    throw httpError('Category not found.', 404);
  }
  if (category.owner_id !== ownerId) {
    throw httpError('Forbidden: Category does not belong to your business.', 403);
  }
}

async function requireOwnedProduct(productId, ownerId) {
  const isOwned = await productRepository.checkProductOwnership(productId, ownerId);
  if (!isOwned) {
    throw httpError('Forbidden: Product does not belong to your stalls.', 403);
  }
}

export async function listProducts(actor, query = {}) {
  if (actor?.role === 'cashier') {
    const stallId = parsePositiveInteger(actor.stall_id);
    if (!stallId) {
      throw httpError('Cashier session does not have a verified stall.', 401);
    }
    const products = await productRepository.findAllProductsForStall(stallId, { is_visible: true });
    return { data: products };
  }

  return productRepository.findAllProductsByOwnerId(resolveOwnerId(actor), query);
}

export function getImageKitAuth() {
  return imagekitService.getUploadAuthenticationParameters();
}

export async function createProduct(actor, payload, requestId) {
  const {
    name,
    price_usd,
    price_khr,
    image_url,
    is_visible,
    category_id,
  } = payload;

  if (!name || price_usd === undefined || price_khr === undefined) {
    throw httpError('name, price_usd, and price_khr are required.');
  }

  const parsedPriceUsd = parsePositiveNumber(price_usd);
  const parsedPriceKhr = parsePositiveInteger(price_khr);
  if (parsedPriceUsd === null || parsedPriceKhr === null) {
    throw httpError('Prices must be positive numbers.');
  }

  const parsedCategoryId = parsePositiveInteger(category_id);
  if (!parsedCategoryId) {
    throw httpError('category_id is required.');
  }

  const imageUrl = normalizeImageUrl(image_url);
  const stallIds = parseStallIds(payload);
  const ownerId = resolveOwnerId(actor);
  await validateStalls(stallIds, ownerId);
  await validateCategory(parsedCategoryId, ownerId);

  return sequelize.transaction(async (transaction) => {
    const product = await productRepository.insertProduct({
      name,
      category_id: parsedCategoryId,
      image_url: imageUrl,
      default_price_usd: parsedPriceUsd,
      default_price_khr: parsedPriceKhr,
    }, {
      price_usd: parsedPriceUsd,
      price_khr: parsedPriceKhr,
      is_visible: is_visible ?? true,
    }, stallIds, { transaction });
    await writeAdministrativeAudit({
      actor, ownerId, action: AUDIT_ACTIONS.PRODUCT_CREATED, targetType: 'product',
      targetId: product.id, requestId,
      after: { name, category_id: parsedCategoryId, price_usd: parsedPriceUsd, price_khr: parsedPriceKhr, stall_ids: stallIds, is_visible: is_visible ?? true },
      transaction,
    });
    return product;
  });
}

export async function updateProduct(actor, productId, payload, requestId) {
  const ownerId = resolveOwnerId(actor);
  await requireOwnedProduct(productId, ownerId);

  return sequelize.transaction(async (transaction) => {
  const existing = await productRepository.findProductById(productId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!existing) {
    throw httpError('Product not found.', 404);
  }

  const updateData = {};
  const assignmentData = {};

  if (payload.name !== undefined) {
    updateData.name = payload.name;
  }
  if (payload.price_usd !== undefined) {
    const priceUsd = parsePositiveNumber(payload.price_usd);
    if (priceUsd === null) {
      throw httpError('Price must be a positive number.');
    }
    updateData.default_price_usd = priceUsd;
    assignmentData.price_usd = priceUsd;
  }
  if (payload.price_khr !== undefined) {
    const priceKhr = parsePositiveInteger(payload.price_khr);
    if (priceKhr === null) {
      throw httpError('KHR price must be a positive integer.');
    }
    updateData.default_price_khr = priceKhr;
    assignmentData.price_khr = priceKhr;
  }
  if (payload.image_url !== undefined) {
    updateData.image_url = normalizeImageUrl(payload.image_url);
  }
  if (payload.category_id !== undefined) {
    const categoryId = parsePositiveInteger(payload.category_id);
    if (!categoryId) {
      throw httpError('category_id must be a positive integer.');
    }
    await validateCategory(categoryId, ownerId);
    updateData.category_id = categoryId;
  }

  const stallIds = parseStallIds(payload, false);
  if (stallIds !== undefined) {
    await validateStalls(stallIds, ownerId);
    assignmentData.stallIds = stallIds;
  }
  if (payload.is_visible !== undefined) {
    assignmentData.is_visible = payload.is_visible;
  }

  const hasAssignmentChanges = Object.keys(assignmentData).length > 0;
  const success = await productRepository.updateProductById(
    productId,
    updateData,
    hasAssignmentChanges ? assignmentData : undefined,
    { transaction },
  );
  if (!success) {
    throw httpError('Product not found or no changes made.', 404);
  }
  const currentAssignments = existing.ProductStalls || [];
  await writeAdministrativeAudit({
    actor, ownerId, action: AUDIT_ACTIONS.PRODUCT_UPDATED, targetType: 'product',
    targetId: productId, requestId,
    before: {
      name: existing.name, category_id: existing.category_id,
      price_usd: existing.default_price_usd, price_khr: existing.default_price_khr,
      image_configured: Boolean(existing.image_url),
      stall_ids: currentAssignments.map((item) => Number(item.stall_id)),
    },
    after: {
      name: updateData.name ?? existing.name,
      category_id: updateData.category_id ?? existing.category_id,
      price_usd: updateData.default_price_usd ?? existing.default_price_usd,
      price_khr: updateData.default_price_khr ?? existing.default_price_khr,
      image_configured: updateData.image_url !== undefined ? Boolean(updateData.image_url) : Boolean(existing.image_url),
      stall_ids: stallIds ?? currentAssignments.map((item) => Number(item.stall_id)),
      ...(payload.is_visible !== undefined ? { is_visible: payload.is_visible } : {}),
    }, transaction,
  });
  });
}

export async function deleteProduct(actor, productId, requestId) {
  const ownerId = resolveOwnerId(actor);
  await requireOwnedProduct(productId, ownerId);
  return sequelize.transaction(async (transaction) => {
  const product = await productRepository.findProductById(productId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!product) {
    throw httpError('Product not found.', 404);
  }
  const success = await productRepository.deleteProductById(productId, { transaction });
  if (!success) {
    throw httpError('Product not found.', 404);
  }
  await writeAdministrativeAudit({
    actor, ownerId, action: AUDIT_ACTIONS.PRODUCT_DELETED, targetType: 'product',
    targetId: productId, requestId,
    before: { name: product.name, category_id: product.category_id, price_usd: product.default_price_usd, price_khr: product.default_price_khr },
    transaction,
  });
  });
}
