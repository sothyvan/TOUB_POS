import 'dotenv/config';
import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

const TABLE_NAME = 'users';
const COLUMN_NAME = 'session_version';

async function run() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    const table = await queryInterface.describeTable(TABLE_NAME);
    if (!table[COLUMN_NAME]) {
      await queryInterface.addColumn(TABLE_NAME, COLUMN_NAME, {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    await sequelize.query(`
      UPDATE users
      SET session_version = 1
      WHERE session_version IS NULL OR session_version < 1
    `);

    process.stdout.write('[migration] User session-version column is ready.\n');
  } finally {
    await sequelize.close();
  }
}

run().catch((error) => {
  process.stderr.write(`[migration] User session-version migration failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
