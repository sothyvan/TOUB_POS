import * as orderService from '../services/order.service.js';
import { sanitizeOrderTelegramMetadata } from '../utils/telegram-identifier.util.js';

const FORBIDDEN_ORDER_FIELDS = [
  'id',
  'orderId',
  'stall_id',
  'stallId',
  'cashier_id',
  'cashierId',
  'subtotal',
  'subtotal_usd',
  'total',
  'total_usd',
  'paid',
  'status',
  'cash_received_usd',
  'cashReceivedUsd',
  'change_due_usd',
  'changeDueUsd',
  'qr_payload',
  'qrPayload',
  'qr_md5',
  'qrMd5',
  'payment_reference',
  'paymentReference',
  'payment_expires_at',
  'paymentExpiresAt',
  'completed_at',
  'completedAt',
  'created_at',
  'updated_at',
];

const FORBIDDEN_CASH_CONFIRM_FIELDS = [
  'id',
  'orderId',
  'stall_id',
  'stallId',
  'cashier_id',
  'cashierId',
  'subtotal',
  'subtotal_usd',
  'total',
  'total_usd',
  'status',
  'paid',
  'change_due_usd',
  'changeDueUsd',
  'completed_at',
  'completedAt',
];

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * cashier creates a new order
 */
export async function createOrder(req, res, next) {
  try {
    const forbiddenFields = FORBIDDEN_ORDER_FIELDS.filter((field) => hasOwn(req.body, field));
    if (forbiddenFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Order request cannot include trusted fields: ${forbiddenFields.join(', ')}.`,
      });
    }

    const cashierId = req.user.id;
    const { items } = req.body;
    const paymentMethod = req.body.paymentMethod ?? req.body.payment_method;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain items.' });
    }

    const idempotencyKey = req.get('Idempotency-Key');
    const result = await orderService.createOrder(
      cashierId,
      items,
      paymentMethod,
      idempotencyKey,
      req.user.stall_id,
    );
    if (result.replayed) {
      res.set('Idempotent-Replayed', 'true');
    }
    res
      .status(result.replayed ? 200 : 201)
      .json({ success: true, data: sanitizeOrderTelegramMetadata(result.order) });
  } catch (error) {
    next(error);
  }
}

/**
 * cashier or management confirms a cash order after cash was physically received.
 */
export async function confirmCashPayment(req, res, next) {
  try {
    const body = req.body || {};
    const forbiddenFields = FORBIDDEN_CASH_CONFIRM_FIELDS.filter((field) => hasOwn(body, field));
    if (forbiddenFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cash confirmation cannot include trusted fields: ${forbiddenFields.join(', ')}.`,
      });
    }

    const cashReceivedUsd = body.cash_received_usd ?? body.cashReceivedUsd;
    const order = await orderService.confirmCashPayment(req.params.id, req.user, cashReceivedUsd);
    res.json({ success: true, data: sanitizeOrderTelegramMetadata(order) });
  } catch (error) {
    next(error);
  }
}

/**
 * cashier, owner, or manager fetches one order.
 */
export async function getOrder(req, res, next) {
  try {
    const order = await orderService.getOrderForActor(req.params.id, req.user);
    res.json({ success: true, data: sanitizeOrderTelegramMetadata(order) });
  } catch (error) {
    next(error);
  }
}

/**
 * cashier, owner, or manager checks a KHQR order against Bakong.
 */
export async function checkKhqrPaymentStatus(req, res, next) {
  try {
    const result = await orderService.checkKhqrPaymentStatus(req.params.id, req.user);
    res.json({ success: true, data: sanitizeOrderTelegramMetadata(result) });
  } catch (error) {
    next(error);
  }
}

/**
 * owner/manager or the creating cashier retries Telegram kitchen dispatch for a paid order.
 */
export async function retryTelegramDispatch(req, res, next) {
  try {
    const order = await orderService.retryTelegramDispatch(req.params.id, req.user);
    res.json({ success: true, data: sanitizeOrderTelegramMetadata(order) });
  } catch (error) {
    next(error);
  }
}

/**
 * owner/manager fetches all orders list
 */
export async function getAllOrders(req, res, next) {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.owner_id;
    const result = await orderService.getAllOrders(ownerId, req.query);
    res.json({
      success: true,
      ...result,
      data: result.data.map(sanitizeOrderTelegramMetadata),
    });
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
    const result = await orderService.getOrdersByUser(cashierId, req.query);
    res.json({
      success: true,
      ...result,
      data: result.data.map(sanitizeOrderTelegramMetadata),
    });
  } catch (error) {
    next(error);
  }
}


