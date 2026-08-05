const TABLE_NAME = 'stalls';
const GENERATED_COLUMN = 'active_telegram_chat_id';
const INDEX_NAME = 'uq_stalls_active_telegram_chat_id';
const EXPECTED_GENERATION_EXPRESSIONS = new Set([
  'casewhenis_deleted=0thentelegram_chat_idelsenullend',
  'ifis_deleted=0,telegram_chat_id,null',
]);

function indexColumns(index) {
  return (index.fields || []).map((field) => field.attribute || field.name);
}

function isExpectedIndex(index) {
  const columns = indexColumns(index);
  return index.name === INDEX_NAME
    && index.unique === true
    && columns.length === 1
    && columns[0] === GENERATED_COLUMN;
}

function normalizeGenerationExpression(expression) {
  return String(expression ?? '')
    .toLowerCase()
    .replace(/[`\s()]/g, '');
}

function isExpectedGeneratedColumn(column) {
  return /stored generated/i.test(String(column?.extra ?? ''))
    && EXPECTED_GENERATION_EXPRESSIONS.has(
      normalizeGenerationExpression(column?.generation_expression),
    );
}

export async function up({ context }) {
  const { queryInterface, sequelize } = context;
  const [duplicates] = await sequelize.query(`
    SELECT telegram_chat_id, COUNT(*) AS stall_count
    FROM stalls
    WHERE is_deleted = 0
      AND telegram_chat_id IS NOT NULL
    GROUP BY telegram_chat_id
    HAVING COUNT(*) > 1
    LIMIT 1
  `);
  if (duplicates.length > 0) {
    const duplicate = duplicates[0];
    throw new Error(
      `Cannot enforce unique Telegram kitchen chats: chat ${duplicate.telegram_chat_id} belongs to ${duplicate.stall_count} non-deleted Stalls. Disconnect or delete the duplicate routing before retrying the migration.`,
    );
  }

  const columns = await queryInterface.describeTable(TABLE_NAME);
  if (!columns[GENERATED_COLUMN]) {
    await sequelize.query(`
      ALTER TABLE \`stalls\`
      ADD COLUMN \`${GENERATED_COLUMN}\` BIGINT
      GENERATED ALWAYS AS (
        CASE WHEN \`is_deleted\` = 0 THEN \`telegram_chat_id\` ELSE NULL END
      ) STORED
    `);
  } else {
    const [generatedColumns] = await sequelize.query(`
      SELECT
        EXTRA AS extra,
        GENERATION_EXPRESSION AS generation_expression
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${TABLE_NAME}'
        AND COLUMN_NAME = '${GENERATED_COLUMN}'
      LIMIT 1
    `);
    if (generatedColumns.length !== 1 || !isExpectedGeneratedColumn(generatedColumns[0])) {
      throw new Error(
        `Cannot enforce unique Telegram kitchen chats: column ${GENERATED_COLUMN} exists with an unexpected definition.`,
      );
    }
  }

  const indexes = await queryInterface.showIndex(TABLE_NAME);
  const namedIndex = indexes.find((index) => index.name === INDEX_NAME);
  if (namedIndex && !isExpectedIndex(namedIndex)) {
    throw new Error(
      `Cannot enforce unique Telegram kitchen chats: index ${INDEX_NAME} exists with an unexpected definition.`,
    );
  }
  if (!namedIndex) {
    await queryInterface.addIndex(TABLE_NAME, [GENERATED_COLUMN], {
      name: INDEX_NAME,
      unique: true,
    });
  }
}

export async function down({ context }) {
  const { queryInterface } = context;
  const indexes = await queryInterface.showIndex(TABLE_NAME);
  if (indexes.some((index) => index.name === INDEX_NAME)) {
    await queryInterface.removeIndex(TABLE_NAME, INDEX_NAME);
  }

  const columns = await queryInterface.describeTable(TABLE_NAME);
  if (columns[GENERATED_COLUMN]) {
    await queryInterface.removeColumn(TABLE_NAME, GENERATED_COLUMN);
  }
}

export const telegramChatUniquenessConstraint = {
  columnName: GENERATED_COLUMN,
  indexName: INDEX_NAME,
  isExpectedGeneratedColumn,
  isExpectedIndex,
};
