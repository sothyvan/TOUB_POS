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
  subtotal_khr: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'subtotal_khr',
  },
  total_khr: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_khr',
  },
  pricing_currency: {
    type: DataTypes.ENUM('usd', 'khr'),
    allowNull: false,
    defaultValue: 'usd',
    field: 'pricing_currency',
  },
  exchange_rate_khr_per_usd: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4100,
    field: 'exchange_rate_khr_per_usd',
  },
  cash_received_usd: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: null,
    field: 'cash_received_usd',
  },
  cash_received_khr: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'cash_received_khr',
  },
  change_due_usd: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: null,
    field: 'change_due_usd',
  },
  change_due_khr: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'change_due_khr',
  },
  change_currency: {
    type: DataTypes.ENUM('usd', 'khr'),
    defaultValue: null,
    field: 'change_currency',
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
  idempotency_key: {
    type: DataTypes.STRING(64),
    defaultValue: null,
    field: 'idempotency_key',
  },
  idempotency_fingerprint: {
    type: DataTypes.STRING(64),
    defaultValue: null,
    field: 'idempotency_fingerprint',
  },
}, {
  defaultScope: {
    attributes: {
      exclude: ['idempotency_key', 'idempotency_fingerprint'],
    },
  },
  indexes: [
    {
      name: 'uq_orders_payment_reference',
      unique: true,
      fields: ['payment_reference'],
    },
    // Composite index: Owner/Manager lists always filter by stall_id + sort by created_at
    {
      name: 'idx_orders_stall_created',
      fields: ['stall_id', 'created_at'],
    },
    // Composite index: Cashier My Orders always filters by cashier_id + sorts by created_at
    {
      name: 'idx_orders_cashier_created',
      fields: ['cashier_id', 'created_at'],
    },
    // Status filter hit by operations watch, background KHQR checker, and report queries
    {
      name: 'idx_orders_status',
      fields: ['status'],
    },
    {
      name: 'uq_orders_cashier_idempotency',
      unique: true,
      fields: ['cashier_id', 'idempotency_key'],
    },
  ],
});

export default Order;
