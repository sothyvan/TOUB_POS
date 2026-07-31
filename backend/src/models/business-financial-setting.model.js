import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const BusinessFinancialSetting = sequelize.define('BusinessFinancialSetting', {
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    field: 'owner_id',
  },
  exchange_rate_khr_per_usd: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4100,
    field: 'exchange_rate_khr_per_usd',
  },
  updated_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by_user_id',
  },
}, {
  tableName: 'business_financial_settings',
});

export default BusinessFinancialSetting;
