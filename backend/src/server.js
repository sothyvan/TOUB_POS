import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { validateEnvironment } from './config/env.js';

const PORT = process.env.PORT || 3000;

async function migrateLegacyAdminRoles(sequelize) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const [tables] = await sequelize.query("SHOW TABLES LIKE 'users';");
  if (tables.length === 0) {
    return;
  }

  await sequelize.query(
    "ALTER TABLE `users` MODIFY `role` ENUM('admin', 'owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier';"
  );

  const [, metadata] = await sequelize.query("UPDATE `users` SET `role` = 'owner' WHERE `role` = 'admin';");

  await sequelize.query(
    "ALTER TABLE `users` MODIFY `role` ENUM('owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier';"
  );

  if (metadata?.affectedRows > 0) {
    console.log(`[server] Migrated ${metadata.affectedRows} legacy admin user role(s) to owner.`);
  }
}

async function migrateLegacyOrderStatuses(sequelize) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const [tables] = await sequelize.query("SHOW TABLES LIKE 'orders';");
  if (tables.length === 0) {
    return;
  }

  await sequelize.query(
    "ALTER TABLE `orders` MODIFY `status` ENUM('pending', 'completed', 'pending_payment', 'paid', 'cancelled') NOT NULL DEFAULT 'pending';"
  );

  const [, pendingMetadata] = await sequelize.query(
    "UPDATE `orders` SET `status` = 'pending_payment' WHERE `status` = 'pending';"
  );
  const [, completedMetadata] = await sequelize.query(
    "UPDATE `orders` SET `status` = 'paid' WHERE `status` = 'completed';"
  );

  await sequelize.query(
    "ALTER TABLE `orders` MODIFY `status` ENUM('pending_payment', 'paid', 'cancelled') NOT NULL DEFAULT 'pending_payment';"
  );

  const migratedCount = (pendingMetadata?.affectedRows || 0) + (completedMetadata?.affectedRows || 0);
  if (migratedCount > 0) {
    console.log(`[server] Migrated ${migratedCount} legacy order status value(s).`);
  }
}

async function startServer() {
  try {
    validateEnvironment();

    const { default: app } = await import('./app.js');
    const { default: sequelize, ensureDatabaseExists } = await import('./config/db.js');
    const { User } = await import('./models/index.js');

    console.log('[server] Initializing database...');
    // Ensure database exists
    await ensureDatabaseExists();
    console.log('[server] Database checked/created successfully.');

    // Authenticate Sequelize connection
    await sequelize.authenticate();
    console.log('[server] Database connection established via Sequelize.');

    await migrateLegacyAdminRoles(sequelize);
    await migrateLegacyOrderStatuses(sequelize);

    // Sync schema in development
    const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : {};
    await sequelize.sync(syncOptions);
    console.log('[server] Database models synchronized successfully.');

    // Auto-seed default owner user for local development only
    const userCount = await User.count();
    if (process.env.NODE_ENV !== 'production' && userCount === 0) {
      const hashedPassword = await bcrypt.hash('owner123', 10);
      await User.create({
        username: 'owner',
        password: hashedPassword,
        role: 'owner',
        is_active: true,
      });
      console.log('[server] Seeded default owner user (username: owner, password: owner123).');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`[server] Toub POS API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
