import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TelegramTicket = sequelize.define('TelegramTicket', {
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
  telegram_msg_id: {
    type: DataTypes.BIGINT,
    defaultValue: null,
    field: 'telegram_msg_id',
  },
  telegram_chat_id: {
    type: DataTypes.BIGINT,
    defaultValue: null,
    field: 'telegram_chat_id',
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'done'),
    allowNull: false,
    defaultValue: 'pending',
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: null,
    field: 'sent_at',
  },
  completed_at: {
    type: DataTypes.DATE,
    defaultValue: null,
    field: 'completed_at',
  },
  completed_by_telegram_user_id: {
    type: DataTypes.BIGINT,
    defaultValue: null,
    field: 'completed_by_telegram_user_id',
  },
  completed_by_name: {
    type: DataTypes.STRING(100),
    defaultValue: null,
    field: 'completed_by_name',
  },
}, {
  tableName: 'telegram_tickets',
  timestamps: false,
  indexes: [
    {
      fields: ['order_id'],
    },
    {
      fields: ['telegram_chat_id'],
    },
    {
      fields: ['status'],
    },
    {
      unique: true,
      fields: ['telegram_chat_id', 'telegram_msg_id'],
    },
  ],
});

export default TelegramTicket;


