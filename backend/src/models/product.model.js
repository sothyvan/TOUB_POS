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
});

export default Product;
