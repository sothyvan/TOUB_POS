import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  stall_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'stall_id',
  },
  cashier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'cashier_id',
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'khqr'),
    allowNull: false,
    field: 'payment_method',
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  total_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_usd',
  },
  qr_payload: {
    type: DataTypes.TEXT,
    defaultValue: null,
    field: 'qr_payload',
  },
  completed_at: {
    type: DataTypes.DATE,
    defaultValue: null,
    field: 'completed_at',
  },
});

export default Order;
