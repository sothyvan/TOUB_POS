import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const StallDevice = sequelize.define('StallDevice', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'token_hash',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  registered_by_user_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'registered_by_user_id',
  },
  last_cashier_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'last_cashier_id',
  },
  last_seen_at: {
    type: DataTypes.DATE,
    defaultValue: null,
    field: 'last_seen_at',
  },
  revoked_at: {
    type: DataTypes.DATE,
    defaultValue: null,
    field: 'revoked_at',
  },
  revoked_by_user_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'revoked_by_user_id',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'stall_devices',
  timestamps: false,
  indexes: [
    { name: 'uq_stall_devices_token_hash', unique: true, fields: ['token_hash'] },
    { fields: ['stall_id', 'is_active'] },
    { fields: ['last_cashier_id'] },
  ],
});

export default StallDevice;
