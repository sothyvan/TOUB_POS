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
  line_total_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'line_total_usd',
  },
  line_total_khr: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'line_total_khr',
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
