/**
 * DEVELOPMENT MIGRATION SERVICE
 * 
 * Why this file exists:
 * In local development, the application uses `sequelize.sync({ alter: true })` to automatically
 * keep the database schema in sync with changes in Sequelize models.
 * 
 * However, MySQL will throw errors (like "Data truncated for column...") if you attempt to alter
 * constraints (e.g. shrinking ENUMs, adding NOT NULL fields) on tables that already contain legacy data
 * violating those rules (such as old 'admin' user roles, legacy order statuses, or products with NULL categories).
 * 
 * This service runs raw SQL queries *prior* to `sequelize.sync()` to clean up, backfill, or modify
 * existing data so the schema alteration can complete successfully.
 * 
 * NOTE:
 * - This service only runs when NODE_ENV is 'development' (see `runDevelopmentMigrations`).
 * - If you prefer a cleaner setup, you can drop your local database and let Sequelize recreate it empty,
 *   which bypasses the need for these migrations altogether.
 */

async function migrateLegacyAdminRoles(sequelize) {
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
    // eslint-disable-next-line no-console
    console.log(`[migration] Migrated ${metadata.affectedRows} legacy admin user role(s) to owner.`);
  }
}

async function migrateLegacyOrderStatuses(sequelize) {
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
    // eslint-disable-next-line no-console
    console.log(`[migration] Migrated ${migratedCount} legacy order status value(s).`);
  }
}

async function columnExists(sequelize, tableName, columnName) {
  const [columns] = await sequelize.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1;
    `,
    { replacements: [tableName, columnName] }
  );

  return columns.length > 0;
}

async function migrateLegacyProductCategories(sequelize) {
  const [productTables] = await sequelize.query("SHOW TABLES LIKE 'products';");
  if (productTables.length === 0) {
    return;
  }

  const [categoryTables] = await sequelize.query("SHOW TABLES LIKE 'categories';");
  if (categoryTables.length === 0) {
    return;
  }

  const [categoryRows] = await sequelize.query(
    'SELECT `id` FROM `categories` ORDER BY `id` ASC LIMIT 1;'
  );

  let fallbackCategoryId = categoryRows[0]?.id;
  if (!fallbackCategoryId) {
    const [, metadata] = await sequelize.query(
      "INSERT INTO `categories` (`name`, `tone`, `created_at`, `updated_at`) VALUES ('Uncategorized', 'gold', NOW(), NOW());"
    );
    fallbackCategoryId = metadata?.insertId;
  }

  if (!fallbackCategoryId) {
    throw new Error('Unable to create a fallback category for legacy products.');
  }

  const hasCategoryId = await columnExists(sequelize, 'products', 'category_id');
  if (!hasCategoryId) {
    await sequelize.query('ALTER TABLE `products` ADD COLUMN `category_id` INT NULL;');
  }

  const [, metadata] = await sequelize.query(
    `
      UPDATE \`products\` p
      LEFT JOIN \`categories\` c ON c.\`id\` = p.\`category_id\`
      SET p.\`category_id\` = ?
      WHERE p.\`category_id\` IS NULL
         OR c.\`id\` IS NULL;
    `,
    { replacements: [fallbackCategoryId] }
  );

  await sequelize.query('ALTER TABLE `products` MODIFY `category_id` INT NOT NULL;');

  if (metadata?.affectedRows > 0 || !hasCategoryId) {
    // eslint-disable-next-line no-console
    console.log(`[migration] Migrated legacy product category references using category #${fallbackCategoryId}.`);
  }
}

async function dropDuplicateUniqueIndexes(sequelize, tableName, columnName) {
  const [indexes] = await sequelize.query(
    `
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
        AND NON_UNIQUE = 0
        AND INDEX_NAME <> 'PRIMARY'
      GROUP BY INDEX_NAME
      ORDER BY INDEX_NAME ASC;
    `,
    { replacements: [tableName, columnName] }
  );

  if (indexes.length <= 1) {
    return;
  }

  const duplicateIndexes = indexes.slice(1).map((index) => index.INDEX_NAME);
  for (const indexName of duplicateIndexes) {
    await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\`;`);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[migration] Removed ${duplicateIndexes.length} duplicate unique index(es) from ${tableName}.${columnName}.`
  );
}

async function cleanDevelopmentDuplicateIndexes(sequelize) {
  const [stallTables] = await sequelize.query("SHOW TABLES LIKE 'stalls';");
  if (stallTables.length > 0) {
    await dropDuplicateUniqueIndexes(sequelize, 'stalls', 'device_token');
  }
}

export async function runDevelopmentMigrations(sequelize) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  await migrateLegacyAdminRoles(sequelize);
  await migrateLegacyOrderStatuses(sequelize);
  await migrateLegacyProductCategories(sequelize);
  await cleanDevelopmentDuplicateIndexes(sequelize);
}
