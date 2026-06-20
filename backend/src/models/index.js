import sequelize from '../config/db.js';
import User from './user.model.js';
import Stall from './stall.model.js';
import StallStaff from './stall-staff.model.js';
import Category from './category.model.js';
import Product from './product.model.js';
import Order from './order.model.js';
import OrderItem from './order-item.model.js';
import TelegramSession from './telegram-session.model.js';

// ── Stall ↔ Staff (Many-to-Many via StallStaff) ──────────────
Stall.belongsToMany(User, { through: StallStaff, foreignKey: 'stall_id', otherKey: 'user_id' });
User.belongsToMany(Stall, { through: StallStaff, foreignKey: 'user_id', otherKey: 'stall_id' });

StallStaff.belongsTo(Stall, { foreignKey: 'stall_id', onDelete: 'CASCADE' });
StallStaff.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Stall.hasMany(StallStaff, { foreignKey: 'stall_id' });
User.hasMany(StallStaff, { foreignKey: 'user_id' });

// ── Stall ↔ Category (One-to-Many) ───────────────────────────
Category.belongsTo(Stall, { foreignKey: 'stall_id', onDelete: 'SET NULL' });
Stall.hasMany(Category, { foreignKey: 'stall_id' });

// ── Product Associations ─────────────────────────────────────
Product.belongsTo(Stall, { foreignKey: 'stall_id', onDelete: 'SET NULL' });
Stall.hasMany(Product, { foreignKey: 'stall_id' });

Product.belongsTo(Category, { foreignKey: 'category_id', onDelete: 'SET NULL' });
Category.hasMany(Product, { foreignKey: 'category_id' });

// ── Order Associations ───────────────────────────────────────
Order.belongsTo(Stall, { foreignKey: 'stall_id' });
Stall.hasMany(Order, { foreignKey: 'stall_id' });

Order.belongsTo(User, { as: 'Cashier', foreignKey: 'cashier_id' });
User.hasMany(Order, { foreignKey: 'cashier_id' });

// ── OrderItem Associations ───────────────────────────────────
OrderItem.belongsTo(Order, { foreignKey: 'order_id', onDelete: 'CASCADE' });
Order.hasMany(OrderItem, { as: 'Items', foreignKey: 'order_id' });

OrderItem.belongsTo(Product, { foreignKey: 'product_id', onDelete: 'SET NULL' });
Product.hasMany(OrderItem, { foreignKey: 'product_id' });

// ── TelegramSession Associations ─────────────────────────────
TelegramSession.belongsTo(Stall, { foreignKey: 'stall_id', onDelete: 'CASCADE' });
Stall.hasMany(TelegramSession, { foreignKey: 'stall_id' });

export {
  sequelize,
  User,
  Stall,
  StallStaff,
  Category,
  Product,
  Order,
  OrderItem,
  TelegramSession,
};
