import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProductStall = sequelize.define('ProductStall', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
  },
  stall_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'stall_id',
  },
}, {
  tableName: 'product_stalls',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['product_id', 'stall_id'],
    },
  ],
});

export default ProductStall;
