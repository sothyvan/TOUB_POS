import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    // Note: 'unique' constraint is defined at the bottom in 'indexes' 
    // to prevent the Sequelize alter:true duplication bug in MySQL
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  pin: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  },
  role: {
    type: DataTypes.ENUM('platform_admin', 'owner', 'manager', 'cashier'),
    allowNull: false,
    defaultValue: 'cashier',
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'owner_id',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_deleted',
  },
  session_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'session_version',
    validate: {
      min: 1,
    },
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['username']
    }
  ]
});

export default User;
