import { sequelize, Order, Stall, TelegramTicket } from '../models/index.js';

/**
 * Validates the webhook payment confirmation, checks idempotency, and updates the order.
 */
export async function processConfirmation(orderId, amountPaid) {
  const transaction = await sequelize.transaction();
  let completedOrder;

  try {
    // 1. Fetch order to validate with row-level lock (FOR UPDATE)
    const order = await Order.findByPk(orderId, {
      transaction,
      lock: true,
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // 2. Idempotency Check
    if (order.status === 'completed' || order.status === 'cancelled') {
      await transaction.rollback();
      return; // Already processed
    }

    // 3. Amount Validation
    if (parseFloat(order.total_usd) !== parseFloat(amountPaid)) {
      throw new Error(`Amount mismatch. Expected ${order.total_usd}, received ${amountPaid}`);
    }

    // 4. Update status and completion timestamp
    order.status = 'completed';
    order.completed_at = new Date();
    await order.save({ transaction });

    await transaction.commit();
    completedOrder = order.get({ plain: true });

  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }

  // 5. Trigger Side Effects (WebSockets / Telegram)
  triggerWebSocketNotification(completedOrder.cashier_id, completedOrder.id);
  await triggerTelegramKitchenTicket(completedOrder.id, completedOrder.stall_id);
}

// Stubs for real-time and chat notifications
function triggerWebSocketNotification(cashierId, orderId) {
  console.log(`[WebSocket] Emitting payment_confirmed to cashier_id: ${cashierId} for order: ${orderId}`);
}

async function triggerTelegramKitchenTicket(orderId, stallId) {
  try {
    const stall = await Stall.findByPk(stallId);
    await TelegramTicket.create({
      order_id: orderId,
      telegram_chat_id: stall?.telegram_chat_id ?? null,
      status: 'pending',
    });
    console.log(`[Telegram] Queued kitchen ticket for order: ${orderId}`);
  } catch (error) {
    console.error(`[Telegram] Failed to queue kitchen ticket for order: ${orderId}`, error);
  }
}
