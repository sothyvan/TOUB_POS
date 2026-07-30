import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const RefreshSession = sequelize.define('RefreshSession', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'device_id',
  },
  token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'token_hash',
  },
  csrf_token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'csrf_token_hash',
  },
  family_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'family_id',
  },
  session_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'session_version',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'last_used_at',
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'revoked_at',
  },
  replaced_by_token_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    defaultValue: null,
    field: 'replaced_by_token_hash',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'refresh_sessions',
  timestamps: false,
  indexes: [
    { name: 'uq_refresh_sessions_token_hash', unique: true, fields: ['token_hash'] },
    {
      name: 'idx_refresh_sessions_user_active_expiry',
      fields: ['user_id', 'revoked_at', 'expires_at'],
    },
    { name: 'idx_refresh_sessions_family', fields: ['family_id'] },
    { name: 'idx_refresh_sessions_device', fields: ['device_id'] },
  ],
});

export default RefreshSession;
