import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id',
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING(500),
    defaultValue: null,
    field: 'image_url',
  },
  default_price_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'default_price_usd',
  },
  default_price_khr: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'default_price_khr',
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
});

export default Product;
