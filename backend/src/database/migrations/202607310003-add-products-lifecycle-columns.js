import { DataTypes } from 'sequelize';

const COLUMNS = {
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
};

export async function up({ context }) {
  const { queryInterface } = context;
  const products = await queryInterface.describeTable('products');

  for (const [columnName, definition] of Object.entries(COLUMNS)) {
    if (!products[columnName]) {
      await queryInterface.addColumn('products', columnName, definition);
    }
  }
}

export async function down({ context }) {
  const { queryInterface } = context;
  const products = await queryInterface.describeTable('products');

  for (const columnName of Object.keys(COLUMNS).reverse()) {
    if (products[columnName]) {
      await queryInterface.removeColumn('products', columnName);
    }
  }
}
