import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'order_id',
  },
  product_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'product_id',
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
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
  subtotal_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'subtotal_usd',
  },
  subtotal_khr: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'subtotal_khr',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  notes: {
    type: DataTypes.STRING(500),
    defaultValue: null,
  },
}, {
  timestamps: false,
});

export default OrderItem;
