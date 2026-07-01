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
    if (order.status === 'paid' || order.status === 'cancelled') {
      await transaction.rollback();
      return; // Already processed
    }

    // 3. Amount Validation
    // Use an epsilon (0.01) to handle JS floating point precision and minor exchange rate rounding.
    // We check if received is less than expected (allowing for a 1 cent margin of error).
    // This inherently allows overpayments (like tips) while protecting against underpayments.
    const expected = parseFloat(order.total_usd);
    const received = parseFloat(amountPaid);

    if (received < (expected - 0.01)) {
      throw new Error(`Amount mismatch. Expected at least ${expected}, received ${received}`);
    }

    // 4. Update status and completion timestamp
    order.status = 'paid';
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
