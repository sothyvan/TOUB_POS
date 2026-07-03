import fetch from 'node-fetch';
import { TelegramTicket, Stall } from '../models/index.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Telegram API Helpers ──────────────────────────────────

/**
 * Low-level POST to Telegram Bot API.
 * Retries once on network failure (fetch failed) before throwing,
 * since Node v24's undici can drop connections intermittently.
 */
async function callTelegramApi(method, body) {
  const url = `${TELEGRAM_API_BASE}/${method}`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };

  let lastError;
  // Attempt up to 2 times — handles transient connection drops
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, options);
      const json = await response.json();

      if (!json.ok) {
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
    }
  }

  throw lastError;
}

// ── Message Formatting ────────────────────────────────────

/**
 * Formats an order into a structured kitchen ticket message string.
 * Uses HTML parse mode so we can use <b> and <i> tags.
 */
function formatOrderMessage(order) {
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

  const stallName = order.Stall?.name ?? `Stall #${order.stall_id}`;
  const cashierName = order.Cashier?.username ?? `Cashier #${order.cashier_id}`;
  const paymentLabel = order.payment_method?.toUpperCase() ?? 'N/A';
  const totalUsd = Number(order.total_usd ?? 0).toFixed(2);

  // Build item lines, each with optional modifier note indented below
  const itemLines = (order.Items ?? []).map((item) => {
    const nameLine = `• ${item.quantity}× ${item.name}`;
    const noteLine = item.notes ? `   ↳ <i>${item.notes}</i>` : null;
    return noteLine ? `${nameLine}\n${noteLine}` : nameLine;
  });

  return [
    `🍽 <b>Order #${order.id}</b> — ${stallName}`,
    `🕐 ${orderTime} · 👤 ${cashierName}`,
    '',
    itemLines.join('\n'),
    '',
    `💵 <b>$${totalUsd}</b> | ${paymentLabel}`,
  ].join('\n');
}

/**
 * Builds the edited "done" version of the ticket message.
 */
function formatDoneMessage(order) {
  const original = formatOrderMessage(order);
  // Prepend a ✅ DONE header, replace the 🍽 line
  return original.replace(
    /^🍽/,
    '✅ <b>DONE</b> —',
  );
}

// ── Telegram API Actions ──────────────────────────────────

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
  });

  return result.message_id;
}

/**
 * Edits the original kitchen ticket message to show it's completed.
 * Removes the inline keyboard button so cooks can't tap it again.
 */
export async function editMessageDone(chatId, msgId, order) {
  await callTelegramApi('editMessageText', {
    chat_id: chatId,
    message_id: msgId,
    text: formatDoneMessage(order),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [] }, // remove the button
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

// ── Main Dispatch Orchestrator ────────────────────────────

/**
 * Sends a confirmed order to the stall's Telegram kitchen group.
 * Creates a TelegramTicket row to track the dispatch lifecycle.
 *
 * IMPORTANT: This function must never throw. A Telegram outage should
 * never affect the HTTP response for a payment confirmation.
 */
export async function dispatchToTelegram(order) {
  if (!BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN is not set — skipping dispatch.');
    return;
  }

  // Read the kitchen chat ID from the stall record
  const stall = order.Stall ?? (await Stall.findByPk(order.stall_id));
  const chatId = stall?.telegram_chat_id;

  if (!chatId) {
    console.warn(`[Telegram] Stall #${order.stall_id} has no telegram_chat_id — skipping dispatch.`);
    return;
  }

  // Create a ticket row immediately so we have a record even if sending fails
  const ticket = await TelegramTicket.create({
    order_id: order.id,
    telegram_chat_id: chatId,
    status: 'pending',
  });

  try {
    const msgId = await sendOrderTicket(chatId, order);

    // Update ticket with the sent message ID and mark as sent
    ticket.telegram_msg_id = msgId;
    ticket.status = 'sent';
    ticket.sent_at = new Date();
    await ticket.save();

    console.log(`[Telegram] Order #${order.id} dispatched → chat ${chatId}, msg ${msgId}`);
  } catch (error) {
    // Mark the ticket as failed for observability, but do not rethrow
    ticket.status = 'failed';
    await ticket.save();
    console.error(`[Telegram] Failed to dispatch order #${order.id}:`, error.message);
  }
}
