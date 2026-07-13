/**
 * Migration: add-orders-performance-indexes
 *
 * Adds three missing indexes on the `orders` table that are hit on
 * every list query but were never defined in the original schema:
 *
 *   idx_orders_stall_created   — Owner/Manager order lists filter by stall_id
 *                                and sort by created_at DESC.
 *   idx_orders_cashier_created — Cashier order lists filter by cashier_id
 *                                and sort by created_at DESC.
 *   idx_orders_status          — Status filters (pending_payment, paid, etc.)
 *                                used by operations watch, background checker,
 *                                and report queries.
 *
 * This script is idempotent: it checks INFORMATION_SCHEMA before
 * creating each index, so repeated runs are safe.
 *
 * Run:
 *   node src/scripts/migrations/add-orders-performance-indexes.js
 */

import 'dotenv/config';
import sequelize from '../../config/db.js';

const INDEXES_TO_ADD = [
  {
    name: 'idx_orders_stall_created',
    table: 'orders',
    // Composite: stall filter + date sort used together on every Owner/Manager list
    columns: ['stall_id', 'created_at'],
    unique: false,
  },
  {
    name: 'idx_orders_cashier_created',
    table: 'orders',
    // Composite: cashier filter + date sort used on every cashier My Orders list
    columns: ['cashier_id', 'created_at'],
    unique: false,
  },
  {
    name: 'idx_orders_status',
    table: 'orders',
    // Status filter used by operations watch, background checker, and reports
    columns: ['status'],
    unique: false,
  },
];

/**
 * Returns true when a named index already exists on a table.
 */
async function indexExists(indexName, tableName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND INDEX_NAME  = :indexName`,
    { replacements: { tableName, indexName } }
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

async function runMigration() {
  await sequelize.authenticate();
  console.log('[migration] Connected to database.');

  for (const idx of INDEXES_TO_ADD) {
    const exists = await indexExists(idx.name, idx.table);

    if (exists) {
      console.log(`[migration] Index "${idx.name}" already exists — skipping.`);
      continue;
    }

    const columnList = idx.columns.join(', ');
    const indexType = idx.unique ? 'UNIQUE INDEX' : 'INDEX';

    await sequelize.query(
      `ALTER TABLE \`${idx.table}\` ADD ${indexType} \`${idx.name}\` (${columnList})`
    );

    console.log(`[migration] Created index "${idx.name}" on \`${idx.table}\` (${columnList}).`);
  }

  console.log('[migration] Done.');
  await sequelize.close();
}

runMigration().catch((err) => {
  console.error('[migration] Failed:', err);
  process.exit(1);
});
