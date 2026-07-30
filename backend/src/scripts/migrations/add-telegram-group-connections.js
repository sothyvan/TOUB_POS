import 'dotenv/config';
import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some((index) => index.name === options.name)) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

export async function migrateTelegramGroupConnections() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = (await queryInterface.showAllTables()).map((table) => (
    typeof table === 'string' ? table : table.tableName
  ));

  const stallColumns = await queryInterface.describeTable('stalls');
  if (!stallColumns.telegram_chat_title) {
    await queryInterface.addColumn('stalls', 'telegram_chat_title', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }
  if (!stallColumns.telegram_connected_at) {
    await queryInterface.addColumn('stalls', 'telegram_connected_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  if (!tables.includes('telegram_group_connections')) {
    await queryInterface.createTable('telegram_group_connections', {
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
      created_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      consumed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      connected_chat_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      connected_chat_title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      connected_by_telegram_user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  }

  await addIndexIfMissing(
    queryInterface,
    'telegram_group_connections',
    ['token_hash'],
    { name: 'uq_telegram_group_connections_token_hash', unique: true },
  );
  await addIndexIfMissing(
    queryInterface,
    'telegram_group_connections',
    ['stall_id', 'expires_at'],
    { name: 'idx_telegram_group_connections_stall_expiry' },
  );
}

try {
  await sequelize.authenticate();
  await migrateTelegramGroupConnections();
  console.log('[migration] Telegram group connection schema is ready.');
} catch (error) {
  console.error('[migration] Telegram group connection migration failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
