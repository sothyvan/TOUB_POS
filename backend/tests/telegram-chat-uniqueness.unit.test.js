import assert from 'node:assert/strict';
import test from 'node:test';
import {
  down,
  telegramChatUniquenessConstraint,
  up,
} from '../src/database/migrations/202608050001-enforce-unique-active-telegram-chat.js';

function index(name, { unique = false, columns = [] } = {}) {
  return {
    name,
    unique,
    fields: columns.map((attribute) => ({ attribute })),
  };
}

test('Telegram chat uniqueness migration refuses ambiguous non-deleted Stall data', async () => {
  await assert.rejects(
    up({
      context: {
        sequelize: {
          query: () => Promise.resolve([[
            { telegram_chat_id: '-1001234567890', stall_count: 2 },
          ]]),
        },
        queryInterface: {},
      },
    }),
    /Cannot enforce unique Telegram kitchen chats.*2 non-deleted Stalls/i,
  );
});

test('Telegram chat uniqueness migration adds a generated active-chat column and unique index', async () => {
  const sqlCalls = [];
  const addedIndexes = [];
  const queryInterface = {
    describeTable: () => Promise.resolve({ id: {}, telegram_chat_id: {}, is_deleted: {} }),
    showIndex: () => Promise.resolve([
      index('PRIMARY', { unique: true, columns: ['id'] }),
    ]),
    addIndex: (...args) => {
      addedIndexes.push(args);
      return Promise.resolve();
    },
  };
  const sequelize = {
    query: (sql) => {
      sqlCalls.push(sql);
      return /^\s*SELECT/i.test(sql) ? Promise.resolve([[]]) : Promise.resolve();
    },
  };

  await up({ context: { queryInterface, sequelize } });

  assert.equal(sqlCalls.length, 2);
  assert.match(sqlCalls[1], /GENERATED ALWAYS AS/i);
  assert.match(sqlCalls[1], /CASE WHEN `is_deleted` = 0 THEN `telegram_chat_id` ELSE NULL END/i);
  assert.deepEqual(addedIndexes, [[
    'stalls',
    [telegramChatUniquenessConstraint.columnName],
    {
      name: telegramChatUniquenessConstraint.indexName,
      unique: true,
    },
  ]]);
});

test('Telegram chat uniqueness migration is idempotent when the column and index exist', async () => {
  let alterCalls = 0;
  let addIndexCalls = 0;
  const queryInterface = {
    describeTable: () => Promise.resolve({
      id: {},
      [telegramChatUniquenessConstraint.columnName]: {},
    }),
    showIndex: () => Promise.resolve([
      index(telegramChatUniquenessConstraint.indexName, {
        unique: true,
        columns: [telegramChatUniquenessConstraint.columnName],
      }),
    ]),
    addIndex: () => {
      addIndexCalls += 1;
      return Promise.resolve();
    },
  };
  const sequelize = {
    query: (sql) => {
      if (/^\s*ALTER/i.test(sql)) {
        alterCalls += 1;
      }
      if (/INFORMATION_SCHEMA\.COLUMNS/i.test(sql)) {
        return Promise.resolve([[
          {
            extra: 'STORED GENERATED',
            generation_expression: 'if((`is_deleted` = 0),`telegram_chat_id`,NULL)',
          },
        ]]);
      }
      return Promise.resolve([[]]);
    },
  };

  await up({ context: { queryInterface, sequelize } });

  assert.equal(alterCalls, 0);
  assert.equal(addIndexCalls, 0);
});

test('Telegram chat uniqueness migration rejects a same-named column with the wrong definition', async () => {
  const queryInterface = {
    describeTable: () => Promise.resolve({
      id: {},
      [telegramChatUniquenessConstraint.columnName]: {},
    }),
    showIndex: () => Promise.resolve([
      index(telegramChatUniquenessConstraint.indexName, {
        unique: true,
        columns: [telegramChatUniquenessConstraint.columnName],
      }),
    ]),
  };
  const sequelize = {
    query: (sql) => {
      if (/INFORMATION_SCHEMA\.COLUMNS/i.test(sql)) {
        return Promise.resolve([[
          { extra: '', generation_expression: '`telegram_chat_id`' },
        ]]);
      }
      return Promise.resolve([[]]);
    },
  };

  await assert.rejects(
    up({ context: { queryInterface, sequelize } }),
    /column active_telegram_chat_id exists with an unexpected definition/i,
  );
});

test('Telegram chat uniqueness rollback removes its index before its generated column', async () => {
  const calls = [];
  const queryInterface = {
    describeTable: () => Promise.resolve({
      id: {},
      [telegramChatUniquenessConstraint.columnName]: {},
    }),
    showIndex: () => Promise.resolve([
      index(telegramChatUniquenessConstraint.indexName, {
        unique: true,
        columns: [telegramChatUniquenessConstraint.columnName],
      }),
    ]),
    removeIndex: (...args) => {
      calls.push(['removeIndex', ...args]);
      return Promise.resolve();
    },
    removeColumn: (...args) => {
      calls.push(['removeColumn', ...args]);
      return Promise.resolve();
    },
  };

  await down({ context: { queryInterface } });

  assert.deepEqual(calls, [
    ['removeIndex', 'stalls', telegramChatUniquenessConstraint.indexName],
    ['removeColumn', 'stalls', telegramChatUniquenessConstraint.columnName],
  ]);
});
