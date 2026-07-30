import { Order, TelegramTicket } from '../../models/index.js';
import {
  enqueueTelegramDispatch,
  requeueTelegramDispatchJob,
} from '../../repositories/telegram-dispatch-job.repository.js';
import { httpError } from '../../utils/http-error.util.js';
import { requestTelegramDispatchRun } from '../telegram-dispatch-worker.service.js';
import {
  buildOrderAccessInclude,
  canAccessOrder,
  getOrderById,
  parsePositiveInteger,
} from './order-access.js';

export function enqueuePaidOrderTelegramDispatch(orderId, transaction) {
  return enqueueTelegramDispatch(orderId, { transaction });
}

export function requestPaidOrderTelegramDispatch() {
  requestTelegramDispatchRun();
}

export function dispatchPaidOrderToTelegram(order, context) {
  enqueueTelegramDispatch(order.id)
    .then(() => requestTelegramDispatchRun())
    .catch((error) => {
      console.error(`[Telegram] Failed to queue dispatch after ${context}:`, error.message);
    });
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
    throw httpError('Only paid orders can be dispatched to Telegram.');
  }

  const latestTicket = await TelegramTicket.findOne({
    where: { order_id: parsedOrderId },
    order: [['id', 'DESC']],
  });
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
    throw httpError('This order stall does not have a Telegram kitchen chat configured.');
  }

  const requeueResult = await requeueTelegramDispatchJob(parsedOrderId);
  if (!requeueResult.requeued) {
    const jobStatus = requeueResult.job.status;
    const message = jobStatus === 'sent'
      ? 'Telegram dispatch has already completed.'
      : 'Telegram dispatch is already queued or in progress.';
    throw httpError(message, 409);
  }
  requestTelegramDispatchRun();
  return getOrderById(parsedOrderId);
}
