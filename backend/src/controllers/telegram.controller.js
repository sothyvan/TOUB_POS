import { TelegramTicket, Order, OrderItem, Stall, User } from '../models/index.js';
import {
  editMessageDone,
  answerCallbackQuery,
  sendNotification,
} from '../services/telegram.service.js';
import { emitKitchenTicketUpdated } from '../services/websocket.service.js';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Validates that the incoming request is genuinely from Telegram
 * by checking the secret token header we set when registering the webhook.
 */
function isValidTelegramRequest(req) {
  // If no secret is configured, skip validation (dev convenience)
  if (!WEBHOOK_SECRET) {
    return true;
  }
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
    // Find the matching TelegramTicket by order_id (highly robust),
    // and fallback to chat + msg ID if needed.
    let ticket = await TelegramTicket.findOne({
      where: { order_id: orderId },
    });

    if (!ticket) {
      ticket = await TelegramTicket.findOne({
        where: { telegram_chat_id: String(chatId), telegram_msg_id: String(msgId) },
      });
    }

    if (!ticket) {
      await answerCallbackQuery(callbackQueryId, 'Ticket not found.').catch(() => {});
      return;
    }

    // Self-healing: if the ticket's saved chat ID does not match the actual callback chat ID, update it
    if (String(ticket.telegram_chat_id) !== String(chatId)) {
      console.log(`[Telegram] Self-healing: updating ticket chat ID from ${ticket.telegram_chat_id} to ${chatId}`);
      ticket.telegram_chat_id = String(chatId);
      await ticket.save();
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
        { model: Stall, attributes: ['id', 'name', 'owner_id', 'telegram_chat_id'] },
        { model: User, as: 'Cashier', attributes: ['id', 'username'] },
      ],
    });

    if (!order) {
      await answerCallbackQuery(callbackQueryId, 'Order not found.').catch(() => {});
      return;
    }

    // Self-healing: if the stall's saved chat ID does not match the actual callback chat ID, update it
    const stall = order.Stall;
    if (stall && String(stall.telegram_chat_id) !== String(chatId)) {
      console.log(`[Telegram] Self-healing: updating stall #${stall.id} chat ID from ${stall.telegram_chat_id} to ${chatId}`);
      await Stall.update(
        { telegram_chat_id: String(chatId) },
        { where: { id: stall.id } }
      );
    }

    // Extract the name of the telegram user who clicked the button
    const tgUser = update.callback_query.from;
    const completedByName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');

    try {
      // Edit the Telegram message to show the ✅ DONE state with completion info
      await editMessageDone(chatId, msgId, order, completedByName);
    } catch (editError) {
      const errorMsg = String(editError.message || '');
      if (errorMsg.includes('CHAT_WRITE_FORBIDDEN') || errorMsg.includes('group chat was upgraded')) {
        console.warn(`[Telegram] Edit failed due to group upgrade. Notifying the new supergroup chat...`);
        
        // Find the fresh stall to get the new migrated chat ID
        const freshStall = await Stall.findByPk(order.stall_id);
        if (freshStall && freshStall.telegram_chat_id) {
          const notifyText = `⚠️ <b>Order #${orderId}</b> was marked as done by <b>${completedByName}</b>.\n<i>(Note: Original message was in the old group chat before it was upgraded).</i>`;
          await sendNotification(freshStall.telegram_chat_id, notifyText).catch((err) => {
            console.error('[Telegram] Failed to send upgrade notification message:', err.message);
          });
        }
      } else {
        // Rethrow other errors
        throw editError;
      }
    }

    // Persist the done state in the database
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

    // Dismiss the loading spinner on the cook's phone with a success message
    await answerCallbackQuery(callbackQueryId, '✅ Order marked as done!').catch(() => {});

    console.log(`[Telegram] Order #${orderId} marked as done by cook.`);
  } catch (error) {
    console.error(`[Telegram] Error handling done callback for order #${orderId}:`, error.message);
    // Attempt to dismiss the spinner even on error so it doesn't hang on the cook's phone
    await answerCallbackQuery(callbackQueryId, 'Something went wrong.').catch(() => {});
  }
}
