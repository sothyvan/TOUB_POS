import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIT_ACTIONS,
  resolveAuditOwnerId,
  sanitizeAuditDetails,
  writeAdministrativeAudit,
} from '../src/services/audit.service.js';
import { up as expandAuditLogs } from '../src/database/migrations/202607310004-expand-administrative-audit-logs.js';

test('administrative audit catalog uses unique stable action names', () => {
  const actions = Object.values(AUDIT_ACTIONS);
  assert.equal(actions.length, 20);
  assert.equal(new Set(actions).size, actions.length);
  assert.ok(actions.every((action) => /^[a-z_]+\.[a-z_]+$/.test(action)));
});

test('audit owner scope resolves owners and subordinate management actors', () => {
  assert.equal(resolveAuditOwnerId({ id: 4, role: 'owner' }), 4);
  assert.equal(resolveAuditOwnerId({ id: 9, role: 'manager', owner_id: 4 }), 4);
  assert.equal(resolveAuditOwnerId({ id: 1, role: 'platform_admin' }, 12), 12);
  assert.equal(resolveAuditOwnerId({ id: 1, role: 'platform_admin' }), null);
});

test('audit details remove secrets and raw protected identifiers recursively', () => {
  const safe = sanitizeAuditDetails({
    username: 'cashier-a',
    password: 'never-store-me',
    nested: {
      pin: '1234',
      authorization: 'Bearer jwt',
      device_token: 'raw-device-token',
      telegram_user_id: '123456789',
      display_name: 'Kitchen Cook',
    },
  });

  assert.deepEqual(safe, {
    username: 'cashier-a',
    nested: { display_name: 'Kitchen Cook' },
  });
});

test('audit detail sanitizer bounds strings and handles circular metadata', () => {
  const circular = { label: 'x'.repeat(600) };
  circular.self = circular;
  const safe = sanitizeAuditDetails(circular);
  assert.equal(safe.label.length, 500);
  assert.equal(safe.self, '[CIRCULAR]');
});

test('administrative audit writer persists only scoped sanitized fields', async () => {
  let captured;
  const transaction = { id: 'test-transaction' };
  await writeAdministrativeAudit({
    actor: { id: 9, role: 'manager', owner_id: 4 },
    action: AUDIT_ACTIONS.USER_UPDATED,
    targetType: 'user',
    targetId: 12,
    requestId: 'request-123',
    after: { username: 'cashier-a', pin: '1234' },
    transaction,
    auditModel: {
      create: (values, options) => {
        captured = { values, options };
        return Promise.resolve(values);
      },
    },
  });

  assert.equal(captured.values.owner_id, 4);
  assert.equal(captured.values.actor_user_id, 9);
  assert.equal(captured.values.target_id, '12');
  assert.deepEqual(captured.values.details, { after: { username: 'cashier-a' } });
  assert.equal(captured.options.transaction, transaction);
});

test('administrative audit writer rejects unscoped or unknown events', () => {
  assert.throws(
    () => writeAdministrativeAudit({
      actor: { id: 1, role: 'platform_admin' },
      action: AUDIT_ACTIONS.USER_CREATED,
      targetType: 'user',
      targetId: 2,
    }),
    /requires an owner scope/,
  );
  assert.throws(
    () => writeAdministrativeAudit({
      actor: { id: 4, role: 'owner' },
      action: 'arbitrary.action',
      targetType: 'user',
      targetId: 2,
    }),
    /Unsupported administrative audit action/,
  );
});

test('audit migration expands legacy rows and adds investigation indexes', async () => {
  const calls = [];
  const queryInterface = {
    describeTable: () => Promise.resolve({ id: {}, action: {} }),
    changeColumn: (...args) => calls.push(['changeColumn', ...args]),
    addColumn: (...args) => calls.push(['addColumn', ...args]),
    showIndex: () => Promise.resolve([]),
    addIndex: (...args) => calls.push(['addIndex', ...args]),
  };
  const sequelize = {
    query: (sql) => calls.push(['query', sql]),
  };

  await expandAuditLogs({ context: { queryInterface, sequelize } });

  assert.equal(calls.filter(([name]) => name === 'addColumn').length, 4);
  assert.equal(calls.filter(([name]) => name === 'addIndex').length, 3);
  assert.equal(calls.filter(([name]) => name === 'query').length, 2);
  assert.ok(calls.some(([name, table, column]) => (
    name === 'changeColumn' && table === 'audit_logs' && column === 'action'
  )));
});
