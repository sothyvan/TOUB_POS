import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TelegramGroupConnection = sequelize.define('TelegramGroupConnection', {
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
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by_user_id',
  },
  token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'token_hash',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  consumed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'consumed_at',
  },
  connected_chat_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'connected_chat_id',
  },
  connected_chat_title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'connected_chat_title',
  },
  connected_by_telegram_user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'connected_by_telegram_user_id',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'telegram_group_connections',
  timestamps: false,
  indexes: [
    {
      name: 'uq_telegram_group_connections_token_hash',
      unique: true,
      fields: ['token_hash'],
    },
    {
      name: 'idx_telegram_group_connections_stall_expiry',
      fields: ['stall_id', 'expires_at'],
    },
  ],
});

export default TelegramGroupConnection;
