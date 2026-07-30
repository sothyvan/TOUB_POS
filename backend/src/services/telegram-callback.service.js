import { TelegramTicket, Order, OrderItem, Stall, User } from '../models/index.js';
import * as telegramCookRepository from '../repositories/telegram-cook.repository.js';
import {
  editMessageDone,
  answerCallbackQuery,
  sendNotification,
} from './telegram.service.js';
import { emitKitchenTicketUpdated } from './websocket.service.js';

function findTicket(orderId, chatId, messageId) {
  return TelegramTicket.findOne({
    where: {
      order_id: orderId,
      telegram_chat_id: String(chatId),
      telegram_msg_id: String(messageId),
    },
  });
}

function findOrder(orderId) {
  return Order.findByPk(orderId, {
    include: [
      { model: OrderItem, as: 'Items' },
      { model: Stall, attributes: ['id', 'name', 'owner_id', 'telegram_chat_id'] },
      { model: User, as: 'Cashier', attributes: ['id', 'username'] },
    ],
  });
}

async function handleEditFailure(error, order, completedByName) {
  const message = String(error.message || '');
  if (!message.includes('CHAT_WRITE_FORBIDDEN') && !message.includes('group chat was upgraded')) {
    throw error;
  }

  console.warn('[Telegram] Edit failed due to group upgrade. Notifying the new supergroup chat...');
  const freshStall = await Stall.findByPk(order.stall_id);
  if (!freshStall?.telegram_chat_id) {
    return;
  }

  const notification = `⚠️ <b>Order #${order.id}</b> was marked as done by <b>${completedByName}</b>.\n<i>(Note: Original message was in the old group chat before it was upgraded).</i>`;
  await sendNotification(freshStall.telegram_chat_id, notification).catch((notifyError) => {
    console.error('[Telegram] Failed to send upgrade notification message:', notifyError.message);
  });
}

async function markTicketDone(ticket, order, cook, callbackQueryId, chatId, messageId) {
  try {
    await editMessageDone(chatId, messageId, order, cook.display_name);
  } catch (error) {
    await handleEditFailure(error, order, cook.display_name);
  }

  ticket.status = 'done';
  ticket.completed_at = new Date();
  ticket.completed_by_telegram_user_id = String(cook.telegram_user_id);
  ticket.completed_by_name = cook.display_name;
  await ticket.save();

  emitKitchenTicketUpdated({
    cashierId: order.cashier_id,
    ownerId: order.Stall?.owner_id,
    orderId: order.id,
    ticketId: ticket.id,
    status: ticket.status,
    completedAt: ticket.completed_at,
  });

  await answerCallbackQuery(callbackQueryId, '✅ Order marked as done!').catch(() => {});
  console.log(`[Telegram] Order #${order.id} marked as done by cook.`);
}

export async function processTelegramCallback(update, dependencyOverrides = {}) {
  const dependencies = {
    answerCallbackQuery,
    completeTicket: markTicketDone,
    findActiveCook: telegramCookRepository.findActiveCook,
    findOrder,
    findTicket,
    ...dependencyOverrides,
  };

  const safeAnswer = (callbackQueryId, message) => (
    dependencies.answerCallbackQuery(callbackQueryId, message).catch(() => {})
  );

  if (!update.callback_query) {
    return;
  }

  const callbackQuery = update.callback_query;
  const {
    id: callbackQueryId,
    data: callbackData,
    message,
  } = callbackQuery;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;
  const telegramUserId = callbackQuery.from?.id;
  const doneMatch = String(callbackData ?? '').match(/^done:(\d+)$/);
  if (!doneMatch) {
    await safeAnswer(callbackQueryId, 'Unknown action.');
    return;
  }

  const orderId = Number.parseInt(doneMatch[1], 10);
  try {
    if (!chatId || !messageId || !telegramUserId) {
      await safeAnswer(callbackQueryId, 'Invalid Telegram callback identity.');
      return;
    }

    const ticket = await dependencies.findTicket(orderId, chatId, messageId);
    if (
      !ticket
      || Number(ticket.order_id) !== orderId
      || String(ticket.telegram_chat_id) !== String(chatId)
      || String(ticket.telegram_msg_id) !== String(messageId)
    ) {
      await safeAnswer(callbackQueryId, 'Ticket not found.');
      return;
    }

    const order = await dependencies.findOrder(orderId);
    if (!order) {
      await safeAnswer(callbackQueryId, 'Order not found.');
      return;
    }

    if (!order.Stall || String(order.Stall.telegram_chat_id) !== String(chatId)) {
      await safeAnswer(callbackQueryId, 'This ticket does not belong to this kitchen chat.');
      return;
    }

    if (order.status !== 'paid') {
      await safeAnswer(callbackQueryId, 'Only paid orders can be completed.');
      return;
    }

    const cook = await dependencies.findActiveCook(order.stall_id, telegramUserId);
    if (!cook) {
      await safeAnswer(
        callbackQueryId,
        `Not authorized for this stall. Your Telegram ID is ${telegramUserId}.`,
      );
      return;
    }

    if (ticket.status === 'done') {
      await safeAnswer(callbackQueryId, 'Already marked as done!');
      return;
    }
    if (ticket.status !== 'sent') {
      await safeAnswer(callbackQueryId, 'This kitchen ticket is not ready to complete.');
      return;
    }

    await dependencies.completeTicket(
      ticket,
      order,
      cook,
      callbackQueryId,
      chatId,
      messageId,
    );
  } catch (error) {
    console.error(`[Telegram] Error handling done callback for order #${orderId}:`, error.message);
    await safeAnswer(callbackQueryId, 'Something went wrong.');
  }
}
