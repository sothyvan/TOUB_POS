import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignmentConstraint,
  down,
  up,
} from '../src/database/migrations/202607310005-enforce-one-stall-per-cashier.js';

function index(name, { unique = false, columns = [] } = {}) {
  return {
    name,
    unique,
    fields: columns.map((attribute) => ({ attribute })),
  };
}

test('assignment constraint recognizes only a single-column unique user index', () => {
  assert.equal(assignmentConstraint.hasUniqueUserIndex([
    index('pair', { unique: true, columns: ['stall_id', 'user_id'] }),
  ]), false);
  assert.equal(assignmentConstraint.hasUniqueUserIndex([
    index('user', { unique: true, columns: ['user_id'] }),
  ]), true);
});

test('assignment migration adds the invariant when an enrolled schema lacks it', async () => {
  const added = [];
  await up({
    context: {
      sequelize: { query: () => Promise.resolve([[]]) },
      queryInterface: {
        showIndex: () => Promise.resolve([index('PRIMARY', { unique: true, columns: ['id'] })]),
        addIndex: (...args) => added.push(args),
      },
    },
  });

  assert.equal(added.length, 1);
  assert.deepEqual(added[0][1], ['user_id']);
  assert.equal(added[0][2].unique, true);
  assert.equal(added[0][2].name, assignmentConstraint.indexName);
});

test('assignment migration preserves an equivalent existing unique index', async () => {
  let addCalls = 0;
  await up({
    context: {
      sequelize: { query: () => Promise.resolve([[]]) },
      queryInterface: {
        showIndex: () => Promise.resolve([
          index('uq_stall_staff_user', { unique: true, columns: ['user_id'] }),
        ]),
        addIndex: () => { addCalls += 1; },
      },
    },
  });
  assert.equal(addCalls, 0);
});

test('assignment migration fails safely instead of deleting duplicate assignments', async () => {
  await assert.rejects(
    up({
      context: {
        sequelize: { query: () => Promise.resolve([[{ user_id: 17, assignment_count: 2 }]]) },
        queryInterface: {},
      },
    }),
    /user 17 has multiple assignments/,
  );
});

test('assignment rollback removes only the index created by the forward migration', async () => {
  const removed = [];
  await down({
    context: {
      queryInterface: {
        showIndex: () => Promise.resolve([
          index(assignmentConstraint.indexName, { unique: true, columns: ['user_id'] }),
        ]),
        removeIndex: (...args) => removed.push(args),
      },
    },
  });
  assert.deepEqual(removed, [['stall_staff', assignmentConstraint.indexName]]);
});

