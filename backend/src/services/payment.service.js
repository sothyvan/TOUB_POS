import { sequelize, Order } from '../models/index.js';

/**
 * Validates the webhook payment confirmation, checks idempotency, and updates the order.
 */
export async function processConfirmation(orderId, amountPaid) {
  const transaction = await sequelize.transaction();

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

    // 5. Trigger Side Effects (WebSockets / Telegram)
    triggerWebSocketNotification(order.cashier_id, order.id);
    triggerTelegramKitchenTicket(order.id);

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Stubs for real-time and chat notifications
function triggerWebSocketNotification(cashierId, orderId) {
  console.log(`[WebSocket] Emitting payment_confirmed to cashier_id: ${cashierId} for order: ${orderId}`);
}

function triggerTelegramKitchenTicket(orderId) {
  console.log(`[Telegram] Sending kitchen ticket for order: ${orderId}`);
}
