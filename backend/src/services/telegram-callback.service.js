import { TelegramTicket, Order, OrderItem, Stall, User } from '../models/index.js';
import {
  editMessageDone,
  answerCallbackQuery,
  sendNotification,
} from './telegram.service.js';
import { emitKitchenTicketUpdated } from './websocket.service.js';

async function findTicket(orderId, chatId, messageId) {
  const orderTicket = await TelegramTicket.findOne({
    where: { order_id: orderId },
  });
  if (orderTicket) {
    return orderTicket;
  }
  return TelegramTicket.findOne({
    where: {
      telegram_chat_id: String(chatId),
      telegram_msg_id: String(messageId),
    },
  });
}

function getCompletedByName(callbackQuery) {
  const telegramUser = callbackQuery.from;
  return [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
}

async function updateTicketChatId(ticket, chatId) {
  if (String(ticket.telegram_chat_id) === String(chatId)) {
    return;
  }
  console.log(`[Telegram] Self-healing: updating ticket chat ID from ${ticket.telegram_chat_id} to ${chatId}`);
  ticket.telegram_chat_id = String(chatId);
  await ticket.save();
}

async function updateStallChatId(stall, chatId) {
  if (!stall || String(stall.telegram_chat_id) === String(chatId)) {
    return;
  }
  console.log(`[Telegram] Self-healing: updating stall #${stall.id} chat ID from ${stall.telegram_chat_id} to ${chatId}`);
  await Stall.update(
    { telegram_chat_id: String(chatId) },
    { where: { id: stall.id } },
  );
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

async function markTicketDone(ticket, order, completedByName, callbackQueryId, chatId, messageId) {
  try {
    await editMessageDone(chatId, messageId, order, completedByName);
  } catch (error) {
    await handleEditFailure(error, order, completedByName);
  }

  ticket.status = 'done';
  ticket.completed_at = new Date();
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

export async function processTelegramCallback(update) {
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
  const doneMatch = String(callbackData ?? '').match(/^done:(\d+)$/);
  if (!doneMatch) {
    await answerCallbackQuery(callbackQueryId, 'Unknown action.').catch(() => {});
    return;
  }

  const orderId = Number.parseInt(doneMatch[1], 10);
  try {
    const ticket = await findTicket(orderId, chatId, messageId);
    if (!ticket) {
      await answerCallbackQuery(callbackQueryId, 'Ticket not found.').catch(() => {});
      return;
    }

    await updateTicketChatId(ticket, chatId);
    if (ticket.status === 'done') {
      await answerCallbackQuery(callbackQueryId, 'Already marked as done!').catch(() => {});
      return;
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'Items' },
        { model: Stall, attributes: ['id', 'name', 'owner_id', 'telegram_chat_id'] },
        { model: User, as: 'Cashier', attributes: ['id', 'username'] },
      ],
    });
    if (!order) {
      await answerCallbackQuery(callbackQueryId, 'Order not found.').catch(() => {});
      return;
    }

    await updateStallChatId(order.Stall, chatId);
    await markTicketDone(
      ticket,
      order,
      getCompletedByName(callbackQuery),
      callbackQueryId,
      chatId,
      messageId,
    );
  } catch (error) {
    console.error(`[Telegram] Error handling done callback for order #${orderId}:`, error.message);
    await answerCallbackQuery(callbackQueryId, 'Something went wrong.').catch(() => {});
  }
}
