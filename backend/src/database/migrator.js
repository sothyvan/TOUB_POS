import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SequelizeStorage, Umzug } from 'umzug';
import sequelize from '../config/db.js';

const migrationsDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

function resolveEsmMigration({ name, path: migrationPath, context }) {
  if (!migrationPath) {
    throw new Error(`Migration ${name} does not have a file path.`);
  }

  const loadMigration = () => import(pathToFileURL(migrationPath).href);
  return {
    name,
    path: migrationPath,
    up: async () => {
      const migration = await loadMigration();
      return migration.up({ name, path: migrationPath, context });
    },
    down: async () => {
      const migration = await loadMigration();
      if (typeof migration.down !== 'function') {
        throw new Error(`Migration ${name} does not define down().`);
      }
      return migration.down({ name, path: migrationPath, context });
    },
  };
}

export const migrator = new Umzug({
  migrations: {
    glob: ['[0-9]*.js', { cwd: migrationsDirectory }],
    resolve: resolveEsmMigration,
  },
  context: {
    sequelize,
    queryInterface: sequelize.getQueryInterface(),
  },
  storage: new SequelizeStorage({
    sequelize,
    tableName: 'schema_migrations',
    modelName: 'SchemaMigration',
    columnName: 'name',
  }),
  logger: undefined,
});

export function migrateDatabase() {
  return migrator.up();
}

export async function assertDatabaseMigrationsCurrent() {
  const tables = (await sequelize.getQueryInterface().showAllTables())
    .map((table) => (typeof table === 'string' ? table : table.tableName));
  if (!tables.includes('schema_migrations')) {
    throw new Error(
      'Database migration ledger is missing. Run "npm run db:migrate" before starting production.',
    );
  }

  const pending = await migrator.pending();
  if (pending.length === 0) {
    return;
  }

  const names = pending.map((migration) => migration.name).join(', ');
  throw new Error(
    `Database has pending migrations: ${names}. Run "npm run db:migrate" before starting production.`,
  );
}

export async function getDatabaseMigrationStatus() {
  const [executed, pending] = await Promise.all([
    migrator.executed(),
    migrator.pending(),
  ]);
  return {
    executed: executed.map((migration) => migration.name),
    pending: pending.map((migration) => migration.name),
  };
}
