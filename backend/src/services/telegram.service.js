import fetch from 'node-fetch';
import { TelegramTicket, Stall } from '../models/index.js';
import { escapeTelegramHtml } from '../utils/telegram-html.util.js';
import {
  buildWorkflowTimingEvent,
  calculateAgeMilliseconds,
  createWorkflowTimer,
  writeWorkflowTimingEvent,
} from '../utils/workflow-timing.util.js';
import { migrateTelegramChatRouting } from './telegram-chat-migration.service.js';
import { emitKitchenTicketUpdated } from './websocket.service.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DEFAULT_TELEGRAM_TIMEOUT_MS = 10000;
let cachedBotIdentity = null;

export function buildTelegramTicketDispatchTiming({
  order,
  ticket,
  outcome,
  timerSnapshot,
}) {
  const sentAge = outcome === 'sent'
    ? calculateAgeMilliseconds(
      order?.completed_at ?? order?.completedAt,
      ticket?.sent_at ?? ticket?.sentAt,
    )
    : { value: null, clockAnomaly: false };
  return buildWorkflowTimingEvent({
    workflow: 'telegram_ticket_dispatch',
    outcome,
    orderId: order?.id,
    durationMs: timerSnapshot?.duration_ms,
    timingsMs: timerSnapshot?.timings_ms,
    agesMs: sentAge.value === null ? {} : { paid_to_sent: sentAge.value },
    clockAnomaly: Boolean(timerSnapshot?.clock_anomaly || sentAge.clockAnomaly),
  });
}

// ── Telegram API Helpers ──────────────────────────────────

/**
 * Low-level POST to Telegram Bot API.
 * Retries once on network failure (fetch failed) before throwing,
 * since Node v24's undici can drop connections intermittently.
 */
async function callTelegramApi(method, body, options = {}) {
  const url = `${TELEGRAM_API_BASE}/${method}`;
  const timeoutValue = Number(process.env.TELEGRAM_API_TIMEOUT_MS);
  const timeoutMs = Number.isInteger(timeoutValue) && timeoutValue > 0
    ? timeoutValue
    : DEFAULT_TELEGRAM_TIMEOUT_MS;

  let lastError;
  // Attempt up to 2 times — handles transient connection drops
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = await response.json();

      if (!json.ok) {
        if (json.parameters?.migrate_to_chat_id) {
          if (typeof options.onChatMigration !== 'function') {
            const migrationError = new Error(
              `Telegram API error [${method}]: chat migration requires stall context.`,
            );
            migrationError.code = 'TELEGRAM_CHAT_MIGRATION_CONTEXT_REQUIRED';
            throw migrationError;
          }
          const oldChatId = String(body.chat_id);
          const newChatId = String(json.parameters.migrate_to_chat_id);
          await options.onChatMigration({ oldChatId, newChatId });

          const retryResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, chat_id: newChatId }),
            signal: controller.signal,
          });
          const retryJson = await retryResponse.json();
          if (retryJson.ok) {
            return retryJson.result;
          }
          throw new Error(`Telegram API error [${method}]: ${retryJson.description}`);
        }
        throw new Error(`Telegram API error [${method}]: ${json.description}`);
      }

      return json.result;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        console.warn(`[Telegram] ${method} attempt ${attempt} failed — retrying. Error: ${error.message}`);
        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

function createChatMigrationHandler(stallId) {
  if (!Number.isInteger(Number(stallId)) || Number(stallId) <= 0) {
    return undefined;
  }
  return ({ oldChatId, newChatId }) => migrateTelegramChatRouting({
    stallId,
    oldChatId,
    newChatId,
  });
}

// ── Message Formatting ────────────────────────────────────

/**
 * Formats an order into a structured kitchen ticket message string.
 * Uses HTML parse mode so we can use <b> and <i> tags.
 */
export function formatOrderMessage(order) {
  // Sequelize can return timestamps as camelCase (createdAt) or snake_case (created_at)
  const rawDate = order.created_at ?? order.createdAt;
  const orderTime = rawDate
    ? new Date(rawDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Phnom_Penh',
      })
    : '??:??';

  const hasStallName = order.Stall?.name !== null && order.Stall?.name !== undefined;
  const stallName = !hasStallName
    ? `Stall #${order.stall_id}`
    : escapeTelegramHtml(order.Stall.name);
  const hasCashierName = order.Cashier?.username !== null
    && order.Cashier?.username !== undefined;
  const cashierName = !hasCashierName
    ? `Cashier #${order.cashier_id}`
    : escapeTelegramHtml(order.Cashier.username);
  const paymentLabel = order.payment_method?.toUpperCase() ?? 'N/A';
  const totalLabel = order.pricing_currency === 'khr'
    ? `${Number(order.total_khr ?? 0).toLocaleString('en-US')} ៛`
    : `$${Number(order.total_usd ?? 0).toFixed(2)}`;

  // Build item lines, each with optional modifier note indented below
  const itemLines = (order.Items ?? []).map((item) => {
    const nameLine = `• ${item.quantity}× ${escapeTelegramHtml(item.name)}`;
    const noteLine = item.notes
      ? `   ↳ <i>${escapeTelegramHtml(item.notes)}</i>`
      : null;
    return noteLine ? `${nameLine}\n${noteLine}` : nameLine;
  });

  return [
    `🍽 <b>Order #${order.id}</b> — ${stallName}`,
    `🕐 ${orderTime} · 👤 ${cashierName}`,
    '',
    itemLines.join('\n'),
    '',
    `💵 <b>${totalLabel}</b> | ${paymentLabel}`,
  ].join('\n');
}

/**
 * Builds the edited "done" version of the ticket message.
 */
export function formatDoneMessage(order, completedByName) {
  const original = formatOrderMessage(order);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  const info = completedByName 
    ? `\n\n✅ <b>Completed by ${escapeTelegramHtml(completedByName)} at ${timeStr}</b>`
    : `\n\n✅ <b>Completed at ${timeStr}</b>`;

  // Prepend a ✅ DONE header, replace the 🍽 line, and append completion details
  return original.replace(
    /^🍽/,
    '✅ <b>DONE</b> —',
  ) + info;
}

// ── Telegram API Actions ──────────────────────────────────

export async function getBotIdentity() {
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  }
  if (!cachedBotIdentity) {
    cachedBotIdentity = await callTelegramApi('getMe', {});
  }
  return cachedBotIdentity;
}

/**
 * Sends an order ticket to the kitchen group chat.
 * Returns the telegram_msg_id of the sent message.
 */
async function sendOrderTicket(chatId, order) {
  const result = await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text: formatOrderMessage(order),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        {
          text: '✅ Mark as Done',
          // Encode order_id into callback_data so we can look it up on callback
          callback_data: `done:${order.id}`,
        },
      ]],
    },
  }, {
    onChatMigration: createChatMigrationHandler(order.stall_id),
  });

  return {
    msgId: result.message_id,
    chatId: result.chat?.id ? String(result.chat.id) : chatId,
  };
}

/**
 * Edits the original kitchen ticket message to show it's completed.
 * Removes the inline keyboard button so cooks can't tap it again.
 */
export async function editMessageDone(chatId, msgId, order, completedByName) {
  await callTelegramApi('editMessageText', {
    chat_id: chatId,
    message_id: msgId,
    text: formatDoneMessage(order, completedByName),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [] }, // remove the button
  }, {
    onChatMigration: createChatMigrationHandler(order.stall_id),
  });
}

/**
 * Dismisses the loading spinner on the cook's phone after they tap a button.
 * Must always be called after receiving a callback_query, even if we do nothing.
 */
export async function answerCallbackQuery(callbackQueryId, text = '') {
  await callTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

/**
 * Sends a plain text or HTML formatted notification message to a chat ID.
 */
export async function sendNotification(chatId, text, options = {}) {
  await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  }, {
    onChatMigration: createChatMigrationHandler(options.stallId),
  });
}

// ── Main Dispatch Orchestrator ────────────────────────────

/**
 * Sends a confirmed order to the stall's Telegram kitchen group.
 * Creates a TelegramTicket row to track the dispatch lifecycle.
 *
 * Telegram API failures are persisted on the returned ticket. Unexpected
 * database failures may throw to the outbox worker, never to payment confirmation.
 */
export async function dispatchToTelegram(order, options = {}) {
  const timer = createWorkflowTimer();
  const existingTicket = await TelegramTicket.findOne({
    where: { order_id: order.id },
    order: [['id', 'DESC']],
  });
  timer.mark('existing_ticket_lookup');

  if (existingTicket && !options.forceRetry) {
    console.warn(`[Telegram] Order #${order.id} already has ticket #${existingTicket.id} (${existingTicket.status}) — skipping dispatch.`);
    return existingTicket;
  }

  if (existingTicket && ['sent', 'done'].includes(existingTicket.status)) {
    console.warn(`[Telegram] Order #${order.id} ticket #${existingTicket.id} is ${existingTicket.status} — skipping retry.`);
    return existingTicket;
  }

  if (!BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN is not set — skipping dispatch.');
    return null;
  }

  // Read the kitchen chat ID from the authoritative stall record.
  const stall = await Stall.findByPk(order.stall_id);
  timer.mark('stall_lookup');
  const chatId = stall?.telegram_chat_id ?? order.Stall?.telegram_chat_id;
  const ownerId = stall?.owner_id ?? order.Stall?.owner_id;

  if (!chatId) {
    console.warn(`[Telegram] Stall #${order.stall_id} has no telegram_chat_id — skipping dispatch.`);
    return null;
  }

  // Create a ticket row immediately so we have a record even if sending fails
  const ticket = await TelegramTicket.create({
    order_id: order.id,
    telegram_chat_id: chatId,
    status: 'pending',
  });
  timer.mark('pending_ticket_insert');

  try {
    let telegramResult;
    try {
      telegramResult = await sendOrderTicket(chatId, order);
    } finally {
      timer.mark('telegram_api');
    }
    const { msgId, chatId: returnedChatId } = telegramResult;

    // A different returned ID was already migrated through the scoped service.
    if (String(returnedChatId) !== String(chatId)) {
      console.log(`[Telegram] Detected on-the-fly migration from ${chatId} to ${returnedChatId}`);
    }

    // Refresh the stall to fetch the latest chat ID in case of migration
    const freshStall = await Stall.findByPk(order.stall_id);
    timer.mark('final_stall_reload');
    const finalChatId = freshStall?.telegram_chat_id || returnedChatId;

    // Update ticket with the sent message ID, final chat ID, and mark as sent
    ticket.telegram_chat_id = finalChatId;
    ticket.telegram_msg_id = msgId;
    ticket.status = 'sent';
    ticket.sent_at = new Date();
    await ticket.save();
    timer.mark('sent_ticket_save');
    emitKitchenTicketUpdated({
      cashierId: order.cashier_id,
      ownerId,
      orderId: order.id,
      ticketId: ticket.id,
      status: ticket.status,
      completedAt: ticket.completed_at,
    });

    console.log(`[Telegram] Order #${order.id} dispatched → chat ${finalChatId}, msg ${msgId}`);
    writeWorkflowTimingEvent(
      buildTelegramTicketDispatchTiming({
        order,
        ticket,
        outcome: 'sent',
        timerSnapshot: timer.snapshot(),
      }),
    );
  } catch (error) {
    // Mark the ticket as failed for observability, but do not rethrow
    ticket.status = 'failed';
    await ticket.save();
    timer.mark('sent_ticket_save');
    emitKitchenTicketUpdated({
      cashierId: order.cashier_id,
      ownerId,
      orderId: order.id,
      ticketId: ticket.id,
      status: ticket.status,
      completedAt: ticket.completed_at,
    });
    console.error(`[Telegram] Failed to dispatch order #${order.id}:`, error.message);
    writeWorkflowTimingEvent(
      buildTelegramTicketDispatchTiming({
        order,
        ticket,
        outcome: 'failed',
        timerSnapshot: timer.snapshot(),
      }),
    );
    ticket.dispatchError = error;
  }

  return ticket;
}
