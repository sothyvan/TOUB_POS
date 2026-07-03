import * as productRepository from '../repositories/product.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import * as stallRepository from '../repositories/stall.repository.js';
import * as categoryRepository from '../repositories/category.repository.js';

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
 * Create a new product.
 */
export async function createProduct(req, res, next) {
  try {
    const { name, price_usd, price_khr, image_url, is_visible, stall_id, stall_ids, category_id } = req.body;
    if (!name || price_usd === undefined || price_khr === undefined) {
      return res.status(400).json({ success: false, message: 'name, price_usd, and price_khr are required.' });
    }
    const parsedPriceUsd = parsePositiveNumber(price_usd);
    const parsedPriceKhr = parsePositiveNumber(price_khr);
    if (parsedPriceUsd === null || parsedPriceKhr === null) {
      return res.status(400).json({ success: false, message: 'Prices must be positive numbers.' });
    }
    const parsedCategoryId = parsePositiveInteger(category_id);
    if (!parsedCategoryId) {
      return res.status(400).json({ success: false, message: 'category_id is required.' });
    }
    const categoryValid = await validateCategoryRef(res, parsedCategoryId);
    if (!categoryValid) {
      return;
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

    const legacyStallId = validatedStallIds.length > 0 ? validatedStallIds[0] : null;

    const product = await productRepository.insertProduct({
      name,
      price_usd: parsedPriceUsd,
      price_khr: parsedPriceKhr,
      image_url,
      is_visible,
      stall_id: legacyStallId,
      category_id: parsedCategoryId,
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
    if (name !== undefined) {updateData.name = name;}
    if (price_usd !== undefined) {
      const parsedPriceUsd = parsePositiveNumber(price_usd);
      if (parsedPriceUsd === null) {
        return res.status(400).json({ success: false, message: 'Price must be a positive number.' });
      }
      updateData.price_usd = parsedPriceUsd;
    }
    if (price_khr !== undefined) {
      const parsedPriceKhr = parsePositiveNumber(price_khr);
      if (parsedPriceKhr === null) {
        return res.status(400).json({ success: false, message: 'Price must be a positive number.' });
      }
      updateData.price_khr = parsedPriceKhr;
    }
    if (image_url !== undefined) {updateData.image_url = image_url;}
    if (is_visible !== undefined) {updateData.is_visible = is_visible;}
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

    let validatedStallIds = undefined;
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
      updateData.stall_id = validatedStallIds.length > 0 ? validatedStallIds[0] : null;
    }

    const success = await productRepository.updateProductById(id, updateData, validatedStallIds);
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
