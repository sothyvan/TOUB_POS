import 'dotenv/config';
import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

const TABLE_NAME = 'refresh_sessions';

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
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        device_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'stall_devices', key: 'id' },
          onDelete: 'CASCADE',
        },
        token_hash: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        csrf_token_hash: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        family_id: {
          type: DataTypes.STRING(36),
          allowNull: false,
        },
        session_version: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        last_used_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        revoked_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        replaced_by_token_hash: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex(TABLE_NAME, ['token_hash'], {
        name: 'uq_refresh_sessions_token_hash',
        unique: true,
      });
      await queryInterface.addIndex(TABLE_NAME, ['user_id', 'revoked_at', 'expires_at'], {
        name: 'idx_refresh_sessions_user_active_expiry',
      });
      await queryInterface.addIndex(TABLE_NAME, ['family_id'], {
        name: 'idx_refresh_sessions_family',
      });
      await queryInterface.addIndex(TABLE_NAME, ['device_id'], {
        name: 'idx_refresh_sessions_device',
      });
    }

    process.stdout.write('[migration] Refresh-session table is ready.\n');
  } finally {
    await sequelize.close();
  }
}

run().catch((error) => {
  process.stderr.write(`[migration] Refresh-session migration failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
