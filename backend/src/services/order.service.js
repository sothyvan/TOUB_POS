import { Op } from 'sequelize';
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
import { generateKhqrIndividualPayment } from './khqr-provider.service.js';
import {
  checkBakongTransactionByMd5,
  getBakongCheckMode,
} from './bakong-provider.service.js';
import {
  emitManagementOrderUpdated,
  emitPaymentConfirmed,
} from './websocket.service.js';
import {
  parsePagination,
  buildOrderClause,
  paginatedResponse,
} from '../utils/pagination.js';

const ALLOWED_PAYMENT_METHODS = new Set(['cash', 'khqr']);
const MANAGEMENT_ORDER_ROLES = new Set(['owner', 'manager']);
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

function parseUsdCents(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw httpError(`${fieldName} must be a positive USD amount with up to 2 decimals.`, 400);
  }

  const number = Number(text);
  if (!Number.isFinite(number) || number <= 0) {
    throw httpError(`${fieldName} must be greater than 0.`, 400);
  }

  return Math.round(number * 100);
}

function centsToUsd(cents) {
  return (cents / 100).toFixed(2);
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

function isVisibleStallProduct(stallProduct) {
  return stallProduct.is_visible === true || stallProduct.is_visible === 1;
}

function getActorOwnerId(actor) {
  const actorRole = String(actor?.role || '').toLowerCase();
  if (actorRole === 'owner') {
    return Number(actor.id);
  }
  if (actorRole === 'manager') {
    return Number(actor.owner_id);
  }
  return null;
}

function getOrderOwnerId(order) {
  return Number(order?.Stall?.owner_id ?? order?.stall?.owner_id);
}

function canAccessOrder(order, actor) {
  const actorId = Number(actor?.id);
  const actorRole = String(actor?.role || '').toLowerCase();

  if (actorRole === 'cashier') {
    return Number(order.cashier_id) === actorId;
  }

  if (MANAGEMENT_ORDER_ROLES.has(actorRole)) {
    const actorOwnerId = getActorOwnerId(actor);
    const orderOwnerId = getOrderOwnerId(order);
    return Number.isInteger(actorOwnerId)
      && Number.isInteger(orderOwnerId)
      && actorOwnerId > 0
      && actorOwnerId === orderOwnerId;
  }

  return false;
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
  if (!expectedDestination) {
    throw httpError('BAKONG_ACCOUNT_ID is required for KHQR payment validation.', 503);
  }

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
      attributes: ['id', 'name', 'location', 'telegram_chat_id'],
    },
    {
      model: User,
      as: 'Cashier',
      attributes: ['id', 'username', 'role'],
    },
  ];
}

function buildPaymentConfirmedPayload(order) {
  return {
    orderId: order.id,
    status: order.status,
    paymentMethod: order.payment_method,
    totalUsd: Number(order.total_usd),
    completedAt: order.completed_at,
  };
}

function dispatchPaidOrderToTelegram(order, context) {
  // Fire-and-forget: kitchen dispatch must not affect payment confirmation responses.
  dispatchToTelegram(order).catch((err) => {
    console.error(`[Telegram] Unexpected dispatch error after ${context}:`, err);
  });
}

function getLatestTelegramTicket(orderId) {
  return TelegramTicket.findOne({
    where: { order_id: orderId },
    order: [['id', 'DESC']],
  });
}

function buildOrderAccessInclude() {
  return [
    {
      model: Stall,
      attributes: ['id', 'owner_id'],
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
  parsePositiveInteger(actor?.id, 'actor ID');
  const order = await Order.findByPk(parsedOrderId, {
    include: buildOrderAccessInclude(),
  });

  if (!order) {
    throw httpError('Order not found.', 404);
  }

  if (!canAccessOrder(order, actor)) {
    throw httpError('You cannot access this order.', 403);
  }

  return getOrderById(parsedOrderId);
}

export async function retryTelegramDispatch(orderId, actor) {
  const parsedOrderId = parsePositiveInteger(orderId, 'order ID');
  parsePositiveInteger(actor?.id, 'actor ID');

  const order = await Order.findByPk(parsedOrderId, {
    include: buildOrderAccessInclude(),
  });

  if (!order) {
    throw httpError('Order not found.', 404);
  }

  if (!canAccessOrder(order, actor)) {
    throw httpError('You cannot retry Telegram dispatch for this order.', 403);
  }

  if (order.status !== 'paid') {
    throw httpError('Only paid orders can be dispatched to Telegram.', 400);
  }

  const latestTicket = await getLatestTelegramTicket(parsedOrderId);
  if (latestTicket && ['sent', 'done'].includes(latestTicket.status)) {
    throw httpError(`Telegram ticket is already ${latestTicket.status}.`, 409);
  }
  if (latestTicket?.status === 'pending') {
    throw httpError('Telegram ticket dispatch is still pending. Please wait for it to finish.', 409);
  }

  const fullOrder = await getOrderById(parsedOrderId);
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw httpError('TELEGRAM_BOT_TOKEN is required before retrying Telegram dispatch.', 503);
  }

  if (!fullOrder?.Stall?.telegram_chat_id) {
    throw httpError('This order stall does not have a Telegram kitchen chat configured.', 400);
  }

  await dispatchToTelegram(fullOrder, { forceRetry: true });
  return getOrderById(parsedOrderId);
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
  let createdOrderOwnerId;

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
    createdOrderOwnerId = stall.owner_id;

    const cashier = await User.findByPk(parsedCashierId, {
      attributes: ['id', 'username', 'role'],
      transaction,
    });

    let totalUsd = 0;
    let totalKhr = 0;
    const orderItemsToCreate = [];

    // --- Validate item shapes and collect product IDs before hitting the DB ---
    // We do this pass first so we reject obviously malformed requests immediately.
    for (const item of items) {
      validateItemShape(item);
    }

    const requestedProductIds = items.map(getProductIdFromItem);

    // Single batch query instead of one findOne() per item (eliminates N+1).
    // The composite index on (stall_id, product_id) in stall_products makes this fast.
    const stallProducts = await ProductStall.findAll({
      where: {
        product_id: { [Op.in]: requestedProductIds },
        stall_id: stallId,
      },
      include: [{ model: Product }],
      transaction,
    });

    // Build a Map keyed by product_id for O(1) lookup inside the loop.
    const stallProductMap = new Map(
      stallProducts.map((sp) => [Number(sp.product_id), sp])
    );

    for (const item of items) {
      const productId = getProductIdFromItem(item);
      const quantity = parsePositiveInteger(item.quantity, 'quantity');
      const notes = normalizeNotes(item.notes);

      const stallProduct = stallProductMap.get(productId);

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

  const createdOrder = await getOrderById(createdOrderId);
  emitManagementOrderUpdated({
    ownerId: createdOrderOwnerId,
    orderId: createdOrder.id,
    status: createdOrder.status,
    paymentMethod: createdOrder.payment_method,
    changeType: 'created',
  });

  return createdOrder;
}

export async function confirmCashPayment(orderId, actor, cashReceivedUsd) {
  const parsedOrderId = parsePositiveInteger(orderId, 'order ID');
  const actorId = parsePositiveInteger(actor?.id, 'actor ID');
  const actorRole = String(actor?.role || '').toLowerCase();
  let confirmedOrderId;
  let confirmedOrderOwnerId;

  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(parsedOrderId, {
      include: buildOrderAccessInclude(),
      transaction,
      lock: true,
    });

    if (!order) {
      throw httpError('Order not found.', 404);
    }

    if (!canAccessOrder(order, actor)) {
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

    const orderTotalCents = parseUsdCents(order.total_usd, 'order total');
    const cashReceivedCents = parseUsdCents(cashReceivedUsd, 'cash_received_usd');
    if (cashReceivedCents < orderTotalCents) {
      throw httpError('Cash received must be greater than or equal to the order total.', 400);
    }

    const changeDueCents = cashReceivedCents - orderTotalCents;

    order.status = 'paid';
    order.cash_received_usd = centsToUsd(cashReceivedCents);
    order.change_due_usd = centsToUsd(changeDueCents);
    order.completed_at = new Date();
    await order.save({ transaction });
    confirmedOrderOwnerId = getOrderOwnerId(order);

    await AuditLog.create({
      actor_user_id: actorId,
      action: 'cash_payment_confirmed',
      order_id: order.id,
      details: {
        cashier_id: order.cashier_id,
        stall_id: order.stall_id,
        total_usd: Number(order.total_usd),
        cash_received_usd: Number(centsToUsd(cashReceivedCents)),
        change_due_usd: Number(centsToUsd(changeDueCents)),
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
  emitManagementOrderUpdated({
    ownerId: confirmedOrderOwnerId,
    orderId: confirmedOrder.id,
    status: confirmedOrder.status,
    paymentMethod: confirmedOrder.payment_method,
    changeType: 'paid',
  });

  dispatchPaidOrderToTelegram(confirmedOrder, 'cash confirm');

  return confirmedOrder;
}

function resolveKhqrCheckContext(actor, options = {}) {
  const requireAccess = options.requireAccess !== false;
  const actorUserId = options.actorUserId === null
    ? null
    : parsePositiveInteger(options.actorUserId ?? actor?.id, 'actor ID');
  const checkedByRole = options.checkedByRole
    || String(actor?.role || '').toLowerCase()
    || 'system';

  return {
    actorUserId,
    checkedByRole,
    source: options.source || 'bakong_status_check',
    requireAccess,
  };
}

async function checkKhqrPaymentStatusInternal(orderId, actor, options = {}) {
  const parsedOrderId = parsePositiveInteger(orderId, 'order ID');
  const checkContext = resolveKhqrCheckContext(actor, options);
  const checkMode = getBakongCheckMode();
  const order = await Order.findByPk(parsedOrderId, {
    include: buildOrderAccessInclude(),
  });
  const orderOwnerId = getOrderOwnerId(order);

  if (!order) {
    throw httpError('Order not found.', 404);
  }

  if (checkContext.requireAccess && !canAccessOrder(order, actor)) {
    throw httpError('You cannot check payment status for this order.', 403);
  }

  if (order.payment_method !== 'khqr') {
    throw httpError('Only KHQR orders can be checked with this endpoint.', 400);
  }

  if (order.status === 'paid') {
    logKhqrStatusCheckDebug(order, checkMode);
    const paidOrder = await getOrderById(order.id);
    dispatchPaidOrderToTelegram(paidOrder, 'already-paid KHQR status check');

    return {
      order: paidOrder,
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
        actor_user_id: checkContext.actorUserId,
        action: 'khqr_payment_confirmed',
        order_id: lockedOrder.id,
        details: {
          payment_reference: lockedOrder.payment_reference,
          qr_md5: lockedOrder.qr_md5,
          amount: providerResult.amount,
          currency: normalizeOptionalText(providerResult.currency)?.toUpperCase() || 'USD',
          hash: providerResult.hash,
          source: checkContext.source,
          checked_by_role: checkContext.checkedByRole,
        },
      }, { transaction });

      confirmedOrderId = lockedOrder.id;
      await transaction.commit();
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const confirmedOrder = await getOrderById(confirmedOrderId);

  if (!alreadyProcessed) {
    emitManagementOrderUpdated({
      ownerId: orderOwnerId,
      orderId: confirmedOrder.id,
      status: confirmedOrder.status,
      paymentMethod: confirmedOrder.payment_method,
      changeType: 'paid',
    });

    emitPaymentConfirmed(
      confirmedOrder.cashier_id,
      buildPaymentConfirmedPayload(confirmedOrder)
    );
    dispatchPaidOrderToTelegram(confirmedOrder, 'KHQR confirm');
  } else {
    dispatchPaidOrderToTelegram(confirmedOrder, 'already-paid KHQR confirm');
  }

  return {
    order: confirmedOrder,
    paymentStatus: 'paid',
    providerStatus: 'paid',
    checkMode,
    alreadyProcessed,
    message: alreadyProcessed ? 'Order was already paid.' : 'KHQR payment confirmed by Bakong.',
  };
}

export function checkKhqrPaymentStatus(orderId, actor) {
  return checkKhqrPaymentStatusInternal(orderId, actor, {
    requireAccess: true,
    source: 'bakong_status_check',
  });
}

export function checkKhqrPaymentStatusAsSystem(orderId) {
  return checkKhqrPaymentStatusInternal(orderId, null, {
    requireAccess: false,
    actorUserId: null,
    checkedByRole: 'system',
    source: 'bakong_background_checker',
  });
}

/**
 * Fetch all orders, optionally filtered by owner.
 * Supports pagination, search, and optional date/status filters via query options.
 */
export async function getAllOrders(ownerId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const { search, startDate, endDate, status } = queryOptions;

  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'status', 'total_usd'], [['created_at', 'DESC']]);

  const where = {};
  if (startDate && endDate) {
    where.created_at = { [Op.between]: [startDate, endDate] };
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where[Op.or] = [
      { id: { [Op.eq]: search.replace('#', '') } },
    ];
  }

  if (ownerId) {
    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
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
          where: { owner_id: ownerId },
          attributes: ['id', 'name', 'location', 'telegram_chat_id'],
        },
        {
          model: User,
          as: 'Cashier',
          attributes: ['id', 'username', 'role'],
        },
      ],
      order: orderClause,
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    });
    return paginatedResponse({ rows, count }, pagination);
  }

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: buildOrderInclude(),
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });
  return paginatedResponse({ rows, count }, pagination);
}

/**
 * Fetch orders created by a specific cashier, including items.
 * Supports pagination.
 */
export async function getOrdersByUser(cashierId, queryOptions = {}) {
  const pagination = parsePagination(queryOptions);
  const orderClause = buildOrderClause(pagination, ['created_at', 'id', 'status', 'total_usd'], [['created_at', 'DESC']]);

  const { rows, count } = await Order.findAndCountAll({
    where: { cashier_id: cashierId },
    include: buildOrderInclude(),
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });
  return paginatedResponse({ rows, count }, pagination);
}
