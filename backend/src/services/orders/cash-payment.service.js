import {
  sequelize,
  AuditLog,
  Order,
} from '../../models/index.js';
import { httpError } from '../../utils/http-error.util.js';
import { emitManagementOrderUpdated } from '../websocket.service.js';
import {
  buildOrderAccessInclude,
  canAccessOrder,
  centsToUsd,
  getOrderById,
  getOrderOwnerId,
  parsePositiveInteger,
  parseUsdCents,
} from './order-access.js';
import {
  enqueuePaidOrderTelegramDispatch,
  requestPaidOrderTelegramDispatch,
} from './order-telegram.service.js';

export function calculateMixedCashSettlement({
  totalUsd,
  totalKhr,
  pricingCurrency,
  exchangeRateKhrPerUsd,
  cashReceivedUsd = null,
  cashReceivedKhr = null,
}) {
  const rate = parsePositiveInteger(exchangeRateKhrPerUsd, 'exchange rate');
  const totalUsdCents = parseUsdCents(totalUsd, 'order total');
  const parsedTotalKhr = parsePositiveInteger(totalKhr, 'KHR order total');
  const receivedUsdCents = cashReceivedUsd === null || cashReceivedUsd === undefined
    ? 0
    : parseUsdCents(cashReceivedUsd, 'cash_received_usd');
  const receivedKhr = cashReceivedKhr === null || cashReceivedKhr === undefined
    ? 0
    : parsePositiveInteger(cashReceivedKhr, 'cash_received_khr');
  if (receivedUsdCents === 0 && receivedKhr === 0) {
    throw httpError('At least one received cash amount is required.');
  }

  const requiredKhrHundredths = pricingCurrency === 'khr'
    ? parsedTotalKhr * 100
    : totalUsdCents * rate;
  const receivedKhrHundredths = (receivedUsdCents * rate) + (receivedKhr * 100);
  if (receivedKhrHundredths < requiredKhrHundredths) {
    throw httpError('Combined cash received must be greater than or equal to the order total.');
  }

  const changeKhrHundredths = receivedKhrHundredths - requiredKhrHundredths;
  const changeUsdCents = Math.floor((changeKhrHundredths + (rate / 2)) / rate);
  return {
    cashReceivedUsd: receivedUsdCents ? centsToUsd(receivedUsdCents) : null,
    cashReceivedKhr: receivedKhr || null,
    changeCurrency: null,
    changeDueUsd: centsToUsd(changeUsdCents),
    changeDueKhr: Math.floor(changeKhrHundredths / 100),
  };
}

export async function confirmCashPayment(orderId, actor, payment) {
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
      throw httpError('Only cash orders can be confirmed with this endpoint.');
    }
    if (order.status === 'paid') {
      throw httpError('Order has already been paid.', 409);
    }
    if (order.status === 'cancelled') {
      throw httpError('Cancelled orders cannot be confirmed.', 409);
    }
    if (order.status !== 'pending_payment') {
      throw httpError('Order is not pending payment.');
    }

    const settlement = calculateMixedCashSettlement({
      totalUsd: order.total_usd,
      totalKhr: order.total_khr,
      pricingCurrency: order.pricing_currency,
      exchangeRateKhrPerUsd: order.exchange_rate_khr_per_usd,
      cashReceivedUsd: payment.cash_received_usd,
      cashReceivedKhr: payment.cash_received_khr,
    });

    order.status = 'paid';
    order.cash_received_usd = settlement.cashReceivedUsd;
    order.cash_received_khr = settlement.cashReceivedKhr;
    order.change_due_usd = settlement.changeDueUsd;
    order.change_due_khr = settlement.changeDueKhr;
    order.change_currency = settlement.changeCurrency;
    order.completed_at = new Date();
    await order.save({ transaction });
    confirmedOrderOwnerId = getOrderOwnerId(order);

    await AuditLog.create({
      actor_user_id: actorId,
      owner_id: confirmedOrderOwnerId,
      action: 'cash_payment_confirmed',
      order_id: order.id,
      details: {
        cashier_id: order.cashier_id,
        stall_id: order.stall_id,
        total_usd: Number(order.total_usd),
        pricing_currency: order.pricing_currency,
        exchange_rate_khr_per_usd: order.exchange_rate_khr_per_usd,
        cash_received_usd: settlement.cashReceivedUsd === null ? null : Number(settlement.cashReceivedUsd),
        cash_received_khr: settlement.cashReceivedKhr,
        change_currency: settlement.changeCurrency,
        change_due_usd: settlement.changeDueUsd === null ? null : Number(settlement.changeDueUsd),
        change_due_khr: settlement.changeDueKhr,
        confirmed_by_role: actorRole,
      },
    }, { transaction });

    await enqueuePaidOrderTelegramDispatch(order.id, transaction);
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
  requestPaidOrderTelegramDispatch();
  return confirmedOrder;
}
