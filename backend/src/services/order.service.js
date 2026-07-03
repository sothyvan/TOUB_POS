import {
  sequelize,
  AuditLog,
  Order,
  OrderItem,
  Product,
  ProductStall,
  Stall,
  StallStaff,
  TelegramTicket,
  User,
} from '../models/index.js';
import { dispatchToTelegram } from './telegram.service.js';

const ALLOWED_PAYMENT_METHODS = new Set(['cash', 'khqr']);
const CASH_CONFIRMATION_ROLES = new Set(['owner', 'manager']);
const FORBIDDEN_ITEM_FIELDS = [
  'price',
  'price_usd',
  'price_khr',
  'lineTotal',
  'line_total_usd',
  'line_total_khr',
  'subtotal',
  'subtotal_usd',
  'total',
  'total_usd',
  'stall_id',
  'stallId',
  'cashier_id',
  'cashierId',
  'status',
  'paid',
];

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parsePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw httpError(`${fieldName} must be a positive integer.`, 400);
  }
  return number;
}

function normalizePaymentMethod(paymentMethod) {
  const normalized = String(paymentMethod || '').trim().toLowerCase();
  if (!ALLOWED_PAYMENT_METHODS.has(normalized)) {
    throw httpError('paymentMethod must be cash or khqr.', 400);
  }
  return normalized;
}

function normalizeNotes(notes) {
  if (notes === undefined || notes === null || notes === '') {
    return null;
  }

  if (typeof notes !== 'string') {
    throw httpError('Order item notes must be text.', 400);
  }

  const trimmed = notes.trim();
  if (trimmed.length > 500) {
    throw httpError('Order item notes must be 500 characters or less.', 400);
  }

  return trimmed || null;
}

function validateItemShape(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw httpError('Each order item must be an object.', 400);
  }

  const forbiddenFields = FORBIDDEN_ITEM_FIELDS.filter((field) => hasOwn(item, field));
  if (forbiddenFields.length > 0) {
    throw httpError(`Order item cannot include trusted fields: ${forbiddenFields.join(', ')}.`, 400);
  }
}

function getProductIdFromItem(item) {
  const productId = item.product_id ?? item.productId ?? item.id;
  return parsePositiveInteger(productId, 'product_id');
}

function isVisibleStallProduct(stallProduct) {
  return stallProduct.is_visible === true || stallProduct.is_visible === 1;
}

function buildOrderInclude() {
  return [
    {
      model: OrderItem,
      as: 'Items',
    },
    {
      model: TelegramTicket,
      as: 'TelegramTickets',
    },
    {
      model: Stall,
      attributes: ['id', 'name', 'location', 'telegram_chat_id'],
    },
    {
      model: User,
      as: 'Cashier',
      attributes: ['id', 'username', 'role'],
    },
  ];
}

export function getOrderById(orderId) {
  return Order.findByPk(orderId, {
    include: buildOrderInclude(),
  });
}

/**
 * Creates a new order along with its order items inside a transaction.
 */
export async function createOrder(cashierId, items, paymentMethod) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError('Order must contain items.', 400);
  }

  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  const parsedCashierId = parsePositiveInteger(cashierId, 'cashier ID');
  let createdOrderId;

  const transaction = await sequelize.transaction();

  try {
    // Resolve the stall from backend-owned staff assignment, never from request body.
    const stallStaff = await StallStaff.findOne({
      where: { user_id: parsedCashierId },
      transaction,
    });

    if (!stallStaff) {
      throw httpError('Cashier is not assigned to any stall.', 403);
    }

    const stallId = stallStaff.stall_id;
    let totalUsd = 0;
    let totalKhr = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      validateItemShape(item);

      const productId = getProductIdFromItem(item);
      const quantity = parsePositiveInteger(item.quantity, 'quantity');
      const notes = normalizeNotes(item.notes);

      const stallProduct = await ProductStall.findOne({
        where: {
          product_id: productId,
          stall_id: stallId,
        },
        include: [
          {
            model: Product,
          },
        ],
        transaction,
      });

      if (!stallProduct?.Product) {
        throw httpError(`Product with ID ${productId} not found.`, 404);
      }

      const product = stallProduct.Product;

      if (!isVisibleStallProduct(stallProduct)) {
        throw httpError('Product is hidden or unavailable.', 400);
      }

      const priceUsd = Number(stallProduct.price_usd);
      const priceKhr = Number(stallProduct.price_khr);
      const lineTotalUsd = Number((priceUsd * quantity).toFixed(2));
      const lineTotalKhr = priceKhr * quantity;

      totalUsd += lineTotalUsd;
      totalKhr += lineTotalKhr;

      orderItemsToCreate.push({
        product_id: product.id,
        name: product.name,
        price_usd: priceUsd,
        price_khr: priceKhr,
        line_total_usd: lineTotalUsd,
        line_total_khr: lineTotalKhr,
        quantity,
        notes,
      });
    }

    totalUsd = Number(totalUsd.toFixed(2));

    const order = await Order.create({
      stall_id: stallId,
      cashier_id: parsedCashierId,
      payment_method: normalizedPaymentMethod,
      status: 'pending_payment',
      subtotal_usd: totalUsd,
      total_usd: totalUsd,
    }, { transaction });
    createdOrderId = order.id;

    for (const orderItem of orderItemsToCreate) {
      await OrderItem.create({
        order_id: order.id,
        ...orderItem,
      }, { transaction });
    }

    if (normalizedPaymentMethod === 'khqr') {
      order.qr_payload = `MOCK_KHQR_ORDER_${order.id}_AMOUNT_${totalUsd}`;
      await order.save({ transaction });
    }

    await AuditLog.create({
      actor_user_id: parsedCashierId,
      action: 'order_created',
      order_id: order.id,
      details: {
        payment_method: normalizedPaymentMethod,
        stall_id: stallId,
        item_count: orderItemsToCreate.length,
        subtotal_usd: totalUsd,
        total_usd: totalUsd,
        total_khr: totalKhr,
      },
    }, { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return getOrderById(createdOrderId);
}

export async function confirmCashPayment(orderId, actor) {
  const parsedOrderId = parsePositiveInteger(orderId, 'order ID');
  const actorId = parsePositiveInteger(actor?.id, 'actor ID');
  const actorRole = String(actor?.role || '').toLowerCase();
  let confirmedOrderId;

  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(parsedOrderId, {
      transaction,
      lock: true,
    });

    if (!order) {
      throw httpError('Order not found.', 404);
    }

    const isManagementUser = CASH_CONFIRMATION_ROLES.has(actorRole);
    const isOwningCashier = actorRole === 'cashier' && Number(order.cashier_id) === actorId;
    if (!isManagementUser && !isOwningCashier) {
      throw httpError('You cannot confirm payment for this order.', 403);
    }

    if (order.payment_method !== 'cash') {
      throw httpError('Only cash orders can be confirmed with this endpoint.', 400);
    }

    if (order.status === 'paid') {
      throw httpError('Order has already been paid.', 409);
    }

    if (order.status === 'cancelled') {
      throw httpError('Cancelled orders cannot be confirmed.', 409);
    }

    if (order.status !== 'pending_payment') {
      throw httpError('Order is not pending payment.', 400);
    }

    order.status = 'paid';
    order.completed_at = new Date();
    await order.save({ transaction });

    await AuditLog.create({
      actor_user_id: actorId,
      action: 'cash_payment_confirmed',
      order_id: order.id,
      details: {
        cashier_id: order.cashier_id,
        stall_id: order.stall_id,
        total_usd: Number(order.total_usd),
        confirmed_by_role: actorRole,
      },
    }, { transaction });

    confirmedOrderId = order.id;
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const confirmedOrder = await getOrderById(confirmedOrderId);

  // Fire-and-forget: Telegram dispatch must not affect the payment confirmation response.
  // If the bot is down or the stall has no chat ID, the order is still paid successfully.
  dispatchToTelegram(confirmedOrder).catch((err) => {
    console.error('[Telegram] Unexpected dispatch error after cash confirm:', err);
  });

  return confirmedOrder;
}

/**
 * Fetch all orders, including items.
 */
export function getAllOrders() {
  return Order.findAll({
    include: buildOrderInclude(),
    order: [['created_at', 'DESC']],
  });
}

/**
 * Fetch all orders created by a specific cashier, including items.
 */
export function getOrdersByUser(cashierId) {
  return Order.findAll({
    where: { cashier_id: cashierId },
    include: buildOrderInclude(),
    order: [['created_at', 'DESC']],
  });
}
