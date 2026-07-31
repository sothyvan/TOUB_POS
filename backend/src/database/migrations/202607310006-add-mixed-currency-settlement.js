import { DataTypes } from 'sequelize';

const ORDER_COLUMNS = {
  subtotal_khr: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  total_khr: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  pricing_currency: { type: DataTypes.ENUM('usd', 'khr'), allowNull: false, defaultValue: 'usd' },
  exchange_rate_khr_per_usd: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4100 },
  cash_received_khr: { type: DataTypes.INTEGER, allowNull: true },
  change_due_khr: { type: DataTypes.INTEGER, allowNull: true },
  change_currency: { type: DataTypes.ENUM('usd', 'khr'), allowNull: true },
};

export async function up({ context }) {
  const { queryInterface, sequelize } = context;
  const tables = new Set((await queryInterface.showAllTables()).map((table) => (
    typeof table === 'string' ? table : table.tableName
  )));
  if (!tables.has('business_financial_settings')) {
    await queryInterface.createTable('business_financial_settings', {
      owner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      exchange_rate_khr_per_usd: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4100 },
      updated_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
  }

  const orderTable = await queryInterface.describeTable('orders');
  for (const [name, definition] of Object.entries(ORDER_COLUMNS)) {
    if (!orderTable[name]) {
      await queryInterface.addColumn('orders', name, definition);
    }
  }

  await sequelize.query(`
    INSERT INTO business_financial_settings (owner_id, exchange_rate_khr_per_usd, created_at, updated_at)
    SELECT id, 4100, NOW(), NOW() FROM users WHERE role = 'owner'
    ON DUPLICATE KEY UPDATE owner_id = VALUES(owner_id)
  `);
  await sequelize.query(`
    UPDATE orders order_row
    SET subtotal_khr = COALESCE((
      SELECT SUM(item.line_total_khr) FROM order_items item WHERE item.order_id = order_row.id
    ), 0),
    total_khr = COALESCE((
      SELECT SUM(item.line_total_khr) FROM order_items item WHERE item.order_id = order_row.id
    ), 0),
    pricing_currency = 'usd',
    exchange_rate_khr_per_usd = 4100,
    change_currency = CASE WHEN change_due_usd IS NULL THEN NULL ELSE 'usd' END
  `);
}

export async function down({ context }) {
  const { queryInterface } = context;
  const orderTable = await queryInterface.describeTable('orders');
  for (const name of Object.keys(ORDER_COLUMNS).reverse()) {
    if (orderTable[name]) {
      await queryInterface.removeColumn('orders', name);
    }
  }
  const tables = new Set((await queryInterface.showAllTables()).map((table) => (
    typeof table === 'string' ? table : table.tableName
  )));
  if (tables.has('business_financial_settings')) {
    await queryInterface.dropTable('business_financial_settings');
  }
}

export const mixedCurrencySettlementColumns = Object.freeze(Object.keys(ORDER_COLUMNS));
