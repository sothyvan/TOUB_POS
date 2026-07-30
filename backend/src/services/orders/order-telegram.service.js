import { Order, TelegramTicket } from '../../models/index.js';
import { httpError } from '../../utils/http-error.util.js';
import { dispatchToTelegram } from '../telegram.service.js';
import {
  buildOrderAccessInclude,
  canAccessOrder,
  getOrderById,
  parsePositiveInteger,
} from './order-access.js';

export function dispatchPaidOrderToTelegram(order, context) {
  dispatchToTelegram(order).catch((error) => {
    console.error(`[Telegram] Unexpected dispatch error after ${context}:`, error);
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

  await dispatchToTelegram(fullOrder, { forceRetry: true });
  return getOrderById(parsedOrderId);
}
