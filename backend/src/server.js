import 'dotenv/config';
import app from './app.js';
import sequelize, { ensureDatabaseExists } from './config/db.js';
import { User } from './models/index.js';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('[server] Initializing database...');
    // Ensure database exists
    await ensureDatabaseExists();
    console.log('[server] Database checked/created successfully.');

    // Authenticate Sequelize connection
    await sequelize.authenticate();
    console.log('[server] Database connection established via Sequelize.');

    // Sync schema in development
    const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : {};
    await sequelize.sync(syncOptions);
    console.log('[server] Database models synchronized successfully.');

    // Auto-seed default admin user if none exist
    const userCount = await User.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10); // ONLY FOR DEV // For PRODUCTION it must be changed and .env must be used instead
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        is_active: true,
      });
      console.log('[server] Seeded default admin user (username: admin, password: admin123).');
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
