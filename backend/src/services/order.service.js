import { sequelize, Order, OrderItem, Product, StallStaff, TelegramTicket } from '../models/index.js';

/**
 * Creates a new order along with its order items inside a transaction.
 */
export async function createOrder(cashierId, items, paymentMethod) {
  // 1. Resolve stall assigned to this cashier
  const stallStaff = await StallStaff.findOne({ where: { user_id: cashierId } });
  if (!stallStaff) {
    throw new Error('Cashier is not assigned to any stall.');
  }
  const stallId = stallStaff.stall_id;

  const transaction = await sequelize.transaction();

  try {
    let totalUsd = 0;
    const orderItemsToCreate = [];

    // 2. Fetch and snapshot products
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction });
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found.`);
      }

      const qty = item.quantity || 1;
      const subtotalUsd = parseFloat((product.price_usd * qty).toFixed(2));
      const subtotalKhr = product.price_khr * qty;

      totalUsd += subtotalUsd;

      orderItemsToCreate.push({
        product_id: product.id,
        name: product.name,
        price_usd: product.price_usd,
        price_khr: product.price_khr,
        subtotal_usd: subtotalUsd,
        subtotal_khr: subtotalKhr,
        quantity: qty,
        notes: item.notes || null,
      });
    }

    totalUsd = parseFloat(totalUsd.toFixed(2));
    const normalizedPaymentMethod = (paymentMethod || 'cash').toLowerCase();

    // 3. Insert order
    const order = await Order.create({
      stall_id: stallId,
      cashier_id: cashierId,
      payment_method: normalizedPaymentMethod,
      status: 'pending',
      total_usd: totalUsd,
    }, { transaction });

    // 4. Insert order items
    for (const orderItem of orderItemsToCreate) {
      await OrderItem.create({
        order_id: order.id,
        ...orderItem,
      }, { transaction });
    }

    // 5. Generate KHQR payload if needed
    let qrPayload = null;
    if (normalizedPaymentMethod === 'khqr') {
      qrPayload = `MOCK_KHQR_ORDER_${order.id}_AMOUNT_${totalUsd}`;
      order.qr_payload = qrPayload;
      await order.save({ transaction });
    }

    await transaction.commit();

    return {
      orderId: order.id,
      qrPayload,
      totalUsd,
      status: order.status,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Fetch all orders, including items.
 */
export async function getAllOrders() {
  return Order.findAll({
    include: [
      {
        model: OrderItem,
        as: 'Items',
      },
      {
        model: TelegramTicket,
        as: 'TelegramTickets',
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

/**
 * Fetch all orders created by a specific cashier, including items.
 */
export async function getOrdersByUser(cashierId) {
  return Order.findAll({
    where: { cashier_id: cashierId },
    include: [
      {
        model: OrderItem,
        as: 'Items',
      },
      {
        model: TelegramTicket,
        as: 'TelegramTickets',
      },
    ],
    order: [['created_at', 'DESC']],
  });
}
