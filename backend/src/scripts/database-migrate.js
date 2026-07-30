import 'dotenv/config';
import { ensureDatabaseExists } from '../config/db.js';
import sequelize from '../config/db.js';
import {
  getDatabaseMigrationStatus,
  migrateDatabase,
  migrator,
} from '../database/migrator.js';

const command = process.argv[2] || 'up';

function printMigrationList(label, migrations) {
  process.stdout.write(`${label}: ${migrations.length}\n`);
  for (const migration of migrations) {
    process.stdout.write(`- ${migration}\n`);
  }
}

async function connect() {
  if (process.env.NODE_ENV !== 'production') {
    await ensureDatabaseExists();
  }
  await sequelize.authenticate();
}

async function run() {
  await connect();

  if (command === 'up') {
    const migrations = await migrateDatabase();
    printMigrationList('Applied migrations', migrations.map((migration) => migration.name));
    return;
  }

  if (command === 'status') {
    const status = await getDatabaseMigrationStatus();
    printMigrationList('Executed migrations', status.executed);
    printMigrationList('Pending migrations', status.pending);
    return;
  }

  if (command === 'down') {
    if (String(process.env.ALLOW_MIGRATION_ROLLBACK || '').toLowerCase() !== 'true') {
      throw new Error(
        'Rollback is disabled. Back up the database, then set ALLOW_MIGRATION_ROLLBACK=true for this command.',
      );
    }
    const migrations = await migrator.down({ step: 1 });
    printMigrationList('Reverted migrations', migrations.map((migration) => migration.name));
    return;
  }

  throw new Error(`Unknown database migration command: ${command}`);
}

run()
  .catch((error) => {
    process.stderr.write(`[database-migration] ${error.stack || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
