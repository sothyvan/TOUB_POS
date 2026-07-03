import * as productRepository from '../repositories/product.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import * as stallRepository from '../repositories/stall.repository.js';
import * as categoryRepository from '../repositories/category.repository.js';
import * as imagekitService from '../services/imagekit.service.js';

const MAX_IMAGE_URL_LENGTH = 500;

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
    return { ok: true, value: undefined };
  }

  if (value === null || value === '') {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return { ok: false, message: 'image_url must be a string.' };
  }

  const trimmed = value.trim();
  if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
    return { ok: false, message: `image_url must be ${MAX_IMAGE_URL_LENGTH} characters or fewer.` };
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    return { ok: false, message: 'image_url must be an absolute URL or an app-relative path.' };
  }

  return { ok: true, value: trimmed };
}

async function validateProductStalls(res, stallIds) {
  for (const id of stallIds) {
    const stall = await stallRepository.findStallById(id);
    if (!stall) {
      res.status(404).json({ success: false, message: `Stall with ID ${id} not found.` });
      return false;
    }
  }
  return true;
}

async function validateCategoryRef(res, categoryId) {
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) {
    res.status(404).json({ success: false, message: 'Category not found.' });
    return false;
  }
  return true;
}

/**
 * Get all products.
 */
export async function getProducts(req, res, next) {
  try {
    if (req.user?.role === 'cashier') {
      const stall = await userRepository.findAssignedStallByUserId(req.user.id);
      if (!stall) {
        return res.json({ success: true, data: [] });
      }
      const products = await productRepository.findAllProductsForStall(stall.id, { is_visible: true });
      return res.json({ success: true, data: products });
    }
    const products = await productRepository.findAllProducts({});
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

/**
 * Get short-lived ImageKit auth params for browser-direct uploads.
 */
export function getImageKitAuth(_req, res, next) {
  try {
    const authParams = imagekitService.getUploadAuthenticationParameters();
    res.json({ success: true, data: authParams });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new product.
 */
export async function createProduct(req, res, next) {
  try {
    const { name, price_usd, price_khr, image_url, is_visible, stall_id, stall_ids, category_id } = req.body;
    if (!name || price_usd === undefined || price_khr === undefined) {
      return res.status(400).json({ success: false, message: 'name, price_usd, and price_khr are required.' });
    }
    const parsedPriceUsd = parsePositiveNumber(price_usd);
    const parsedPriceKhr = parsePositiveInteger(price_khr);
    if (parsedPriceUsd === null || parsedPriceKhr === null) {
      return res.status(400).json({ success: false, message: 'Prices must be positive numbers.' });
    }
    const parsedCategoryId = parsePositiveInteger(category_id);
    if (!parsedCategoryId) {
      return res.status(400).json({ success: false, message: 'category_id is required.' });
    }
    const normalizedImageUrl = normalizeImageUrl(image_url);
    if (!normalizedImageUrl.ok) {
      return res.status(400).json({ success: false, message: normalizedImageUrl.message });
    }

    let validatedStallIds = [];
    if (Array.isArray(stall_ids)) {
      validatedStallIds = stall_ids.map(id => parsePositiveInteger(id)).filter(Boolean);
    } else if (stall_id) {
      const parsedStallId = parsePositiveInteger(stall_id);
      if (parsedStallId) {
        validatedStallIds = [parsedStallId];
      }
    }

    const stallsValid = await validateProductStalls(res, validatedStallIds);
    if (!stallsValid) {
      return;
    }
    const categoryValid = await validateCategoryRef(res, parsedCategoryId);
    if (!categoryValid) {
      return;
    }

    const product = await productRepository.insertProduct({
      name,
      category_id: parsedCategoryId,
      image_url: normalizedImageUrl.value,
    }, {
      price_usd: parsedPriceUsd,
      price_khr: parsedPriceKhr,
      is_visible: is_visible ?? true,
    }, validatedStallIds);

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing product.
 */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { name, price_usd, price_khr, image_url, is_visible, stall_id, stall_ids, category_id } = req.body;

    const updateData = {};
    const assignmentData = {};
    if (name !== undefined) {updateData.name = name;}
    if (price_usd !== undefined) {
      const parsedPriceUsd = parsePositiveNumber(price_usd);
      if (parsedPriceUsd === null) {
        return res.status(400).json({ success: false, message: 'Price must be a positive number.' });
      }
      assignmentData.price_usd = parsedPriceUsd;
    }
    if (price_khr !== undefined) {
      const parsedPriceKhr = parsePositiveInteger(price_khr);
      if (parsedPriceKhr === null) {
        return res.status(400).json({ success: false, message: 'KHR price must be a positive integer.' });
      }
      assignmentData.price_khr = parsedPriceKhr;
    }
    if (image_url !== undefined) {
      const normalizedImageUrl = normalizeImageUrl(image_url);
      if (!normalizedImageUrl.ok) {
        return res.status(400).json({ success: false, message: normalizedImageUrl.message });
      }
      updateData.image_url = normalizedImageUrl.value;
    }
    if (category_id !== undefined) {
      const parsedCategoryId = parsePositiveInteger(category_id);
      if (!parsedCategoryId) {
        return res.status(400).json({ success: false, message: 'category_id must be a positive integer.' });
      }
      const categoryValid = await validateCategoryRef(res, parsedCategoryId);
      if (!categoryValid) {
        return;
      }
      updateData.category_id = parsedCategoryId;
    }

    let validatedStallIds;
    if (stall_ids !== undefined || stall_id !== undefined) {
      let rawStallIds = [];
      if (Array.isArray(stall_ids)) {
        rawStallIds = stall_ids;
      } else if (stall_id !== undefined) {
        rawStallIds = stall_id ? [stall_id] : [];
      }
      validatedStallIds = rawStallIds.map(sid => parsePositiveInteger(sid)).filter(Boolean);
      const stallsValid = await validateProductStalls(res, validatedStallIds);
      if (!stallsValid) {
        return;
      }
      assignmentData.stallIds = validatedStallIds;
    }

    if (is_visible !== undefined) {
      assignmentData.is_visible = is_visible;
    }

    const hasAssignmentChanges = Object.keys(assignmentData).length > 0;
    const success = await productRepository.updateProductById(
      id,
      updateData,
      hasAssignmentChanges ? assignmentData : undefined
    );
    if (!success) {
      return res.status(404).json({ success: false, message: 'Product not found or no changes made.' });
    }
    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a product by ID.
 */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const success = await productRepository.deleteProductById(id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
