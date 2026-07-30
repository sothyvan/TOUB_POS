import { readFile } from 'node:fs/promises';

const BASELINE_SQL_URL = new URL('./202607310001-current-schema-baseline.sql', import.meta.url);

const EXPECTED_COLUMNS = {
  users: ['id', 'owner_id', 'username', 'password', 'pin', 'role', 'is_active', 'is_deleted', 'session_version', 'created_at', 'updated_at'],
  stalls: ['id', 'owner_id', 'name', 'location', 'device_token', 'telegram_chat_id', 'telegram_chat_title', 'telegram_connected_at', 'is_active', 'is_deleted', 'created_at', 'updated_at'],
  stall_devices: ['id', 'stall_id', 'name', 'token_hash', 'is_active', 'registered_by_user_id', 'last_cashier_id', 'last_seen_at', 'revoked_at', 'revoked_by_user_id', 'created_at'],
  refresh_sessions: ['id', 'user_id', 'device_id', 'token_hash', 'csrf_token_hash', 'family_id', 'session_version', 'expires_at', 'last_used_at', 'revoked_at', 'replaced_by_token_hash', 'created_at'],
  telegram_cooks: ['id', 'stall_id', 'telegram_user_id', 'display_name', 'is_active', 'created_at', 'updated_at'],
  telegram_group_connections: ['id', 'stall_id', 'created_by_user_id', 'token_hash', 'expires_at', 'consumed_at', 'connected_chat_id', 'connected_chat_title', 'connected_by_telegram_user_id', 'created_at'],
  stall_staff: ['id', 'stall_id', 'user_id'],
  categories: ['id', 'owner_id', 'name', 'tone', 'created_at', 'updated_at'],
  products: ['id', 'category_id', 'name', 'image_url', 'default_price_usd', 'default_price_khr', 'created_at', 'updated_at'],
  stall_products: ['id', 'stall_id', 'product_id', 'price_usd', 'price_khr', 'is_visible'],
  orders: ['id', 'stall_id', 'cashier_id', 'idempotency_key', 'idempotency_fingerprint', 'payment_method', 'status', 'subtotal_usd', 'total_usd', 'cash_received_usd', 'change_due_usd', 'qr_payload', 'qr_md5', 'payment_reference', 'payment_expires_at', 'created_at', 'updated_at', 'completed_at'],
  order_items: ['id', 'order_id', 'product_id', 'name', 'price_usd', 'price_khr', 'line_total_usd', 'line_total_khr', 'quantity', 'notes'],
  audit_logs: ['id', 'actor_user_id', 'action', 'order_id', 'details', 'created_at'],
  telegram_tickets: ['id', 'order_id', 'telegram_msg_id', 'telegram_chat_id', 'status', 'sent_at', 'completed_at', 'completed_by_telegram_user_id', 'completed_by_name'],
  telegram_dispatch_jobs: ['id', 'order_id', 'status', 'attempt_count', 'next_attempt_at', 'last_attempt_at', 'locked_at', 'locked_by', 'last_error', 'created_at', 'updated_at'],
};

const DROP_ORDER = [
  'telegram_dispatch_jobs',
  'telegram_tickets',
  'audit_logs',
  'order_items',
  'orders',
  'stall_products',
  'products',
  'categories',
  'stall_staff',
  'telegram_group_connections',
  'telegram_cooks',
  'refresh_sessions',
  'stall_devices',
  'stalls',
  'users',
];

function normalizeTableName(table) {
  return typeof table === 'string' ? table : table.tableName;
}

function splitSqlStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function validateExistingBaseline(queryInterface) {
  const tables = new Set(
    (await queryInterface.showAllTables()).map(normalizeTableName),
  );
  const missingTables = Object.keys(EXPECTED_COLUMNS).filter((table) => !tables.has(table));
  if (missingTables.length > 0) {
    throw new Error(
      `Existing database is older than the managed baseline. Missing tables: ${missingTables.join(', ')}.`,
    );
  }

  const missingColumns = [];
  for (const [tableName, columns] of Object.entries(EXPECTED_COLUMNS)) {
    const actualColumns = await queryInterface.describeTable(tableName);
    for (const columnName of columns) {
      if (!actualColumns[columnName]) {
        missingColumns.push(`${tableName}.${columnName}`);
      }
    }
  }

  if (missingColumns.length > 0) {
    throw new Error(
      `Existing database is older than the managed baseline. Missing columns: ${missingColumns.join(', ')}.`,
    );
  }
}

async function migrateLegacyDeviceTokens(sequelize) {
  await sequelize.query(`
    INSERT INTO stall_devices
      (stall_id, name, token_hash, is_active, created_at)
    SELECT
      id,
      LEFT(CONCAT(name, ' Legacy Terminal'), 100),
      SHA2(device_token, 256),
      TRUE,
      NOW()
    FROM stalls
    WHERE device_token IS NOT NULL
    ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash)
  `);
  await sequelize.query('UPDATE stalls SET device_token = NULL WHERE device_token IS NOT NULL');
}

export async function up({ context }) {
  const { sequelize, queryInterface } = context;
  const existingTables = (await queryInterface.showAllTables())
    .map(normalizeTableName)
    .filter((table) => table !== 'schema_migrations');

  if (existingTables.length === 0) {
    const sql = await readFile(BASELINE_SQL_URL, 'utf8');
    for (const statement of splitSqlStatements(sql)) {
      await sequelize.query(statement);
    }
  }

  await validateExistingBaseline(queryInterface);
  await migrateLegacyDeviceTokens(sequelize);
}

export async function down({ context }) {
  const { sequelize, queryInterface } = context;
  const [rows] = await sequelize.query(`
    SELECT
      (SELECT COUNT(*) FROM users)
      + (SELECT COUNT(*) FROM orders)
      + (SELECT COUNT(*) FROM products)
      + (SELECT COUNT(*) FROM stalls) AS business_rows
  `);
  if (Number(rows[0]?.business_rows || 0) > 0) {
    throw new Error(
      'The schema baseline contains business data and cannot be rolled back destructively. Restore a verified backup instead.',
    );
  }

  for (const tableName of DROP_ORDER) {
    await queryInterface.dropTable(tableName);
  }
}
