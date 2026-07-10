import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Stall = sequelize.define('Stall', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  owner_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'owner_id',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(150),
    defaultValue: null,
  },
  device_token: {
    type: DataTypes.STRING(255),
    defaultValue: null,
    field: 'device_token',
  },
  telegram_chat_id: {
    type: DataTypes.BIGINT,
    defaultValue: null,
    field: 'telegram_chat_id',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  indexes: [
    {
      name: 'uq_stalls_device_token',
      unique: true,
      fields: ['device_token'],
    },
  ],
});

export default Stall;
