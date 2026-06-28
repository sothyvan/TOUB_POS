import * as productRepository from '../repositories/product.repository.js';
import * as userRepository from '../repositories/user.repository.js';

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
    if (price_usd < 0 || price_khr < 0) {
      return res.status(400).json({ success: false, message: 'Prices must be positive numbers.' });
    }
    if (!stall_id || !category_id) {
      return res.status(400).json({ success: false, message: 'stall_id and category_id are required.' });
    }
    const product = await productRepository.insertProduct({
      name,
      price_usd,
      price_khr,
      image_url,
      is_visible,
      stall_id,
      category_id,
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
      if (price_usd < 0) {return res.status(400).json({ success: false, message: 'Price must be positive.' });}
      updateData.price_usd = price_usd;
    }
    if (price_khr !== undefined) {
      if (price_khr < 0) {return res.status(400).json({ success: false, message: 'Price must be positive.' });}
      updateData.price_khr = price_khr;
    }
    if (image_url !== undefined) {updateData.image_url = image_url;}
    if (is_visible !== undefined) {updateData.is_visible = is_visible;}
    if (stall_id !== undefined) {updateData.stall_id = stall_id;}
    if (category_id !== undefined) {updateData.category_id = category_id;}

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
