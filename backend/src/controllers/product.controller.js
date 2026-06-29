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

async function validateProductRefs(res, stallId, categoryId) {
  const stall = await stallRepository.findStallById(stallId);
  if (!stall) {
    res.status(404).json({ success: false, message: 'Stall not found.' });
    return false;
  }

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
    const whereClause = {};
    if (req.user?.role === 'cashier') {
      const stall = await userRepository.findAssignedStallByUserId(req.user.id);
      if (!stall) {
        return res.json({ success: true, data: [] });
      }
      whereClause.stall_id = stall.id;
      whereClause.is_visible = true;
    }
    const products = await productRepository.findAllProducts(whereClause);
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
    const { name, price_usd, price_khr, image_url, is_visible, stall_id, category_id } = req.body;
    if (!name || price_usd === undefined || price_khr === undefined) {
      return res.status(400).json({ success: false, message: 'name, price_usd, and price_khr are required.' });
    }
    const parsedPriceUsd = parsePositiveNumber(price_usd);
    const parsedPriceKhr = parsePositiveNumber(price_khr);
    if (parsedPriceUsd === null || parsedPriceKhr === null) {
      return res.status(400).json({ success: false, message: 'Prices must be positive numbers.' });
    }
    const parsedStallId = parsePositiveInteger(stall_id);
    const parsedCategoryId = parsePositiveInteger(category_id);
    if (!parsedStallId || !parsedCategoryId) {
      return res.status(400).json({ success: false, message: 'stall_id and category_id are required.' });
    }
    const refsAreValid = await validateProductRefs(res, parsedStallId, parsedCategoryId);
    if (!refsAreValid) {
      return;
    }
    const product = await productRepository.insertProduct({
      name,
      price_usd: parsedPriceUsd,
      price_khr: parsedPriceKhr,
      image_url,
      is_visible,
      stall_id: parsedStallId,
      category_id: parsedCategoryId,
    });
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
    const { name, price_usd, price_khr, image_url, is_visible, stall_id, category_id } = req.body;

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
    if (stall_id !== undefined) {
      const parsedStallId = parsePositiveInteger(stall_id);
      if (!parsedStallId) {
        return res.status(400).json({ success: false, message: 'stall_id must be a positive integer.' });
      }
      const stall = await stallRepository.findStallById(parsedStallId);
      if (!stall) {
        return res.status(404).json({ success: false, message: 'Stall not found.' });
      }
      updateData.stall_id = parsedStallId;
    }
    if (category_id !== undefined) {
      const parsedCategoryId = parsePositiveInteger(category_id);
      if (!parsedCategoryId) {
        return res.status(400).json({ success: false, message: 'category_id must be a positive integer.' });
      }
      const category = await categoryRepository.findCategoryById(parsedCategoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }
      updateData.category_id = parsedCategoryId;
    }

    const success = await productRepository.updateProductById(id, updateData);
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
