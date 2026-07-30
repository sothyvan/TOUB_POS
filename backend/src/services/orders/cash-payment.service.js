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

    const orderTotalCents = parseUsdCents(order.total_usd, 'order total');
    const cashReceivedCents = parseUsdCents(cashReceivedUsd, 'cash_received_usd');
    if (cashReceivedCents < orderTotalCents) {
      throw httpError('Cash received must be greater than or equal to the order total.');
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
