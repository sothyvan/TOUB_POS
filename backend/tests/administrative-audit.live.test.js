import assert from 'node:assert/strict';
import test from 'node:test';
import { AuditLog, sequelize } from '../src/models/index.js';

const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';
const OWNER_USERNAME = process.env.TEST_OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || 'owner123';

async function request(path, { method = 'GET', token, body, requestId } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(requestId ? { 'X-Request-ID': requestId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function expectStatus(result, expected) {
  assert.equal(
    result.response.status,
    expected,
    `Expected ${expected}, received ${result.response.status}: ${JSON.stringify(result.payload)}`,
  );
}

test('privileged category mutations create correlated tenant-scoped audit events', async (t) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const requestIds = [`audit-create-${suffix}`, `audit-update-${suffix}`, `audit-delete-${suffix}`];
  const state = { categoryId: null, token: null };

  t.after(async () => {
    if (state.categoryId && state.token) {
      await request(`/categories/${state.categoryId}`, {
        method: 'DELETE', token: state.token, requestId: `audit-cleanup-${suffix}`,
      }).catch(() => null);
    }
    await AuditLog.destroy({ where: { request_id: [...requestIds, `audit-cleanup-${suffix}`] } });
    await sequelize.close();
  });

  const login = await request('/auth/login', {
    method: 'POST',
    body: { username: OWNER_USERNAME, password: OWNER_PASSWORD },
  });
  expectStatus(login, 200);
  state.token = login.payload?.data?.token;
  const ownerId = login.payload?.data?.user?.id;
  assert.ok(state.token);
  assert.ok(ownerId);

  const created = await request('/categories', {
    method: 'POST', token: state.token, requestId: requestIds[0], body: { name: `Audit ${suffix}`, tone: 'gold' },
  });
  expectStatus(created, 201);
  state.categoryId = created.payload?.data?.id;
  assert.ok(state.categoryId);

  const updated = await request(`/categories/${state.categoryId}`, {
    method: 'PUT', token: state.token, requestId: requestIds[1], body: { tone: 'green' },
  });
  expectStatus(updated, 200);

  const deleted = await request(`/categories/${state.categoryId}`, {
    method: 'DELETE', token: state.token, requestId: requestIds[2], body: {},
  });
  expectStatus(deleted, 200);
  state.categoryId = null;

  const logs = await AuditLog.findAll({
    where: { request_id: requestIds },
    order: [['id', 'ASC']],
  });
  assert.equal(logs.length, 3);
  assert.deepEqual(logs.map((log) => log.action), [
    'category.created', 'category.updated', 'category.deleted',
  ]);
  for (const log of logs) {
    assert.equal(Number(log.owner_id), Number(ownerId));
    assert.equal(log.actor_user_id, ownerId);
    assert.equal(log.target_type, 'category');
    assert.equal(log.target_id, String(created.payload.data.id));
    assert.ok(requestIds.includes(log.request_id));
    assert.doesNotMatch(JSON.stringify(log.details), /password|pin|token|authorization/i);
  }
});
