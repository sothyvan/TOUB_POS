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
    type: DataTypes.ENUM('pending_payment', 'paid', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending_payment',
  },
  subtotal_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'subtotal_usd',
  },
  total_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_usd',
  },
  cash_received_usd: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: null,
    field: 'cash_received_usd',
  },
  change_due_usd: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: null,
    field: 'change_due_usd',
  },
  qr_payload: {
    type: DataTypes.TEXT,
    defaultValue: null,
    field: 'qr_payload',
  },
  qr_md5: {
    type: DataTypes.STRING(64),
    defaultValue: null,
    field: 'qr_md5',
  },
  payment_reference: {
    type: DataTypes.STRING(100),
    defaultValue: null,
    unique: true,
    field: 'payment_reference',
  },
  payment_expires_at: {
    type: DataTypes.DATE,
    defaultValue: null,
    field: 'payment_expires_at',
  },
  completed_at: {
    type: DataTypes.DATE,
    defaultValue: null,
    field: 'completed_at',
  },
});

export default Order;
