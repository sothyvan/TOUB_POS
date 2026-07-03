import { TelegramTicket, Order, OrderItem, Stall, User } from '../models/index.js';
import {
  editMessageDone,
  answerCallbackQuery,
} from '../services/telegram.service.js';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Validates that the incoming request is genuinely from Telegram
 * by checking the secret token header we set when registering the webhook.
 */
function isValidTelegramRequest(req) {
  // If no secret is configured, skip validation (dev convenience)
  if (!WEBHOOK_SECRET) return true;
  return req.headers['x-telegram-bot-api-secret-token'] === WEBHOOK_SECRET;
}

/**
 * Handles all incoming updates from Telegram.
 * Currently only processes callback_query (when cook taps "Mark as Done").
 *
 * POST /api/telegram/callback
 */
export async function handleCallback(req, res) {
  // Always respond 200 immediately — Telegram retries on non-200 responses
  res.sendStatus(200);

  if (!isValidTelegramRequest(req)) {
    console.warn('[Telegram] Rejected callback: invalid secret token.');
    return;
  }

  const update = req.body;

  // We only handle inline button presses (callback_query), ignore other updates
  if (!update.callback_query) {
    return;
  }

  const { id: callbackQueryId, data: callbackData, message } = update.callback_query;
  const chatId = message?.chat?.id;
  const msgId = message?.message_id;

  // Parse "done:<order_id>" from the button's callback_data
  const doneMatch = String(callbackData ?? '').match(/^done:(\d+)$/);
  if (!doneMatch) {
    await answerCallbackQuery(callbackQueryId, 'Unknown action.').catch(() => {});
    return;
  }

  const orderId = parseInt(doneMatch[1], 10);

  try {
    // Find the matching TelegramTicket by chat + message ID pair
    const ticket = await TelegramTicket.findOne({
      where: { telegram_chat_id: String(chatId), telegram_msg_id: String(msgId) },
    });

    if (!ticket) {
      await answerCallbackQuery(callbackQueryId, 'Ticket not found.').catch(() => {});
      return;
    }

    // Idempotency: if already done, just dismiss the spinner
    if (ticket.status === 'done') {
      await answerCallbackQuery(callbackQueryId, 'Already marked as done!').catch(() => {});
      return;
    }

    // Fetch the full order to rebuild the formatted "done" message
    const order = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, as: 'Items' },
        { model: Stall, attributes: ['id', 'name'] },
        { model: User, as: 'Cashier', attributes: ['id', 'username'] },
      ],
    });

    if (!order) {
      await answerCallbackQuery(callbackQueryId, 'Order not found.').catch(() => {});
      return;
    }

    // Edit the Telegram message to show the ✅ DONE state
    await editMessageDone(chatId, msgId, order);

    // Persist the done state in the database
    ticket.status = 'done';
    ticket.completed_at = new Date();
    await ticket.save();

    // Dismiss the loading spinner on the cook's phone with a success message
    await answerCallbackQuery(callbackQueryId, '✅ Order marked as done!').catch(() => {});

    console.log(`[Telegram] Order #${orderId} marked as done by cook.`);
  } catch (error) {
    console.error(`[Telegram] Error handling done callback for order #${orderId}:`, error.message);
    // Attempt to dismiss the spinner even on error so it doesn't hang on the cook's phone
    await answerCallbackQuery(callbackQueryId, 'Something went wrong.').catch(() => {});
  }
}
