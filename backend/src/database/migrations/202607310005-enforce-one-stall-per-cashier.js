const INDEX_NAME = 'uq_stall_staff_one_stall_per_user';

function indexColumns(index) {
  return (index.fields || []).map((field) => field.attribute || field.name);
}

function hasUniqueUserIndex(indexes) {
  return indexes.some((index) => (
    index.unique === true
    && indexColumns(index).length === 1
    && indexColumns(index)[0] === 'user_id'
  ));
}

export async function up({ context }) {
  const { queryInterface, sequelize } = context;
  const [duplicates] = await sequelize.query(`
    SELECT user_id, COUNT(*) AS assignment_count
    FROM stall_staff
    GROUP BY user_id
    HAVING COUNT(*) > 1
    LIMIT 1
  `);
  if (duplicates.length > 0) {
    throw new Error(
      `Cannot enforce one Stall per Cashier: user ${duplicates[0].user_id} has multiple assignments. Resolve duplicate stall_staff rows before retrying the migration.`,
    );
  }

  const indexes = await queryInterface.showIndex('stall_staff');
  if (!hasUniqueUserIndex(indexes)) {
    await queryInterface.addIndex('stall_staff', ['user_id'], {
      name: INDEX_NAME,
      unique: true,
    });
  }
}

export async function down({ context }) {
  const { queryInterface } = context;
  const indexes = await queryInterface.showIndex('stall_staff');
  if (indexes.some((index) => index.name === INDEX_NAME)) {
    await queryInterface.removeIndex('stall_staff', INDEX_NAME);
  }
}

export const assignmentConstraint = {
  indexName: INDEX_NAME,
  hasUniqueUserIndex,
};

