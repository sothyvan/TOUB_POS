import 'dotenv/config';
import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

const TABLE_NAME = 'telegram_dispatch_jobs';

async function run() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((table) => (
      typeof table === 'string' ? table : table.tableName
    ));

    if (!normalizedTables.includes(TABLE_NAME)) {
      await queryInterface.createTable(TABLE_NAME, {
        id: {
          type: DataTypes.BIGINT,
          autoIncrement: true,
          primaryKey: true,
        },
        order_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onDelete: 'CASCADE',
        },
        status: {
          type: DataTypes.ENUM('pending', 'processing', 'retry', 'sent', 'failed'),
          allowNull: false,
          defaultValue: 'pending',
        },
        attempt_count: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        next_attempt_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        last_attempt_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        locked_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        locked_by: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        last_error: {
          type: DataTypes.STRING(500),
          allowNull: true,
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

      await queryInterface.addIndex(TABLE_NAME, ['order_id'], {
        name: 'uq_telegram_dispatch_jobs_order',
        unique: true,
      });
      await queryInterface.addIndex(TABLE_NAME, ['status', 'next_attempt_at'], {
        name: 'idx_telegram_dispatch_jobs_due',
      });
      await queryInterface.addIndex(TABLE_NAME, ['status', 'locked_at'], {
        name: 'idx_telegram_dispatch_jobs_lock',
      });
    }

    process.stdout.write('[migration] Telegram dispatch outbox is ready.\n');
  } finally {
    await sequelize.close();
  }
}

run().catch((error) => {
  process.stderr.write(
    `[migration] Telegram dispatch outbox migration failed: ${error.stack || error.message}\n`,
  );
  process.exitCode = 1;
});
