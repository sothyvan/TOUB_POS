import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  actor_user_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'actor_user_id',
  },
  action: {
    type: DataTypes.ENUM('order_created', 'cash_payment_confirmed', 'khqr_payment_confirmed', 'order_cancelled'),
    allowNull: false,
  },
  order_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'order_id',
  },
  details: {
    type: DataTypes.JSON,
    defaultValue: null,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    { fields: ['actor_user_id'] },
    { fields: ['order_id'] },
    { fields: ['action'] },
    { fields: ['created_at'] },
  ],
});

export default AuditLog;
