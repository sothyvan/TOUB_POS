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
  User,
} from '../../models/index.js';
import { httpError } from '../../utils/http-error.util.js';
import { generateKhqrIndividualPayment } from '../khqr-provider.service.js';
import { emitManagementOrderUpdated } from '../websocket.service.js';
import {
  getOrderById,
  parsePositiveInteger,
} from './order-access.js';

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

function getProductIdFromItem(item) {
  const productId = item.product_id ?? item.productId ?? item.id;
  return parsePositiveInteger(productId, 'product_id');
}

function isVisibleStallProduct(stallProduct) {
  return stallProduct.is_visible === true || stallProduct.is_visible === 1;
}

export async function createOrder(cashierId, items, paymentMethod) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError('Order must contain items.');
  }

  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  const parsedCashierId = parsePositiveInteger(cashierId, 'cashier ID');
  let createdOrderId;
  let createdOrderOwnerId;
  const transaction = await sequelize.transaction();

  try {
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

    for (const item of items) {
      validateItemShape(item);
    }
    const requestedProductIds = items.map(getProductIdFromItem);
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
    for (const item of items) {
      const productId = getProductIdFromItem(item);
      const quantity = parsePositiveInteger(item.quantity, 'quantity');
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
      orderItems.push({
        product_id: product.id,
        name: product.name,
        price_usd: priceUsd,
        price_khr: priceKhr,
        line_total_usd: lineTotalUsd,
        line_total_khr: lineTotalKhr,
        quantity,
        notes: normalizeNotes(item.notes),
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
      action: 'order_created',
      order_id: order.id,
      details: {
        payment_method: normalizedPaymentMethod,
        stall_id: stallId,
        item_count: orderItems.length,
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
