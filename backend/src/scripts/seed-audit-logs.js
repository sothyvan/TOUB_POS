/* eslint-disable no-console */
/**
 * Standalone, append-only audit-log seeder.
 *
 * Inserts AUDIT_LOG_COUNT demo rows into `audit_logs`, referencing REAL existing
 * orders and users already in the database (MySQL enforces the FKs on
 * order_id and actor_user_id, so synthetic IDs are not allowed). No `npm run seed`
 * is required and no existing data is modified.
 *
 * This script is APPEND-ONLY: every run inserts another AUDIT_LOG_COUNT rows.
 * Re-running grows the table unbounded. If cleanup is ever needed, filter by the
 * seeded_by tag (matches the JSON_EXTRACT pattern in seeders/orders.js).
 */
import 'dotenv/config';
import { faker } from '@faker-js/faker';
import sequelize, { ensureDatabaseExists } from '../config/db.js';
import { migrateDatabase } from '../database/migrator.js';
import { Order, AuditLog, User } from '../models/index.js';
import { roundUsd, toKhr, randomRecentDate } from '../scripts/seeders/helpers.js';
import { SEED_MARKER } from '../scripts/seeders/data.js';

const AUDIT_LOG_COUNT = 10000;
const BATCH_SIZE = 1000;
const SEED_BASE = 20260715;

const ACTION_WEIGHTS = [
  { action: 'order_created', weight: 0.40 },
  { action: 'cash_payment_confirmed', weight: 0.35 },
  { action: 'khqr_payment_confirmed', weight: 0.25 },
];

function pickWeightedAction() {
  const roll = faker.number.float({ min: 0, max: 1, fractionDigits: 4 });
  let cumulative = 0;
  for (const entry of ACTION_WEIGHTS) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      return entry.action;
    }
  }
  return ACTION_WEIGHTS[ACTION_WEIGHTS.length - 1].action;
}

function buildCashDetails(order, cashierId) {
  const tip = faker.helpers.arrayElement([0, 0.25, 0.5, 1, 5]);
  const totalUsd = Number(order.total_usd);
  const cashReceivedUsd = roundUsd(totalUsd + tip);
  return {
    seeded_by: SEED_MARKER,
    stall_id: order.stall_id,
    cashier_id: order.cashier_id ?? cashierId,
    total_usd: totalUsd,
    cash_received_usd: cashReceivedUsd,
    change_due_usd: roundUsd(cashReceivedUsd - totalUsd),
    confirmed_by_role: 'cashier',
  };
}

function buildKhqrDetails(order) {
  return {
    seeded_by: SEED_MARKER,
    hash: faker.string.hexadecimal({ length: 64, prefix: '' }),
    amount: Number(order.total_usd),
    qr_md5: faker.string.hexadecimal({ length: 32, prefix: '' }),
    source: 'bakong_status_check',
    currency: 'USD',
    checked_by_role: 'cashier',
    payment_reference: `TOUB-${order.id}-${faker.string.alphanumeric(8).toUpperCase()}`,
  };
}

function buildOrderCreatedDetails(order, cashierId) {
  const totalUsd = Number(order.total_usd);
  return {
    seeded_by: SEED_MARKER,
    stall_id: order.stall_id,
    item_count: faker.number.int({ min: 1, max: 4 }),
    subtotal_usd: Number(order.subtotal_usd),
    total_usd: totalUsd,
    total_khr: toKhr(totalUsd),
    payment_method: order.payment_method,
    cashier_id: order.cashier_id ?? cashierId,
  };
}

/**
 * Build one audit-log row object. Falls back to order_created when the chosen
 * action's order pool is empty, guaranteeing the FK always resolves to a real row.
 */
function buildRow(cashOrders, khqrOrders, fallbackCashierIds) {
  const action = pickWeightedAction();
  let order;

  if (action === 'cash_payment_confirmed') {
    if (cashOrders.length > 0) {
      order = faker.helpers.arrayElement(cashOrders);
    }
  } else if (action === 'khqr_payment_confirmed') {
    if (khqrOrders.length > 0) {
      order = faker.helpers.arrayElement(khqrOrders);
    }
  }

  // Fallback to any order (order_created path).
  if (!order) {
    order = faker.helpers.arrayElement([...cashOrders, ...khqrOrders]);
  }

  if (!order) {
    throw new Error('[seed:audit] No orders available to reference.');
  }

  const cashierId = fallbackCashierIds.length > 0
    ? faker.helpers.arrayElement(fallbackCashierIds)
    : null;

  let details;
  let finalAction = action;
  if (action === 'cash_payment_confirmed' && cashOrders.length > 0) {
    details = buildCashDetails(order, cashierId);
  } else if (action === 'khqr_payment_confirmed' && khqrOrders.length > 0) {
    details = buildKhqrDetails(order);
  } else {
    details = buildOrderCreatedDetails(order, cashierId);
    finalAction = 'order_created';
  }

  return {
    actor_user_id: order.cashier_id ?? cashierId,
    action: finalAction,
    order_id: order.id,
    details,
    created_at: randomRecentDate(),
  };
}

async function main() {
  await ensureDatabaseExists();
  await sequelize.authenticate();
  await migrateDatabase();

  console.log('[seed:audit] Database connection established.');

  const orders = await Order.findAll({
    attributes: ['id', 'stall_id', 'cashier_id', 'subtotal_usd', 'total_usd', 'payment_method'],
    order: [['id', 'ASC']],
  });

  if (orders.length === 0) {
    console.warn('[seed:audit] No orders found. Add orders first; aborting (no data written).');
    return;
  }

  const cashOrders = orders.filter((order) => order.payment_method === 'cash');
  const khqrOrders = orders.filter((order) => order.payment_method === 'khqr');

  const cashiers = await User.findAll({
    where: { role: ['cashier', 'manager'] },
    attributes: ['id'],
  });
  const fallbackCashierIds = cashiers.map((user) => user.id);

  if (fallbackCashierIds.length === 0) {
    console.warn('[seed:audit] No cashier/manager users found; actor_user_id may be null.');
  }

  faker.seed(SEED_BASE);

  console.log(
    `[seed:audit] Seeding ${AUDIT_LOG_COUNT} rows ` +
      `(orders=${orders.length}, cash=${cashOrders.length}, khqr=${khqrOrders.length}).`,
  );

  const startedAt = Date.now();
  let inserted = 0;

  await sequelize.transaction(async (t) => {
    let batch = [];

    for (let i = 0; i < AUDIT_LOG_COUNT; i += 1) {
      batch.push(buildRow(cashOrders, khqrOrders, fallbackCashierIds));

      if (batch.length >= BATCH_SIZE || i === AUDIT_LOG_COUNT - 1) {
        await AuditLog.bulkCreate(batch, { transaction: t });
        inserted += batch.length;
        batch = [];
        console.log(`[seed:audit] Inserted ${inserted}/${AUDIT_LOG_COUNT}`);
      }
    }
  });

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(2);
  console.log(`[seed:audit] Done. Inserted ${inserted} audit logs in ${elapsedSeconds}s.`);
}

main()
  .catch((error) => {
    console.error('[seed:audit] Failed to seed audit logs:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
