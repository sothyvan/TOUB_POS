import 'dotenv/config';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { getPlatformAdminSeedConfig, validateEnvironment } from './config/env.js';
import { cleanupDevelopmentDuplicateUniqueIndexes } from './services/development-schema-cleanup.service.js';
import { startKhqrBackgroundChecker } from './services/khqr-background-checker.service.js';
import { initializeWebSocketServer } from './services/websocket.service.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    validateEnvironment();

    const { default: app } = await import('./app.js');
    const { default: sequelize, ensureDatabaseExists } = await import('./config/db.js');
    const { User } = await import('./models/index.js');

    console.log('[server] Initializing database...');
    // Ensure database exists (Only locally, cloud providers provision the DB for you)
    if (process.env.NODE_ENV !== 'production') {
      await ensureDatabaseExists();
      console.log('[server] Database checked/created successfully.');
    }

    // Authenticate Sequelize connection
    await sequelize.authenticate();
    console.log('[server] Database connection established via Sequelize.');

    // Sync schema in development
    const syncOptions = process.env.NODE_ENV === 'development' ? { alter: true } : {};
    if (process.env.NODE_ENV === 'development') {
      await cleanupDevelopmentDuplicateUniqueIndexes(sequelize);
    }
    await sequelize.sync(syncOptions);
    console.log('[server] Database models synchronized successfully.');

    // Auto-seed default platform admin user for local development only.
    // Business owner accounts should be created by platform_admin through the user API.
    if (process.env.NODE_ENV !== 'production') {
      const seedConfig = getPlatformAdminSeedConfig();
      const adminCount = await User.count({ where: { username: seedConfig.username } });
      if (adminCount === 0) {
        const hashedPassword = await bcrypt.hash(seedConfig.password, 10);
        await User.create({
          username: seedConfig.username,
          password: hashedPassword,
          pin: null,
          role: seedConfig.role,
          owner_id: null,
          is_active: true,
        });
        console.log(`[server] Seeded default platform admin user (username: ${seedConfig.username}).`);
      }
    }

    // Start HTTP + WebSocket server
    const httpServer = createServer(app);
    initializeWebSocketServer(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`[server] Toub POS API running on http://localhost:${PORT}`);
      startKhqrBackgroundChecker();
    });
  } catch (err) {
    console.error('[server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
