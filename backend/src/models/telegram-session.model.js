import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TelegramSession = sequelize.define('TelegramSession', {
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
  name: {
    type: DataTypes.STRING(100),
    defaultValue: null,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['stall_id', 'telegram_user_id'],
    },
  ],
});

export default TelegramSession;
