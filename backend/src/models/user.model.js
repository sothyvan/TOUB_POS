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
    defaultValue: null,
  },
  role: {
    type: DataTypes.ENUM('owner', 'manager', 'cashier'),
    allowNull: false,
    defaultValue: 'cashier',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
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
