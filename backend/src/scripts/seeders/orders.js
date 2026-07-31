import { faker } from '@faker-js/faker';
import sequelize from '../../config/db.js';
import { Order, OrderItem, AuditLog, TelegramTicket, Product, ProductStall, StallStaff } from '../../models/index.js';
import { SEED_MARKER, ORDER_COUNT } from './data.js';
import { roundUsd, randomRecentDate } from './helpers.js';

export async function hasSeededOrders() {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM audit_logs WHERE JSON_UNQUOTE(JSON_EXTRACT(details, '$.seeded_by')) = ?",
    { replacements: [SEED_MARKER] },
  );

  return Number(rows?.[0]?.count || 0) > 0;
}

export function createOrderWithItems({ cashier, stall, stallProducts }) {
  const createdAt = randomRecentDate();
  const paymentMethod = faker.helpers.arrayElement(['cash', 'cash', 'cash', 'khqr']);
  const isPaid = faker.datatype.boolean({ probability: 0.82 });
  const itemCount = faker.number.int({ min: 1, max: 4 });
  const selectedStallProducts = faker.helpers.arrayElements(stallProducts, itemCount);
  let subtotalUsd = 0;
  let subtotalKhr = 0;

  const orderItems = selectedStallProducts.map((stallProduct) => {
    const product = stallProduct.Product;
    const quantity = faker.number.int({ min: 1, max: 3 });
    const priceUsd = Number(stallProduct.price_usd);
    const priceKhr = Number(stallProduct.price_khr);
    const lineTotalUsd = roundUsd(priceUsd * quantity);
    const lineTotalKhr = priceKhr * quantity;

    subtotalUsd = roundUsd(subtotalUsd + lineTotalUsd);
    subtotalKhr += lineTotalKhr;

    return {
      product_id: product.id,
      name: product.name,
      price_usd: priceUsd,
      price_khr: priceKhr,
      line_total_usd: lineTotalUsd,
      line_total_khr: lineTotalKhr,
      quantity,
      notes: faker.datatype.boolean({ probability: 0.28 })
        ? faker.helpers.arrayElement(['no ice', 'extra spicy', 'less sugar', 'no peanuts', 'takeaway'])
        : null,
    };
  });

  return sequelize.transaction(async (transaction) => {
    const cashReceivedUsd = isPaid && paymentMethod === 'cash'
      ? roundUsd(subtotalUsd + faker.helpers.arrayElement([0, 0.25, 0.5, 1, 5]))
      : null;

    const order = await Order.create({
      stall_id: stall.id,
      cashier_id: cashier.id,
      payment_method: paymentMethod,
      status: isPaid ? 'paid' : 'pending_payment',
      subtotal_usd: subtotalUsd,
      total_usd: subtotalUsd,
      subtotal_khr: subtotalKhr,
      total_khr: subtotalKhr,
      pricing_currency: 'usd',
      exchange_rate_khr_per_usd: 4100,
      cash_received_usd: cashReceivedUsd,
      change_due_usd: cashReceivedUsd === null ? null : roundUsd(cashReceivedUsd - subtotalUsd),
      change_currency: cashReceivedUsd === null ? null : 'usd',
      qr_payload: paymentMethod === 'khqr' ? `DEMO_KHQR_${faker.string.alphanumeric(16).toUpperCase()}` : null,
      completed_at: isPaid ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    }, { transaction });

    for (const item of orderItems) {
      await OrderItem.create({
        order_id: order.id,
        ...item,
      }, { transaction });
    }

    await AuditLog.create({
      actor_user_id: cashier.id,
      action: 'order_created',
      order_id: order.id,
      details: {
        seeded_by: SEED_MARKER,
        payment_method: paymentMethod,
        stall_id: stall.id,
        item_count: orderItems.length,
        subtotal_usd: subtotalUsd,
        total_usd: subtotalUsd,
        total_khr: subtotalKhr,
      },
      created_at: createdAt,
    }, { transaction });

    if (isPaid && paymentMethod === 'cash') {
      await AuditLog.create({
        actor_user_id: cashier.id,
        action: 'cash_payment_confirmed',
        order_id: order.id,
        details: {
          seeded_by: SEED_MARKER,
          cashier_id: cashier.id,
          stall_id: stall.id,
          total_usd: subtotalUsd,
          cash_received_usd: cashReceivedUsd,
          change_due_usd: roundUsd(cashReceivedUsd - subtotalUsd),
          confirmed_by_role: 'cashier',
        },
        created_at: createdAt,
      }, { transaction });
    }

    // Seed Telegram tickets matching the ERD for completeness
    if (isPaid) {
      const sentAt = new Date(createdAt.getTime() + faker.number.int({ min: 1000, max: 5000 }));
      const completedAt = new Date(sentAt.getTime() + faker.number.int({ min: 10000, max: 300000 }));
      await TelegramTicket.create({
        order_id: order.id,
        telegram_msg_id: faker.number.int({ min: 100000, max: 999999 }),
        telegram_chat_id: stall.telegram_chat_id || (faker.number.int({ min: 100000, max: 999999 }) * -1),
        status: 'done',
        sent_at: sentAt,
        completed_at: completedAt,
      }, { transaction });
    } else if (paymentMethod === 'khqr') {
      const ticketStatus = faker.helpers.arrayElement(['pending', 'failed']);
      await TelegramTicket.create({
        order_id: order.id,
        telegram_msg_id: ticketStatus === 'failed' ? null : faker.number.int({ min: 100000, max: 999999 }),
        telegram_chat_id: stall.telegram_chat_id || (faker.number.int({ min: 100000, max: 999999 }) * -1),
        status: ticketStatus,
        sent_at: ticketStatus === 'failed' ? null : randomRecentDate(),
        completed_at: null,
      }, { transaction });
    }
  });
}

export async function seedOrders(cashiers, stallsByName) {
  if (await hasSeededOrders()) {
    console.log('[seed] Demo order history already exists; skipping order generation.');
    return;
  }

  const assignments = await StallStaff.findAll();
  const cashiersById = new Map(cashiers.map((cashier) => [cashier.id, cashier]));
  const stallsById = new Map([...stallsByName.values()].map((stall) => [stall.id, stall]));

  for (let index = 0; index < ORDER_COUNT; index += 1) {
    const assignment = faker.helpers.arrayElement(assignments);
    const cashier = cashiersById.get(assignment.user_id);
    const stall = stallsById.get(assignment.stall_id);

    if (!cashier || !stall) {
      continue;
    }

    const stallProducts = await ProductStall.findAll({
      where: {
        stall_id: stall.id,
        is_visible: true,
      },
      include: [Product],
    });

    if (stallProducts.length === 0) {
      continue;
    }

    await createOrderWithItems({ cashier, stall, stallProducts });
  }

  console.log(`[seed] Created ${ORDER_COUNT} demo orders.`);
}
