import {
  sequelize,
  AuditLog,
  Order,
} from '../../models/index.js';
import { httpError } from '../../utils/http-error.util.js';
import {
  checkBakongTransactionByMd5,
  getBakongCheckMode,
} from '../bakong-provider.service.js';
import {
  emitManagementOrderUpdated,
  emitPaymentConfirmed,
} from '../websocket.service.js';
import {
  buildOrderAccessInclude,
  buildPaymentConfirmedPayload,
  canAccessOrder,
  getOrderById,
  getOrderOwnerId,
  isKhqrExpired,
  normalizeOptionalText,
  parsePositiveInteger,
} from './order-access.js';
import { dispatchPaidOrderToTelegram } from './order-telegram.service.js';

function assertBakongPaidResultMatchesOrder(order, providerResult) {
  if (providerResult.amount === null || providerResult.amount === undefined) {
    throw httpError('Bakong paid response did not include an amount.');
  }

  const expectedAmount = Number(order.total_usd);
  if (Math.abs(Number(providerResult.amount) - expectedAmount) > 0.01) {
    throw httpError(
      `Bakong amount mismatch. Expected ${expectedAmount.toFixed(2)}, received ${Number(providerResult.amount).toFixed(2)}.`,
    );
  }

  const receivedCurrency = normalizeOptionalText(providerResult.currency)?.toUpperCase() || 'USD';
  if (receivedCurrency !== 'USD') {
    throw httpError('Only USD KHQR confirmations are supported in this Phase 5 flow.');
  }

  const expectedDestination = normalizeOptionalText(process.env.BAKONG_ACCOUNT_ID)?.toLowerCase();
  if (!expectedDestination) {
    throw httpError('BAKONG_ACCOUNT_ID is required for KHQR payment validation.', 503);
  }
  const receivedDestination = normalizeOptionalText(providerResult.destinationAccount)?.toLowerCase();
  if (receivedDestination && expectedDestination !== receivedDestination) {
    throw httpError('Bakong destination account does not match the configured Bakong account.');
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

async function currentOrderResult(order, paymentStatus, providerStatus, checkMode, message) {
  return {
    order: await getOrderById(order.id),
    paymentStatus,
    providerStatus,
    checkMode,
    alreadyProcessed: false,
    message,
  };
}

async function confirmKhqrOrder(order, providerResult, checkContext) {
  let confirmedOrderId;
  let alreadyProcessed = false;
  const transaction = await sequelize.transaction();

  try {
    const lockedOrder = await Order.findByPk(order.id, {
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
        throw httpError('Order is not pending payment.');
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

  return {
    confirmedOrder: await getOrderById(confirmedOrderId),
    alreadyProcessed,
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
    throw httpError('Only KHQR orders can be checked with this endpoint.');
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
    return currentOrderResult(
      order,
      'cancelled',
      'not_checked',
      checkMode,
      'Order is cancelled.',
    );
  }
  if (order.status !== 'pending_payment') {
    logKhqrStatusCheckDebug(order, checkMode);
    return currentOrderResult(
      order,
      order.status,
      'not_checked',
      checkMode,
      'Order is not pending payment.',
    );
  }
  if (isKhqrExpired(order)) {
    logKhqrStatusCheckDebug(order, checkMode);
    return currentOrderResult(
      order,
      'expired',
      'expired',
      checkMode,
      'KHQR payment request has expired.',
    );
  }
  if (!order.qr_md5) {
    logKhqrStatusCheckDebug(order, checkMode);
    throw httpError('KHQR md5 is missing for this order.');
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
    return currentOrderResult(
      order,
      'pending_payment',
      'not_found',
      checkMode,
      'Payment has not been found yet.',
    );
  }
  if (providerResult.status === 'failed') {
    return currentOrderResult(
      order,
      'pending_payment',
      'failed',
      checkMode,
      'Bakong returned a failed payment status.',
    );
  }
  if (providerResult.status === 'error') {
    return currentOrderResult(
      order,
      'pending_payment',
      'error',
      checkMode,
      providerResult.errorMessage || 'Unable to check Bakong payment status right now.',
    );
  }

  assertBakongPaidResultMatchesOrder(order, providerResult);
  const { confirmedOrder, alreadyProcessed } = await confirmKhqrOrder(
    order,
    providerResult,
    checkContext,
  );

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
      buildPaymentConfirmedPayload(confirmedOrder),
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
