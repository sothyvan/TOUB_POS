import { Op, UniqueConstraintError } from 'sequelize';
import {
  sequelize,
  AuditLog,
  Order,
  OrderItem,
  Product,
  ProductStall,
  Stall,
  StallStaff,
  User,
} from '../../models/index.js';
import { isKhqrEnabled } from '../../config/env.js';
import { httpError } from '../../utils/http-error.util.js';
import { generateKhqrIndividualPayment } from '../khqr-provider.service.js';
import { emitManagementOrderUpdated } from '../websocket.service.js';
import {
  getOrderById,
  parsePositiveInteger,
} from './order-access.js';
import {
  buildOrderFingerprint,
  normalizeIdempotencyKey,
} from './order-idempotency.js';
import { LIMITS } from '../../validation/request-validation.js';
import { getExchangeRateForOwner } from '../financial-settings.service.js';

const ALLOWED_PAYMENT_METHODS = new Set(['cash', 'khqr']);
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

function normalizePaymentMethod(paymentMethod) {
  const normalized = String(paymentMethod || '').trim().toLowerCase();
  if (!ALLOWED_PAYMENT_METHODS.has(normalized)) {
    throw httpError('paymentMethod must be cash or khqr.');
  }
  return normalized;
}

function normalizeNotes(notes) {
  if (notes === undefined || notes === null || notes === '') {
    return null;
  }
  if (typeof notes !== 'string') {
    throw httpError('Order item notes must be text.');
  }

  const trimmed = notes.trim();
  if (trimmed.length > 500) {
    throw httpError('Order item notes must be 500 characters or less.');
  }
  return trimmed || null;
}

function validateItemShape(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw httpError('Each order item must be an object.');
  }

  const forbiddenFields = FORBIDDEN_ITEM_FIELDS.filter((field) => (
    Object.prototype.hasOwnProperty.call(item, field)
  ));
  if (forbiddenFields.length > 0) {
    throw httpError(`Order item cannot include trusted fields: ${forbiddenFields.join(', ')}.`);
  }
}

function isVisibleStallProduct(stallProduct) {
  return stallProduct.is_visible === true || stallProduct.is_visible === 1;
}

async function findIdempotentOrder(cashierId, idempotencyKey, fingerprint) {
  const existing = await Order.unscoped().findOne({
    where: {
      cashier_id: cashierId,
      idempotency_key: idempotencyKey,
    },
    attributes: ['id', 'idempotency_fingerprint'],
  });
  if (!existing) {
    return null;
  }
  if (existing.idempotency_fingerprint !== fingerprint) {
    throw httpError(
      'This Idempotency-Key was already used for a different order request.',
      409,
      'IDEMPOTENCY_KEY_REUSED',
    );
  }

  return getOrderById(existing.id);
}

export async function createOrder(
  cashierId,
  items,
  paymentMethod,
  pricingCurrency = 'usd',
  rawIdempotencyKey,
  verifiedStallId,
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError('Order must contain items.');
  }
  if (items.length > LIMITS.ORDER_ITEMS) {
    throw httpError(`Order must contain ${LIMITS.ORDER_ITEMS} items or fewer.`);
  }

  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  const normalizedPricingCurrency = String(pricingCurrency || '').trim().toLowerCase();
  if (!['usd', 'khr'].includes(normalizedPricingCurrency)) {
    throw httpError('pricingCurrency must be usd or khr.');
  }
  if (normalizedPaymentMethod === 'khqr' && !isKhqrEnabled()) {
    throw httpError(
      'KHQR payments are temporarily unavailable. Please use cash.',
      503,
      'KHQR_DISABLED',
    );
  }
  if (normalizedPaymentMethod === 'khqr' && normalizedPricingCurrency !== 'usd') {
    throw httpError('KHQR orders must use USD pricing.');
  }

  const parsedCashierId = parsePositiveInteger(cashierId, 'cashier ID');
  const parsedVerifiedStallId = parsePositiveInteger(verifiedStallId, 'verified stall ID');
  const idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
  for (const item of items) {
    validateItemShape(item);
  }
  const { fingerprint, normalizedItems } = buildOrderFingerprint(
    normalizedPaymentMethod,
    items,
    normalizeNotes,
    normalizedPricingCurrency,
  );
  const replayedOrder = await findIdempotentOrder(
    parsedCashierId,
    idempotencyKey,
    fingerprint,
  );
  if (replayedOrder) {
    return { order: replayedOrder, replayed: true };
  }

  let createdOrderId;
  let createdOrderOwnerId;
  const transaction = await sequelize.transaction();

  try {
    const stallStaff = await StallStaff.findOne({
      where: {
        user_id: parsedCashierId,
        stall_id: parsedVerifiedStallId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!stallStaff) {
      throw httpError(
        'Cashier assignment no longer matches this terminal. Please sign in again.',
        401,
        'STALL_ASSIGNMENT_CHANGED',
      );
    }

    const stallId = parsedVerifiedStallId;
    const stall = await Stall.findByPk(stallId, { transaction });
    if (!stall) {
      throw httpError('Assigned stall was not found.', 404);
    }
    createdOrderOwnerId = stall.owner_id;
    const exchangeRateKhrPerUsd = await getExchangeRateForOwner(stall.owner_id, { transaction });

    const cashier = await User.findByPk(parsedCashierId, {
      attributes: ['id', 'username', 'role'],
      transaction,
    });

    const requestedProductIds = normalizedItems.map((item) => item.product_id);
    const stallProducts = await ProductStall.findAll({
      where: {
        product_id: { [Op.in]: requestedProductIds },
        stall_id: stallId,
      },
      include: [{ model: Product }],
      transaction,
    });
    const stallProductMap = new Map(
      stallProducts.map((stallProduct) => [
        Number(stallProduct.product_id),
        stallProduct,
      ]),
    );

    let totalUsd = 0;
    let totalKhr = 0;
    const orderItems = [];
    for (const item of normalizedItems) {
      const productId = item.product_id;
      const quantity = item.quantity;
      const stallProduct = stallProductMap.get(productId);
      if (!stallProduct?.Product) {
        throw httpError(`Product with ID ${productId} not found.`, 404);
      }
      if (!isVisibleStallProduct(stallProduct)) {
        throw httpError('Product is hidden or unavailable.');
      }

      const product = stallProduct.Product;
      const priceUsd = Number(stallProduct.price_usd);
      const priceKhr = Number(stallProduct.price_khr);
      const lineTotalUsd = Number((priceUsd * quantity).toFixed(2));
      const lineTotalKhr = priceKhr * quantity;
      totalUsd += lineTotalUsd;
      totalKhr += lineTotalKhr;
      if (totalUsd > LIMITS.USD_AMOUNT || totalKhr > LIMITS.KHR_AMOUNT) {
        throw httpError('Order total exceeds the supported amount.');
      }
      orderItems.push({
        product_id: product.id,
        name: product.name,
        price_usd: priceUsd,
        price_khr: priceKhr,
        line_total_usd: lineTotalUsd,
        line_total_khr: lineTotalKhr,
        quantity,
        notes: item.notes,
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
      subtotal_khr: totalKhr,
      total_khr: totalKhr,
      pricing_currency: normalizedPricingCurrency,
      exchange_rate_khr_per_usd: exchangeRateKhrPerUsd,
      idempotency_key: idempotencyKey,
      idempotency_fingerprint: fingerprint,
    }, { transaction });
    createdOrderId = order.id;

    for (const orderItem of orderItems) {
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
      owner_id: stall.owner_id,
      action: 'order_created',
      order_id: order.id,
      details: {
        payment_method: normalizedPaymentMethod,
        stall_id: stallId,
        item_count: orderItems.length,
        subtotal_usd: totalUsd,
        total_usd: totalUsd,
        total_khr: totalKhr,
        pricing_currency: normalizedPricingCurrency,
        exchange_rate_khr_per_usd: exchangeRateKhrPerUsd,
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
    if (error instanceof UniqueConstraintError) {
      const concurrentOrder = await findIdempotentOrder(
        parsedCashierId,
        idempotencyKey,
        fingerprint,
      );
      if (concurrentOrder) {
        return { order: concurrentOrder, replayed: true };
      }
    }
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
  return { order: createdOrder, replayed: false };
}
