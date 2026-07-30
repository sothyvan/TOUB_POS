const INDEXES = [
  {
    name: 'idx_orders_stall_created',
    fields: ['stall_id', 'created_at'],
  },
  {
    name: 'idx_orders_cashier_created',
    fields: ['cashier_id', 'created_at'],
  },
  {
    name: 'idx_orders_status',
    fields: ['status'],
  },
];

const FOREIGN_KEY_INDEXES = [
  {
    name: 'idx_orders_stall_id',
    field: 'stall_id',
    replacing: 'idx_orders_stall_created',
  },
  {
    name: 'idx_orders_cashier_id',
    field: 'cashier_id',
    replacing: 'idx_orders_cashier_created',
  },
];

function startsWithField(index, field, excludedName) {
  return index.name !== excludedName
    && index.fields?.[0]?.attribute === field;
}

export async function up({ context }) {
  const { queryInterface } = context;
  const existingIndexes = await queryInterface.showIndex('orders');
  const names = new Set(existingIndexes.map((index) => index.name));

  for (const index of INDEXES) {
    if (!names.has(index.name)) {
      await queryInterface.addIndex('orders', index.fields, {
        name: index.name,
      });
    }
  }
}

export async function down({ context }) {
  const { queryInterface } = context;
  let existingIndexes = await queryInterface.showIndex('orders');
  let names = new Set(existingIndexes.map((index) => index.name));

  // MySQL may discard its implicit single-column FK index after a covering
  // composite index is added. Restore one before removing that composite index.
  for (const index of FOREIGN_KEY_INDEXES) {
    const hasAlternative = existingIndexes.some((candidate) =>
      startsWithField(candidate, index.field, index.replacing));
    if (!hasAlternative && !names.has(index.name)) {
      await queryInterface.addIndex('orders', [index.field], {
        name: index.name,
      });
    }
  }

  existingIndexes = await queryInterface.showIndex('orders');
  names = new Set(existingIndexes.map((index) => index.name));

  for (const index of INDEXES) {
    if (names.has(index.name)) {
      await queryInterface.removeIndex('orders', index.name);
    }
  }
}
