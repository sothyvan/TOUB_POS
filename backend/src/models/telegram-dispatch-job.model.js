import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TelegramDispatchJob = sequelize.define('TelegramDispatchJob', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'order_id',
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'retry', 'sent', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  attempt_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    field: 'attempt_count',
  },
  next_attempt_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'next_attempt_at',
  },
  last_attempt_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_attempt_at',
  },
  locked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'locked_at',
  },
  locked_by: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'locked_by',
  },
  last_error: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'last_error',
  },
}, {
  tableName: 'telegram_dispatch_jobs',
  indexes: [
    {
      name: 'uq_telegram_dispatch_jobs_order',
      unique: true,
      fields: ['order_id'],
    },
    {
      name: 'idx_telegram_dispatch_jobs_due',
      fields: ['status', 'next_attempt_at'],
    },
    {
      name: 'idx_telegram_dispatch_jobs_lock',
      fields: ['status', 'locked_at'],
    },
  ],
});

export default TelegramDispatchJob;
