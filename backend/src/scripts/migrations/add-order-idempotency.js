import 'dotenv/config';
import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

const TABLE_NAME = 'orders';
const INDEX_NAME = 'uq_orders_cashier_idempotency';

async function run() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    const columns = await queryInterface.describeTable(TABLE_NAME);

    if (!columns.idempotency_key) {
      await queryInterface.addColumn(TABLE_NAME, 'idempotency_key', {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
    }
    if (!columns.idempotency_fingerprint) {
      await queryInterface.addColumn(TABLE_NAME, 'idempotency_fingerprint', {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex(TABLE_NAME);
    if (!indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.addIndex(TABLE_NAME, ['cashier_id', 'idempotency_key'], {
        name: INDEX_NAME,
        unique: true,
      });
    }

    process.stdout.write('[migration] Order idempotency fields and unique index are ready.\n');
  } finally {
    await sequelize.close();
  }
}

run().catch((error) => {
  process.stderr.write(`[migration] Failed to add order idempotency fields: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
