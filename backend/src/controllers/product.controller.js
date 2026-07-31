import * as productService from '../services/product.service.js';

export async function getProducts(req, res, next) {
  try {
    const result = await productService.listProducts(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export function getImageKitAuth(_req, res, next) {
  try {
    const authParams = productService.getImageKitAuth();
    res.json({ success: true, data: authParams });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.user, req.body, req.requestId);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    await productService.updateProduct(req.user, req.params.id, req.body, req.requestId);
    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await productService.deleteProduct(req.user, req.params.id, req.requestId);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
