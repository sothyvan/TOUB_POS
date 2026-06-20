import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Stall = sequelize.define('Stall', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  device_token: {
    type: DataTypes.STRING(255),
    defaultValue: null,
    unique: true,
    field: 'device_token',
  },
  telegram_chat_id: {
    type: DataTypes.BIGINT,
    defaultValue: null,
    field: 'telegram_chat_id',
  },
});

export default Stall;
