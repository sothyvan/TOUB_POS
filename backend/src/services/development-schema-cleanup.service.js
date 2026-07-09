const UNIQUE_INDEX_CLEANUPS = [
  {
    tableName: 'orders',
    columnName: 'payment_reference',
    indexName: 'uq_orders_payment_reference',
  },
  {
    tableName: 'stalls',
    columnName: 'device_token',
    indexName: 'uq_stalls_device_token',
  },
];

function quoteIdentifier(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `\`${value}\``;
}

async function hasTableColumn(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND COLUMN_NAME = :columnName`,
    {
      replacements: { tableName, columnName },
    }
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function getUniqueIndexesForColumn(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND COLUMN_NAME = :columnName
       AND NON_UNIQUE = 0
       AND INDEX_NAME <> 'PRIMARY'
     GROUP BY INDEX_NAME
     ORDER BY INDEX_NAME`,
    {
      replacements: { tableName, columnName },
    }
  );

  return rows.map((row) => row.INDEX_NAME);
}

async function ensureSingleUniqueIndex(sequelize, {
  tableName,
  columnName,
  indexName,
}) {
  const columnExists = await hasTableColumn(sequelize, tableName, columnName);
  if (!columnExists) {
    return;
  }

  const uniqueIndexNames = await getUniqueIndexesForColumn(sequelize, tableName, columnName);

  for (const existingName of uniqueIndexNames) {
    if (existingName !== indexName) {
      await sequelize.query(
        `ALTER TABLE ${quoteIdentifier(tableName)} DROP INDEX ${quoteIdentifier(existingName)}`
      );
    }
  }

  if (!uniqueIndexNames.includes(indexName)) {
    await sequelize.query(
      `ALTER TABLE ${quoteIdentifier(tableName)}
       ADD UNIQUE INDEX ${quoteIdentifier(indexName)} (${quoteIdentifier(columnName)})`
    );
  }
}

export async function cleanupDevelopmentDuplicateUniqueIndexes(sequelize) {
  for (const cleanup of UNIQUE_INDEX_CLEANUPS) {
    await ensureSingleUniqueIndex(sequelize, cleanup);
  }
}
