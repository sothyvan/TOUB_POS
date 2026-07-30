import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const StallStaff = sequelize.define('StallStaff', {
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
}, {
  tableName: 'stall_staff',
  timestamps: false,
  indexes: [
    {
      name: 'uq_stall_staff_user',
      unique: true,
      fields: ['user_id'],
    },
    {
      name: 'idx_stall_staff_stall_id',
      fields: ['stall_id'],
    },
  ],
});

export default StallStaff;
