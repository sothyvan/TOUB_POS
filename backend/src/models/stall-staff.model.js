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
      unique: true,
      fields: ['stall_id', 'user_id'],
    },
  ],
});

export default StallStaff;
