import 'dotenv/config';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { getPlatformAdminSeedConfig, validateEnvironment } from './config/env.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    validateEnvironment();

    const { default: sequelize, ensureDatabaseExists } = await import('./config/db.js');
    const {
      assertDatabaseMigrationsCurrent,
      migrateDatabase,
    } = await import('./database/migrator.js');
    const { startKhqrBackgroundChecker } = await import(
      './startup/khqr-background-checker.js'
    );
    const { startTelegramDispatchWorker } = await import(
      './services/telegram-dispatch-worker.service.js'
    );
    const { initializeWebSocketServer } = await import(
      './services/websocket.service.js'
    );
    const { initializeRateLimitStore } = await import(
      './services/rate-limit-store.service.js'
    );

    console.log('[server] Initializing database...');
    // Ensure database exists (Only locally, cloud providers provision the DB for you)
    if (process.env.NODE_ENV !== 'production') {
      await ensureDatabaseExists();
      console.log('[server] Database checked/created successfully.');
    }

    // Authenticate Sequelize connection
    await sequelize.authenticate();
    console.log('[server] Database connection established via Sequelize.');

    if (process.env.NODE_ENV === 'production') {
      await assertDatabaseMigrationsCurrent();
      console.log('[server] Database migration status is current.');
    } else {
      const appliedMigrations = await migrateDatabase();
      console.log(`[server] Applied ${appliedMigrations.length} pending database migration(s).`);
    }

    const rateLimitStore = await initializeRateLimitStore();
    process.stdout.write(
      `[server] Authentication rate-limit store ready (${rateLimitStore.shared ? 'shared Redis' : 'process-local development'}).\n`,
    );

    const { default: app } = await import('./app.js');
    const { User } = await import('./models/index.js');
    const { deleteExpiredRefreshSessions } = await import('./repositories/refresh-session.repository.js');
    await deleteExpiredRefreshSessions();

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
      startTelegramDispatchWorker();
    });
  } catch (err) {
    console.error('[server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
