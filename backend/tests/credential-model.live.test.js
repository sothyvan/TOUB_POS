import test from 'node:test';
import assert from 'node:assert/strict';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const OWNER_USERNAME = process.env.TEST_OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || 'owner123';
const PLATFORM_ADMIN_USERNAME = process.env.TEST_PLATFORM_ADMIN_USERNAME || 'platform_admin';
const PLATFORM_ADMIN_PASSWORD = process.env.TEST_PLATFORM_ADMIN_PASSWORD || 'platform123';

function uniqueName(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
}

function expectStatus(result, expectedStatus) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `Expected ${expectedStatus}, got ${result.response.status}: ${JSON.stringify(result.payload)}`
  );
}

function expectNoCredentialFields(value) {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach(expectNoCredentialFields);
    return;
  }

  Object.entries(value).forEach(([key, childValue]) => {
    assert.ok(
      !['password', 'password_hash', 'pin', 'pin_hash'].includes(key),
      `Response must not include credential field "${key}"`
    );
    expectNoCredentialFields(childValue);
  });
}

test('credential model rules are enforced through the live API', async (t) => {
  try {
    await apiRequest('/health');
  } catch (error) {
    throw new Error(
      `Could not reach ${API_BASE_URL}. Start the backend before running npm run test:credentials. Original error: ${error.message}`
    );
  }

  const ownerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: OWNER_USERNAME, password: OWNER_PASSWORD },
  });
  expectStatus(ownerLogin, 200);
  expectNoCredentialFields(ownerLogin.payload);

  const ownerToken = ownerLogin.payload?.data?.token;
  const ownerId = ownerLogin.payload?.data?.user?.id;
  assert.ok(ownerToken, 'Owner login should return a JWT token.');
  assert.ok(ownerId, 'Owner login should return public owner user info.');

  const createdUserIds = [];
  t.after(async () => {
    await Promise.all(
      createdUserIds.map((id) =>
        apiRequest(`/users/${id}`, { method: 'DELETE', token: ownerToken }).catch(() => null)
      )
    );
  });

  const managerUsername = uniqueName('manager_credential_test');
  const managerPassword = 'ManagerPass123!';
  const managerCreate = await apiRequest('/users', {
    method: 'POST',
    token: ownerToken,
    body: { username: managerUsername, role: 'manager', password: managerPassword },
  });
  expectStatus(managerCreate, 201);
  expectNoCredentialFields(managerCreate.payload);
  createdUserIds.push(managerCreate.payload.data.id);

  const cashierUsername = uniqueName('cashier_credential_test');
  const cashierPin = '1357';
  const cashierCreate = await apiRequest('/users', {
    method: 'POST',
    token: ownerToken,
    body: { username: cashierUsername, role: 'cashier', pin: cashierPin },
  });
  expectStatus(cashierCreate, 201);
  expectNoCredentialFields(cashierCreate.payload);
  createdUserIds.push(cashierCreate.payload.data.id);

  const managerWithPin = await apiRequest('/users', {
    method: 'POST',
    token: ownerToken,
    body: {
      username: uniqueName('bad_manager_pin_test'),
      role: 'manager',
      password: 'ManagerPass123!',
      pin: '2468',
    },
  });
  expectStatus(managerWithPin, 400);

  const ownerCreateOwner = await apiRequest('/users', {
    method: 'POST',
    token: ownerToken,
    body: { username: uniqueName('bad_owner_create_owner_test'), role: 'owner', password: 'OwnerPass123!' },
  });
  expectStatus(ownerCreateOwner, 403);

  const platformAdminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: PLATFORM_ADMIN_USERNAME, password: PLATFORM_ADMIN_PASSWORD },
  });

  if (platformAdminLogin.response.status === 200) {
    expectNoCredentialFields(platformAdminLogin.payload);
    const platformAdminToken = platformAdminLogin.payload?.data?.token;
    assert.ok(platformAdminToken, 'Platform admin login should return a JWT token.');

    const platformOwnerList = await apiRequest('/users', { token: platformAdminToken });
    expectStatus(platformOwnerList, 200);
    expectNoCredentialFields(platformOwnerList.payload);

    const platformManagerCreate = await apiRequest('/users', {
      method: 'POST',
      token: platformAdminToken,
      body: { username: uniqueName('bad_platform_manager_test'), role: 'manager', password: 'ManagerPass123!' },
    });
    expectStatus(platformManagerCreate, 403);
  }

  const cashierWithPassword = await apiRequest('/users', {
    method: 'POST',
    token: ownerToken,
    body: {
      username: uniqueName('bad_cashier_password_test'),
      role: 'cashier',
      password: 'NotAllowed123!',
      pin: '9753',
    },
  });
  expectStatus(cashierWithPassword, 400);

  const managerRenamedUsername = uniqueName('manager_credential_updated');
  const managerUpdate = await apiRequest(`/users/${managerCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { username: managerRenamedUsername, role: 'manager', is_active: true },
  });
  expectStatus(managerUpdate, 200);

  const cashierRenamedUsername = uniqueName('cashier_credential_updated');
  const cashierUpdate = await apiRequest(`/users/${cashierCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { username: cashierRenamedUsername, role: 'cashier', is_active: true },
  });
  expectStatus(cashierUpdate, 200);

  const managerLoginAfterBlankPasswordEdit = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: managerRenamedUsername, password: managerPassword },
  });
  expectStatus(managerLoginAfterBlankPasswordEdit, 200);
  expectNoCredentialFields(managerLoginAfterBlankPasswordEdit.payload);

  const cashierPinLogin = await apiRequest('/auth/pin', {
    method: 'POST',
    body: { userId: cashierCreate.payload.data.id, pin: cashierPin },
  });
  expectStatus(cashierPinLogin, 200);
  expectNoCredentialFields(cashierPinLogin.payload);

  const cashierPasswordLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: cashierRenamedUsername, password: cashierPin },
  });
  expectStatus(cashierPasswordLogin, 403);

  const ownerPinLogin = await apiRequest('/auth/pin', {
    method: 'POST',
    body: { userId: ownerId, pin: '1234' },
  });
  expectStatus(ownerPinLogin, 403);

  const usersList = await apiRequest('/users', { token: ownerToken });
  expectStatus(usersList, 200);
  expectNoCredentialFields(usersList.payload);
});
