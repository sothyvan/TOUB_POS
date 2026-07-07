import {
  sequelize,
  AuditLog,
  Order,
  OrderItem,
  Product,
  Stall,
  StallStaff,
  TelegramTicket,
  User,
} from '../models/index.js';
import { generateKhqrIndividualPayment } from './khqr-provider.service.js';
import {
  checkBakongTransactionByMd5,
  getBakongCheckMode,
} from './bakong-provider.service.js';

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

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
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

function isVisibleProduct(product) {
  return product.is_visible === true || product.is_visible === 1;
}

function canAccessOrder(order, actorId, actorRole) {
  return CASH_CONFIRMATION_ROLES.has(actorRole)
    || (actorRole === 'cashier' && Number(order.cashier_id) === actorId);
}

function isKhqrExpired(order) {
  return Boolean(
    order.payment_expires_at
    && new Date(order.payment_expires_at).getTime() < Date.now()
  );
}

function assertBakongPaidResultMatchesOrder(order, providerResult) {
  if (providerResult.amount === null || providerResult.amount === undefined) {
    throw httpError('Bakong paid response did not include an amount.', 400);
  }

  const expectedAmount = Number(order.total_usd);
  if (Math.abs(Number(providerResult.amount) - expectedAmount) > 0.01) {
    throw httpError(`Bakong amount mismatch. Expected ${expectedAmount.toFixed(2)}, received ${Number(providerResult.amount).toFixed(2)}.`, 400);
  }

  const receivedCurrency = normalizeOptionalText(providerResult.currency)?.toUpperCase() || 'USD';
  if (receivedCurrency !== 'USD') {
    throw httpError('Only USD KHQR confirmations are supported in this Phase 5 flow.', 400);
  }

  const expectedDestination = normalizeOptionalText(process.env.BAKONG_ACCOUNT_ID)?.toLowerCase();
  const receivedDestination = normalizeOptionalText(providerResult.destinationAccount)?.toLowerCase();
  if (expectedDestination && receivedDestination && expectedDestination !== receivedDestination) {
    throw httpError('Bakong destination account does not match the configured Bakong account.', 400);
  }
}

function logKhqrStatusCheckDebug(order, checkMode, providerResult = null) {
  console.info('[khqr-status-check]', {
    orderId: order?.id ?? null,
    bakongCheckMode: checkMode,
    hasQrMd5: Boolean(order?.qr_md5),
    orderStatus: order?.status ?? null,
    bakongHttpStatus: providerResult?.httpStatus ?? null,
    bakongResponseCode: providerResult?.responseCode ?? null,
    bakongResponseMessage: providerResult?.responseMessage ?? null,
    normalizedProviderStatus: providerResult?.status ?? null,
    normalizedAmount: providerResult?.amount ?? null,
    normalizedCurrency: providerResult?.currency ?? null,
  });
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
      attributes: ['id', 'name', 'location'],
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

export async function getOrderForActor(orderId, actor) {
  const parsedOrderId = parsePositiveInteger(orderId, 'order ID');
  const actorId = parsePositiveInteger(actor?.id, 'actor ID');
  const actorRole = String(actor?.role || '').toLowerCase();
  const order = await getOrderById(parsedOrderId);

  if (!order) {
    throw httpError('Order not found.', 404);
  }

  if (!canAccessOrder(order, actorId, actorRole)) {
    throw httpError('You cannot access this order.', 403);
  }

  return order;
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
    const stall = await Stall.findByPk(stallId, { transaction });
    if (!stall) {
      throw httpError('Assigned stall was not found.', 404);
    }

    const cashier = await User.findByPk(parsedCashierId, {
      attributes: ['id', 'username', 'role'],
      transaction,
    });

    let totalUsd = 0;
    let totalKhr = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      validateItemShape(item);

      const productId = getProductIdFromItem(item);
      const quantity = parsePositiveInteger(item.quantity, 'quantity');
      const notes = normalizeNotes(item.notes);

      const product = await Product.findByPk(productId, { transaction });
      if (!product) {
        throw httpError(`Product with ID ${productId} not found.`, 404);
      }

      if (Number(product.stall_id) !== Number(stallId)) {
        throw httpError('Product does not belong to this cashier stall.', 403);
      }

      if (!isVisibleProduct(product)) {
        throw httpError('Product is hidden or unavailable.', 400);
      }

      const priceUsd = Number(product.price_usd);
      const priceKhr = Number(product.price_khr);
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
      const khqrPayment = generateKhqrIndividualPayment({ order, stall, cashier });
      order.qr_payload = khqrPayment.qrPayload;
      order.qr_md5 = khqrPayment.qrMd5;
      order.payment_reference = khqrPayment.paymentReference;
      order.payment_expires_at = khqrPayment.expiresAt;
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
        ...(normalizedPaymentMethod === 'khqr' ? {
          payment_reference: order.payment_reference,
          qr_md5: order.qr_md5,
          payment_expires_at: order.payment_expires_at,
        } : {}),
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

  return getOrderById(confirmedOrderId);
}

export async function checkKhqrPaymentStatus(orderId, actor) {
  const parsedOrderId = parsePositiveInteger(orderId, 'order ID');
  const actorId = parsePositiveInteger(actor?.id, 'actor ID');
  const actorRole = String(actor?.role || '').toLowerCase();
  const checkMode = getBakongCheckMode();
  const order = await Order.findByPk(parsedOrderId);

  if (!order) {
    throw httpError('Order not found.', 404);
  }

  if (!canAccessOrder(order, actorId, actorRole)) {
    throw httpError('You cannot check payment status for this order.', 403);
  }

  if (order.payment_method !== 'khqr') {
    throw httpError('Only KHQR orders can be checked with this endpoint.', 400);
  }

  if (order.status === 'paid') {
    logKhqrStatusCheckDebug(order, checkMode);
    return {
      order: await getOrderById(order.id),
      paymentStatus: 'paid',
      providerStatus: 'already_paid',
      checkMode,
      alreadyProcessed: true,
      message: 'Order is already paid.',
    };
  }

  if (order.status === 'cancelled') {
    logKhqrStatusCheckDebug(order, checkMode);
    return {
      order: await getOrderById(order.id),
      paymentStatus: 'cancelled',
      providerStatus: 'not_checked',
      checkMode,
      alreadyProcessed: false,
      message: 'Order is cancelled.',
    };
  }

  if (order.status !== 'pending_payment') {
    logKhqrStatusCheckDebug(order, checkMode);
    return {
      order: await getOrderById(order.id),
      paymentStatus: order.status,
      providerStatus: 'not_checked',
      checkMode,
      alreadyProcessed: false,
      message: 'Order is not pending payment.',
    };
  }

  if (isKhqrExpired(order)) {
    logKhqrStatusCheckDebug(order, checkMode);
    return {
      order: await getOrderById(order.id),
      paymentStatus: 'expired',
      providerStatus: 'expired',
      checkMode,
      alreadyProcessed: false,
      message: 'KHQR payment request has expired.',
    };
  }

  if (!order.qr_md5) {
    logKhqrStatusCheckDebug(order, checkMode);
    throw httpError('KHQR md5 is missing for this order.', 400);
  }

  let providerResult;
  try {
    providerResult = await checkBakongTransactionByMd5(order.qr_md5);
  } catch (error) {
    logKhqrStatusCheckDebug(order, checkMode);
    throw error;
  }
  logKhqrStatusCheckDebug(order, checkMode, providerResult);

  if (providerResult.status === 'not_found') {
    return {
      order: await getOrderById(order.id),
      paymentStatus: 'pending_payment',
      providerStatus: 'not_found',
      checkMode,
      alreadyProcessed: false,
      message: 'Payment has not been found yet.',
    };
  }

  if (providerResult.status === 'failed') {
    return {
      order: await getOrderById(order.id),
      paymentStatus: 'pending_payment',
      providerStatus: 'failed',
      checkMode,
      alreadyProcessed: false,
      message: 'Bakong returned a failed payment status.',
    };
  }

  if (providerResult.status === 'error') {
    return {
      order: await getOrderById(order.id),
      paymentStatus: 'pending_payment',
      providerStatus: 'error',
      checkMode,
      alreadyProcessed: false,
      message: providerResult.errorMessage || 'Unable to check Bakong payment status right now.',
    };
  }

  assertBakongPaidResultMatchesOrder(order, providerResult);

  let confirmedOrderId;
  let alreadyProcessed = false;
  const transaction = await sequelize.transaction();

  try {
    const lockedOrder = await Order.findByPk(parsedOrderId, {
      transaction,
      lock: true,
    });

    if (!lockedOrder) {
      throw httpError('Order not found.', 404);
    }

    if (lockedOrder.status === 'paid') {
      confirmedOrderId = lockedOrder.id;
      alreadyProcessed = true;
      await transaction.commit();
    } else {
      if (lockedOrder.status === 'cancelled') {
        throw httpError('Cancelled orders cannot be confirmed.', 409);
      }

      if (lockedOrder.status !== 'pending_payment') {
        throw httpError('Order is not pending payment.', 400);
      }

      if (isKhqrExpired(lockedOrder)) {
        throw httpError('KHQR payment request has expired.', 409);
      }

      assertBakongPaidResultMatchesOrder(lockedOrder, providerResult);

      lockedOrder.status = 'paid';
      lockedOrder.completed_at = new Date();
      await lockedOrder.save({ transaction });

      await AuditLog.create({
        actor_user_id: actorId,
        action: 'khqr_payment_confirmed',
        order_id: lockedOrder.id,
        details: {
          payment_reference: lockedOrder.payment_reference,
          qr_md5: lockedOrder.qr_md5,
          amount: providerResult.amount,
          currency: normalizeOptionalText(providerResult.currency)?.toUpperCase() || 'USD',
          hash: providerResult.hash,
          source: 'bakong_status_check',
          checked_by_role: actorRole,
        },
      }, { transaction });

      confirmedOrderId = lockedOrder.id;
      await transaction.commit();
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    order: await getOrderById(confirmedOrderId),
    paymentStatus: 'paid',
    providerStatus: 'paid',
    checkMode,
    alreadyProcessed,
    message: alreadyProcessed ? 'Order was already paid.' : 'KHQR payment confirmed by Bakong.',
  };
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
