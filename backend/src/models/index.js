import sequelize from '../config/db.js';
import User from './user.model.js';
import Stall from './stall.model.js';
import StallStaff from './stall-staff.model.js';
import Category from './category.model.js';
import Product from './product.model.js';
import Order from './order.model.js';
import OrderItem from './order-item.model.js';
import TelegramTicket from './telegram-ticket.model.js';
import AuditLog from './audit-log.model.js';
import ProductStall from './product-stall.model.js';

// ── User ↔ Stall Ownership ──────────────────────────────────
Stall.belongsTo(User, { as: 'Owner', foreignKey: 'owner_id', onDelete: 'SET NULL' });
User.hasMany(Stall, { as: 'OwnedStalls', foreignKey: 'owner_id' });

// ── User Subordination (Owner has Managers/Cashiers) ─────────
User.belongsTo(User, { as: 'Owner', foreignKey: 'owner_id', onDelete: 'SET NULL' });
User.hasMany(User, { as: 'Staff', foreignKey: 'owner_id' });

// ── Stall ↔ Staff (Many-to-Many via StallStaff) ──────────────
Stall.belongsToMany(User, { through: StallStaff, foreignKey: 'stall_id', otherKey: 'user_id' });
User.belongsToMany(Stall, { through: StallStaff, foreignKey: 'user_id', otherKey: 'stall_id' });

StallStaff.belongsTo(Stall, { foreignKey: 'stall_id', onDelete: 'CASCADE' });
StallStaff.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Stall.hasMany(StallStaff, { foreignKey: 'stall_id' });
User.hasMany(StallStaff, { foreignKey: 'user_id' });

// ── Product Associations ─────────────────────────────────────
Product.belongsToMany(Stall, { through: ProductStall, foreignKey: 'product_id', otherKey: 'stall_id', onDelete: 'CASCADE' });
Stall.belongsToMany(Product, { through: ProductStall, foreignKey: 'stall_id', otherKey: 'product_id', onDelete: 'CASCADE' });

ProductStall.belongsTo(Product, { foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductStall.belongsTo(Stall, { foreignKey: 'stall_id', onDelete: 'CASCADE' });
Product.hasMany(ProductStall, { foreignKey: 'product_id' });
Stall.hasMany(ProductStall, { foreignKey: 'stall_id' });

Product.belongsTo(Category, { foreignKey: 'category_id', onDelete: 'RESTRICT' });
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

// ── TelegramTicket Associations ──────────────────────────────
TelegramTicket.belongsTo(Order, { foreignKey: 'order_id', onDelete: 'CASCADE' });
Order.hasMany(TelegramTicket, { as: 'TelegramTickets', foreignKey: 'order_id' });

// ── AuditLog Associations ──────────────────────────────────
AuditLog.belongsTo(User, { as: 'Actor', foreignKey: 'actor_user_id', onDelete: 'SET NULL' });
User.hasMany(AuditLog, { as: 'AuditLogs', foreignKey: 'actor_user_id' });

AuditLog.belongsTo(Order, { foreignKey: 'order_id', onDelete: 'SET NULL' });
Order.hasMany(AuditLog, { as: 'AuditLogs', foreignKey: 'order_id' });

export {
  sequelize,
  User,
  Stall,
  StallStaff,
  Category,
  Product,
  Order,
  OrderItem,
  TelegramTicket,
  AuditLog,
  ProductStall,
};
