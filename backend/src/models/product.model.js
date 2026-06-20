import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Product = sequelize.define('Product', {
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
  category_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    field: 'category_id',
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  price_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'price_usd',
  },
  price_khr: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'price_khr',
  },
  image_url: {
    type: DataTypes.STRING(500),
    defaultValue: null,
    field: 'image_url',
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_visible',
  },
});

export default Product;
