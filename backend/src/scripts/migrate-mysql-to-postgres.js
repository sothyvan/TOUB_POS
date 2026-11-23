import fs from 'node:fs';
import { Sequelize, QueryTypes } from 'sequelize';

const MYSQL_CONFIG = {
  database: process.env.SOURCE_DB_NAME || 'toubpos_db',
  user: process.env.SOURCE_DB_USER || 'avnadmin',
  password: process.env.SOURCE_DB_PASSWORD,
  host: process.env.SOURCE_DB_HOST,
  port: Number(process.env.SOURCE_DB_PORT || 23500),
  caPath: process.env.SOURCE_DB_CA_PATH || 'certs/provider-ca.pem',
};

const POSTGRES_CONFIG = {
  database: process.env.TARGET_DB_NAME || 'defaultdb',
  user: process.env.TARGET_DB_USER || 'avnadmin',
  password: process.env.TARGET_DB_PASSWORD,
  host: process.env.TARGET_DB_HOST,
  port: Number(process.env.TARGET_DB_PORT || 23500),
  caPath: process.env.TARGET_DB_CA_PATH || 'certs/provider-ca.pem',
};

const TABLES_ORDER = [
  'users',
  'categories',
  'business_financial_settings',
  'stalls',
  'stall_devices',
  'refresh_sessions',
  'telegram_cooks',
  'telegram_group_connections',
  'stall_staff',
  'products',
  'stall_products',
  'orders',
  'order_items',
  'telegram_tickets',
  'telegram_dispatch_jobs',
  'audit_logs',
];

const MIGRATION_NAMES = [
  '202607310001-current-schema-baseline.js',
  '202607310002-add-orders-performance-indexes.js',
  '202607310003-add-products-lifecycle-columns.js',
  '202607310004-expand-administrative-audit-logs.js',
  '202607310005-enforce-one-stall-per-cashier.js',
  '202607310006-add-mixed-currency-settlement.js',
  '202608050001-enforce-unique-active-telegram-chat.js',
];

async function main() {
  console.log('--- Starting Migration from Aiven MySQL to Aiven PostgreSQL ---');

  const sourceCa = fs.readFileSync(MYSQL_CONFIG.caPath, 'utf8');
  const targetCa = fs.readFileSync(POSTGRES_CONFIG.caPath, 'utf8');

  const sourceSequelize = new Sequelize(
    MYSQL_CONFIG.database,
    MYSQL_CONFIG.user,
    MYSQL_CONFIG.password,
    {
      host: MYSQL_CONFIG.host,
      port: MYSQL_CONFIG.port,
      dialect: 'mysql',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: true,
          ca: sourceCa,
        },
      },
    },
  );

  const targetSequelize = new Sequelize(
    POSTGRES_CONFIG.database,
    POSTGRES_CONFIG.user,
    POSTGRES_CONFIG.password,
    {
      host: POSTGRES_CONFIG.host,
      port: POSTGRES_CONFIG.port,
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: true,
          ca: targetCa,
        },
      },
    },
  );

  console.log('1. Connecting to MySQL and PostgreSQL...');
  await sourceSequelize.authenticate();
  console.log('   Connected to Source MySQL successfully.');
  await targetSequelize.authenticate();
  console.log('   Connected to Target PostgreSQL successfully.');

  console.log('2. Synchronizing models to create target schema in PostgreSQL...');
  // Point process.env so models bind to target PostgreSQL if imported
  process.env.DB_HOST = POSTGRES_CONFIG.host;
  process.env.DB_PORT = String(POSTGRES_CONFIG.port);
  process.env.DB_USER = POSTGRES_CONFIG.user;
  process.env.DB_PASSWORD = POSTGRES_CONFIG.password;
  process.env.DB_NAME = POSTGRES_CONFIG.database;
  process.env.DB_DIALECT = 'postgres';
  process.env.DB_SSL_CA_PATH = POSTGRES_CONFIG.caPath;

  const { default: modelsSequelize } = await import('../config/db.js');
  await import('../models/index.js');
  await modelsSequelize.sync({ force: true });
  console.log('   Target tables created successfully.');

  console.log('3. Applying PostgreSQL performance indexes and migrations ledger...');
  await targetSequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_stall_created ON orders (stall_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_cashier_created ON orders (cashier_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
  `);

  await targetSequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_owner_created ON audit_logs (owner_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs (request_id);
  `);

  await targetSequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY
    );
  `);

  for (const name of MIGRATION_NAMES) {
    await targetSequelize.query(
      'INSERT INTO schema_migrations (name) VALUES (:name) ON CONFLICT (name) DO NOTHING;',
      { replacements: { name } },
    );
  }
  console.log('   Indexes and schema_migrations initialized.');

  console.log('4. Copying data from MySQL to PostgreSQL...');
  await targetSequelize.query("SET session_replication_role = 'replica';");

  for (const tableName of TABLES_ORDER) {
    const rows = await sourceSequelize.query(`SELECT * FROM \`${tableName}\``, {
      type: QueryTypes.SELECT,
    });
    console.log(`   Transferring ${tableName}: ${rows.length} rows...`);

    if (rows.length === 0) {
      continue;
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      // Filter out any generated columns
      const columns = Object.keys(batch[0]).filter((col) => col !== 'active_telegram_chat_id');
      const quotedColumns = columns.map((col) => `"${col}"`).join(', ');

      const valuePlaceholders = [];
      const replacements = {};

      batch.forEach((row, rowIndex) => {
        const rowPlaceholders = [];
        columns.forEach((col, colIndex) => {
          const paramName = `p_${rowIndex}_${colIndex}`;
          let val = row[col];

          // Normalize booleans from MySQL 1/0
          if (
            ['is_active', 'is_deleted', 'is_visible'].includes(col)
            && val !== null
            && val !== undefined
          ) {
            val = Boolean(val);
          }

          // Normalize JSON fields
          if (col === 'details' && val !== null && typeof val === 'object') {
            val = JSON.stringify(val);
          }

          replacements[paramName] = val;
          rowPlaceholders.push(`:${paramName}`);
        });
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
      });

      const insertSql = `
        INSERT INTO "${tableName}" (${quotedColumns})
        VALUES ${valuePlaceholders.join(', ')}
      `;

      await targetSequelize.query(insertSql, { replacements });
    }
  }

  await targetSequelize.query("SET session_replication_role = 'origin';");
  console.log('   All data copied.');

  console.log('5. Adding generated columns and constraints...');
  await targetSequelize.query(`
    ALTER TABLE stalls
    ADD COLUMN IF NOT EXISTS active_telegram_chat_id BIGINT
    GENERATED ALWAYS AS (CASE WHEN is_deleted = false THEN telegram_chat_id ELSE NULL END) STORED;
  `);

  await targetSequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_stalls_active_telegram_chat_id
    ON stalls (active_telegram_chat_id);
  `);

  console.log('6. Resetting PostgreSQL serial sequences...');
  for (const tableName of TABLES_ORDER) {
    try {
      await targetSequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('"${tableName}"', 'id'),
          COALESCE(MAX(id), 1)
        )
        FROM "${tableName}";
      `);
    } catch {
      // Table may not have a serial 'id' column (e.g. business_financial_settings)
    }
  }
  console.log('   Sequences reset.');

  console.log('\n--- VERIFICATION: Comparing Table Counts ---');
  let allMatched = true;
  for (const tableName of TABLES_ORDER) {
    const [sourceRes] = await sourceSequelize.query(`SELECT COUNT(*) AS cnt FROM \`${tableName}\``, {
      type: QueryTypes.SELECT,
    });
    const [targetRes] = await targetSequelize.query(`SELECT COUNT(*) AS cnt FROM "${tableName}"`, {
      type: QueryTypes.SELECT,
    });
    const sourceCount = Number(sourceRes.cnt);
    const targetCount = Number(targetRes.cnt);
    const match = sourceCount === targetCount ? 'OK' : 'MISMATCH';
    if (sourceCount !== targetCount) {allMatched = false;}
    console.log(`- ${tableName.padEnd(28)} MySQL: ${String(sourceCount).padStart(6)} | Postgres: ${String(targetCount).padStart(6)} [${match}]`);
  }

  await sourceSequelize.close();
  await targetSequelize.close();
  await modelsSequelize.close();

  if (allMatched) {
    console.log('\n SUCCESS: 100% of data successfully migrated from MySQL to PostgreSQL!');
  } else {
    console.error('\n WARNING: One or more tables had row count mismatches. Please review above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
