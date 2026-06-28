import * as orderService from '../services/order.service.js';

/**
 * cashier creates a new order
 */
export async function createOrder(req, res, next) {
  try {
    const cashierId = req.user.id; 
    const { items, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain items.' });
    }

    const result = await orderService.createOrder(cashierId, items, paymentMethod);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * owner/manager fetches all orders list
 */
export async function getAllOrders(req, res, next) {
  try {
    const orders = await orderService.getAllOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}

/**
 * cashier fetches their own orders list
 */
export async function getMyOrders(req, res, next) {
  try {
    const cashierId = req.user.id;
    const orders = await orderService.getOrdersByUser(cashierId);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}


