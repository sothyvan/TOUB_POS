import { DataTypes } from 'sequelize';

const INDEXES = [
  { name: 'idx_audit_logs_owner_created', fields: ['owner_id', 'created_at'] },
  { name: 'idx_audit_logs_target', fields: ['target_type', 'target_id'] },
  { name: 'idx_audit_logs_request_id', fields: ['request_id'] },
];

export async function up({ context }) {
  const { queryInterface, sequelize } = context;
  const table = await queryInterface.describeTable('audit_logs');

  await queryInterface.changeColumn('audit_logs', 'action', {
    type: DataTypes.STRING(100),
    allowNull: false,
  });
  if (!table.owner_id) {
    await queryInterface.addColumn('audit_logs', 'owner_id', { type: DataTypes.INTEGER, allowNull: true });
  }
  if (!table.target_type) {
    await queryInterface.addColumn('audit_logs', 'target_type', { type: DataTypes.STRING(50), allowNull: true });
  }
  if (!table.target_id) {
    await queryInterface.addColumn('audit_logs', 'target_id', { type: DataTypes.STRING(64), allowNull: true });
  }
  if (!table.request_id) {
    await queryInterface.addColumn('audit_logs', 'request_id', { type: DataTypes.STRING(128), allowNull: true });
  }

  await sequelize.query(`
    UPDATE audit_logs audit
    JOIN orders order_row ON order_row.id = audit.order_id
    JOIN stalls stall ON stall.id = order_row.stall_id
    SET audit.owner_id = stall.owner_id
    WHERE audit.owner_id IS NULL
  `);
  await sequelize.query(`
    UPDATE audit_logs audit
    JOIN users actor ON actor.id = audit.actor_user_id
    SET audit.owner_id = CASE
      WHEN actor.role = 'owner' THEN actor.id
      ELSE actor.owner_id
    END
    WHERE audit.owner_id IS NULL
  `);

  const existingIndexes = await queryInterface.showIndex('audit_logs');
  const existingNames = new Set(existingIndexes.map((index) => index.name));
  for (const index of INDEXES) {
    if (!existingNames.has(index.name)) {
      await queryInterface.addIndex('audit_logs', index.fields, { name: index.name });
    }
  }
}

export async function down({ context }) {
  const { queryInterface } = context;
  const existingIndexes = await queryInterface.showIndex('audit_logs');
  const existingNames = new Set(existingIndexes.map((index) => index.name));
  for (const index of [...INDEXES].reverse()) {
    if (existingNames.has(index.name)) {
      await queryInterface.removeIndex('audit_logs', index.name);
    }
  }
  for (const column of ['request_id', 'target_id', 'target_type', 'owner_id']) {
    const table = await queryInterface.describeTable('audit_logs');
    if (table[column]) {
      await queryInterface.removeColumn('audit_logs', column);
    }
  }
  await queryInterface.changeColumn('audit_logs', 'action', {
    type: DataTypes.ENUM('order_created', 'cash_payment_confirmed', 'khqr_payment_confirmed', 'order_cancelled'),
    allowNull: false,
  });
}
