import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TelegramCook = sequelize.define('TelegramCook', {
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
  telegram_user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'telegram_user_id',
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'display_name',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'telegram_cooks',
  timestamps: false,
  indexes: [
    {
      name: 'uq_telegram_cooks_stall_user',
      unique: true,
      fields: ['stall_id', 'telegram_user_id'],
    },
    {
      fields: ['stall_id', 'is_active'],
    },
  ],
});

export default TelegramCook;
