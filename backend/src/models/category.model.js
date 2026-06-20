import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  stall_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'stall_id',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  tone: {
    type: DataTypes.ENUM('gold', 'green', 'blue', 'rose'),
    allowNull: false,
    defaultValue: 'gold',
  },
});

export default Category;
