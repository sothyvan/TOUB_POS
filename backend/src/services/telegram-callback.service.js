import {
  sequelize,
  TelegramTicket,
  Order,
  OrderItem,
  Stall,
  User,
} from '../models/index.js';
import * as telegramCookRepository from '../repositories/telegram-cook.repository.js';
import { escapeTelegramHtml } from '../utils/telegram-html.util.js';
import { writeStructuredLog } from '../utils/logger.util.js';
import {
  calculateAgeMilliseconds,
  createWorkflowTimer,
  recordWorkflowTiming,
} from '../utils/workflow-timing.util.js';
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

export function formatUpgradeCompletionNotification(order, completedByName) {
  return `⚠️ <b>Order #${order.id}</b> was marked as done by <b>${escapeTelegramHtml(completedByName)}</b>.\n<i>(Note: Original message was in the old group chat before it was upgraded).</i>`;
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

  const notification = formatUpgradeCompletionNotification(order, completedByName);
  await sendNotification(
    freshStall.telegram_chat_id,
    notification,
    { stallId: freshStall.id },
  ).catch((notifyError) => {
    console.error('[Telegram] Failed to send upgrade notification message:', notifyError.message);
  });
}

function findTicketForUpdate(ticket, order, chatId, messageId, transaction) {
  return TelegramTicket.findOne({
    where: {
      id: ticket.id,
      order_id: order.id,
      telegram_chat_id: String(chatId),
      telegram_msg_id: String(messageId),
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export function completeTelegramTicketAtomically(
  ticket,
  order,
  cook,
  chatId,
  messageId,
  dependencyOverrides = {},
) {
  const dependencies = {
    runInTransaction: (work) => sequelize.transaction(work),
    findTicketForUpdate,
    completedAt: () => new Date(),
    ...dependencyOverrides,
  };

  return dependencies.runInTransaction(async (transaction) => {
    const currentTicket = await dependencies.findTicketForUpdate(
      ticket,
      order,
      chatId,
      messageId,
      transaction,
    );
    if (!currentTicket) {
      return { outcome: 'missing' };
    }
    if (currentTicket.status === 'done') {
      return { outcome: 'already_done', ticket: currentTicket };
    }
    if (currentTicket.status !== 'sent') {
      return { outcome: 'not_ready', ticket: currentTicket };
    }

    currentTicket.status = 'done';
    currentTicket.completed_at = dependencies.completedAt();
    currentTicket.completed_by_telegram_user_id = String(cook.telegram_user_id);
    currentTicket.completed_by_name = cook.display_name;
    await currentTicket.save({ transaction });

    return { outcome: 'completed', ticket: currentTicket };
  });
}

export async function markTicketDone(
  ticket,
  order,
  cook,
  callbackQueryId,
  chatId,
  messageId,
  dependencyOverrides = {},
) {
  const dependencies = {
    completeAtomically: completeTelegramTicketAtomically,
    atomicDependencies: {},
    editDone: editMessageDone,
    handleEditFailure,
    emitUpdate: emitKitchenTicketUpdated,
    answerQuery: answerCallbackQuery,
    logError: (details) => writeStructuredLog(
      'error',
      'telegram_ticket_edit_failed_after_completion',
      details,
    ),
    logInfo: (details) => writeStructuredLog('info', 'telegram_ticket_completed', details),
    recordTiming: (details) => recordWorkflowTiming(details),
    now: undefined,
    ...dependencyOverrides,
  };
  const timer = dependencies.workflowTimer || createWorkflowTimer(
    dependencies.now ? { now: dependencies.now } : undefined,
  );
  const completion = await dependencies.completeAtomically(
    ticket,
    order,
    cook,
    chatId,
    messageId,
    dependencies.atomicDependencies,
  );
  timer.mark('atomic_completion');
  if (completion.outcome !== 'completed') {
    return completion;
  }
  const completedTicket = completion.ticket;

  let telegramUpdate = 'updated';
  try {
    await dependencies.editDone(chatId, messageId, order, cook.display_name);
  } catch (error) {
    try {
      await dependencies.handleEditFailure(error, order, cook.display_name);
      telegramUpdate = 'notified';
    } catch (notificationError) {
      telegramUpdate = 'failed';
      dependencies.logError({
        order_id: order.id,
        ticket_id: completedTicket.id,
        error: notificationError,
      });
    }
  }
  timer.mark('telegram_edit');

  dependencies.emitUpdate({
    cashierId: order.cashier_id,
    ownerId: order.Stall?.owner_id,
    orderId: order.id,
    ticketId: completedTicket.id,
    status: completedTicket.status,
    completedAt: completedTicket.completed_at,
  });
  timer.mark('websocket_emit');

  const answerText = telegramUpdate === 'failed'
    ? '✅ Order recorded as done, but the Telegram ticket could not be updated.'
    : '✅ Order marked as done!';
  await dependencies.answerQuery(callbackQueryId, answerText).catch(() => {});
  timer.mark('callback_answer');
  const completionAge = calculateAgeMilliseconds(
    completedTicket.sent_at ?? ticket.sent_at,
    completedTicket.completed_at,
  );
  const timerSnapshot = timer.snapshot();
  dependencies.recordTiming({
    workflow: 'telegram_done',
    outcome: 'completed',
    requestId: dependencies.requestId,
    orderId: order.id,
    durationMs: timerSnapshot.duration_ms,
    timingsMs: timerSnapshot.timings_ms,
    agesMs: completionAge.value === null
      ? {}
      : { ticket_sent_to_done: completionAge.value },
    clockAnomaly: Boolean(timerSnapshot.clock_anomaly || completionAge.clockAnomaly),
    telegramUpdate,
  });
  dependencies.logInfo({
    order_id: order.id,
    ticket_id: completedTicket.id,
    telegram_update: telegramUpdate,
  });
  return { ...completion, telegramUpdate };
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
  const workflowTimer = createWorkflowTimer();
  try {
    if (!chatId || !messageId || !telegramUserId) {
      await safeAnswer(callbackQueryId, 'Invalid Telegram callback identity.');
      return;
    }

    const ticket = await dependencies.findTicket(orderId, chatId, messageId);
    workflowTimer.mark('ticket_lookup');
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
    workflowTimer.mark('order_lookup');
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
    workflowTimer.mark('cook_access_check');
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

    const completion = await dependencies.completeTicket(
      ticket,
      order,
      cook,
      callbackQueryId,
      chatId,
      messageId,
      { requestId: dependencies.requestId, workflowTimer },
    );
    if (completion?.outcome === 'already_done') {
      await safeAnswer(callbackQueryId, 'Already marked as done!');
    } else if (completion?.outcome === 'not_ready') {
      await safeAnswer(callbackQueryId, 'This kitchen ticket is not ready to complete.');
    } else if (completion?.outcome === 'missing') {
      await safeAnswer(callbackQueryId, 'Ticket not found.');
    }
  } catch (error) {
    console.error(`[Telegram] Error handling done callback for order #${orderId}:`, error.message);
    await safeAnswer(callbackQueryId, 'Something went wrong.');
  }
}
