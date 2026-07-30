import 'dotenv/config';
import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some((index) => index.name === options.name)) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

export async function migrateTelegramCookAuthorization() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = (await queryInterface.showAllTables()).map((table) => (
    typeof table === 'string' ? table : table.tableName
  ));

  if (!tables.includes('telegram_cooks')) {
    await queryInterface.createTable('telegram_cooks', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      stall_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'stalls', key: 'id' },
        onDelete: 'CASCADE',
      },
      telegram_user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      display_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  }

  await addIndexIfMissing(
    queryInterface,
    'telegram_cooks',
    ['stall_id', 'telegram_user_id'],
    { name: 'uq_telegram_cooks_stall_user', unique: true },
  );
  await addIndexIfMissing(
    queryInterface,
    'telegram_cooks',
    ['stall_id', 'is_active'],
    { name: 'idx_telegram_cooks_stall_active' },
  );

  const ticketColumns = await queryInterface.describeTable('telegram_tickets');
  if (!ticketColumns.completed_by_telegram_user_id) {
    await queryInterface.addColumn('telegram_tickets', 'completed_by_telegram_user_id', {
      type: DataTypes.BIGINT,
      allowNull: true,
    });
  }
  if (!ticketColumns.completed_by_name) {
    await queryInterface.addColumn('telegram_tickets', 'completed_by_name', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  }
}

try {
  await sequelize.authenticate();
  await migrateTelegramCookAuthorization();
  console.log('[migration] Telegram cook authorization schema is ready.');
} catch (error) {
  console.error('[migration] Telegram cook authorization migration failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
