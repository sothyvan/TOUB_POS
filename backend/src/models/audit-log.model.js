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
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  owner_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'owner_id',
  },
  order_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'order_id',
  },
  target_type: {
    type: DataTypes.STRING(50),
    defaultValue: null,
    field: 'target_type',
  },
  target_id: {
    type: DataTypes.STRING(64),
    defaultValue: null,
    field: 'target_id',
  },
  request_id: {
    type: DataTypes.STRING(128),
    defaultValue: null,
    field: 'request_id',
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
    { name: 'idx_audit_logs_owner_created', fields: ['owner_id', 'created_at'] },
    { name: 'idx_audit_logs_target', fields: ['target_type', 'target_id'] },
    { name: 'idx_audit_logs_request_id', fields: ['request_id'] },
  ],
});

export default AuditLog;
