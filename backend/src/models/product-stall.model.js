import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductStall = sequelize.define('ProductStall', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
  },
  stall_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'stall_id',
  },
  price_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'price_usd',
  },
  price_khr: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'price_khr',
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_visible',
  },
}, {
  tableName: 'stall_products',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['stall_id', 'product_id'],
    },
  ],
});

export default ProductStall;
