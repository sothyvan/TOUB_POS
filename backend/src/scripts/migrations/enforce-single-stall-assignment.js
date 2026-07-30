import 'dotenv/config';
import sequelize from '../../config/db.js';

const TABLE_NAME = 'stall_staff';
const INDEX_NAME = 'uq_stall_staff_user';
const STALL_INDEX_NAME = 'idx_stall_staff_stall_id';

function getIndexFields(index) {
  return index.fields.map((field) => field.attribute || field.name);
}

async function run() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    const [duplicates] = await sequelize.query(`
      SELECT user_id, COUNT(*) AS assignment_count
      FROM stall_staff
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `);
    if (duplicates.length > 0) {
      const userIds = duplicates.map((row) => row.user_id).join(', ');
      throw new Error(
        `Cannot enforce one stall per cashier. Resolve duplicate stall_staff rows for user IDs: ${userIds}.`,
      );
    }

    const indexes = await queryInterface.showIndex(TABLE_NAME);
    const hasUserUniqueIndex = indexes.some((index) => (
      index.unique
      && getIndexFields(index).length === 1
      && getIndexFields(index)[0] === 'user_id'
    ));
    if (!hasUserUniqueIndex) {
      await queryInterface.addIndex(TABLE_NAME, ['user_id'], {
        name: INDEX_NAME,
        unique: true,
      });
    }

    const hasStallIndex = indexes.some((index) => (
      getIndexFields(index)[0] === 'stall_id'
      && getIndexFields(index).length === 1
    ));
    if (!hasStallIndex) {
      await queryInterface.addIndex(TABLE_NAME, ['stall_id'], {
        name: STALL_INDEX_NAME,
      });
    }

    const replacementIndexes = await queryInterface.showIndex(TABLE_NAME);
    for (const index of replacementIndexes) {
      const fields = getIndexFields(index);
      if (
        index.unique
        && fields.length === 2
        && fields.includes('stall_id')
        && fields.includes('user_id')
      ) {
        await queryInterface.removeIndex(TABLE_NAME, index.name);
      }
    }

    process.stdout.write('[migration] One-stall-per-cashier assignment constraint is ready.\n');
  } finally {
    await sequelize.close();
  }
}

run().catch((error) => {
  process.stderr.write(`[migration] Failed to enforce cashier stall assignments: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
