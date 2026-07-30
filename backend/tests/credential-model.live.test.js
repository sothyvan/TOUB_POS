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

async function apiRequest(path, {
  method = 'GET',
  token,
  deviceToken,
  body,
} = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (deviceToken) {
    headers['x-device-token'] = deviceToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function expectStatus(result, expectedStatus) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `Expected ${expectedStatus}, got ${result.response.status}: ${JSON.stringify(result.payload)}`,
  );
}

function expectNoCredentialFields(value) {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(expectNoCredentialFields);
    return;
  }

  Object.entries(value).forEach(([key, childValue]) => {
    assert.ok(
      !['password', 'password_hash', 'pin', 'pin_hash', 'session_version'].includes(key),
      `Response must not include credential or internal session field "${key}"`,
    );
    expectNoCredentialFields(childValue);
  });
}

test('credential and device-bound PIN rules are enforced through the live API', async (t) => {
  try {
    await apiRequest('/health');
  } catch (error) {
    throw new Error(
      `Could not reach ${API_BASE_URL}. Start the backend before running npm run test:credentials. Original error: ${error.message}`,
      { cause: error },
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
  let createdStallId = null;
  let createdDeviceId = null;
  t.after(async () => {
    if (createdStallId && createdDeviceId) {
      await apiRequest(`/stalls/${createdStallId}/devices/${createdDeviceId}`, {
        method: 'DELETE',
        token: ownerToken,
      }).catch(() => null);
    }
    if (createdStallId) {
      await apiRequest(`/stalls/${createdStallId}`, {
        method: 'DELETE',
        token: ownerToken,
      }).catch(() => null);
    }
    for (const userId of createdUserIds.reverse()) {
      await apiRequest(`/users/${userId}`, {
        method: 'DELETE',
        token: ownerToken,
      }).catch(() => null);
    }
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
    body: {
      username: uniqueName('bad_owner_create_owner_test'),
      role: 'owner',
      password: 'OwnerPass123!',
    },
  });
  expectStatus(ownerCreateOwner, 403);

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

  const managerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: managerRenamedUsername, password: managerPassword },
  });
  expectStatus(managerLogin, 200);
  expectNoCredentialFields(managerLogin.payload);
  const managerToken = managerLogin.payload?.data?.token;
  assert.ok(managerToken, 'Manager login should return a token.');

  const stallCreate = await apiRequest('/stalls', {
    method: 'POST',
    token: ownerToken,
    body: {
      name: uniqueName('credential_test_stall'),
      location: 'Live credential test',
    },
  });
  expectStatus(stallCreate, 201);
  createdStallId = stallCreate.payload.data.id;

  const assignment = await apiRequest(`/stalls/${createdStallId}/staff`, {
    method: 'POST',
    token: ownerToken,
    body: { userId: cashierCreate.payload.data.id },
  });
  expectStatus(assignment, 200);

  const deviceRegistration = await apiRequest(`/stalls/${createdStallId}/register-device`, {
    method: 'POST',
    token: ownerToken,
    body: { device_name: uniqueName('credential_test_terminal') },
  });
  expectStatus(deviceRegistration, 200);
  const deviceToken = deviceRegistration.payload?.data?.device_token;
  createdDeviceId = deviceRegistration.payload?.data?.device?.id;
  assert.ok(deviceToken, 'Device registration should return a raw token once.');

  const cashierPinLogin = await apiRequest('/auth/pin', {
    method: 'POST',
    deviceToken,
    body: { userId: cashierCreate.payload.data.id, pin: cashierPin },
  });
  expectStatus(cashierPinLogin, 200);
  expectNoCredentialFields(cashierPinLogin.payload);
  const cashierToken = cashierPinLogin.payload?.data?.token;
  assert.ok(cashierToken, 'Cashier PIN login should return a token.');

  const cashierPasswordLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: cashierRenamedUsername, password: cashierPin },
  });
  expectStatus(cashierPasswordLogin, 403);

  const ownerPinLogin = await apiRequest('/auth/pin', {
    method: 'POST',
    deviceToken,
    body: { userId: ownerId, pin: '1234' },
  });
  expectStatus(ownerPinLogin, 403);

  const managerOrdersBeforeDeactivation = await apiRequest('/orders', {
    token: managerToken,
  });
  expectStatus(managerOrdersBeforeDeactivation, 200);

  const deactivateManager = await apiRequest(`/users/${managerCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { is_active: false },
  });
  expectStatus(deactivateManager, 200);

  const deactivatedManagerRequest = await apiRequest('/orders', {
    token: managerToken,
  });
  expectStatus(deactivatedManagerRequest, 401);
  assert.equal(deactivatedManagerRequest.payload.code, 'SESSION_INVALIDATED');

  const inactiveManagerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: managerRenamedUsername, password: managerPassword },
  });
  expectStatus(inactiveManagerLogin, 403);

  const reactivateManager = await apiRequest(`/users/${managerCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { is_active: true },
  });
  expectStatus(reactivateManager, 200);

  const staleManagerAfterReactivation = await apiRequest('/orders', {
    token: managerToken,
  });
  expectStatus(staleManagerAfterReactivation, 401);
  assert.equal(staleManagerAfterReactivation.payload.code, 'SESSION_INVALIDATED');

  const reactivatedManagerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: managerRenamedUsername, password: managerPassword },
  });
  expectStatus(reactivatedManagerLogin, 200);
  const reactivatedManagerToken = reactivatedManagerLogin.payload?.data?.token;

  const newManagerPassword = 'ManagerPass456!';
  const changeManagerPassword = await apiRequest(`/users/${managerCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { password: newManagerPassword },
  });
  expectStatus(changeManagerPassword, 200);

  const staleManagerAfterPasswordChange = await apiRequest('/orders', {
    token: reactivatedManagerToken,
  });
  expectStatus(staleManagerAfterPasswordChange, 401);
  assert.equal(staleManagerAfterPasswordChange.payload.code, 'SESSION_INVALIDATED');

  const oldManagerPasswordLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: managerRenamedUsername, password: managerPassword },
  });
  expectStatus(oldManagerPasswordLogin, 401);

  const changedManagerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: managerRenamedUsername, password: newManagerPassword },
  });
  expectStatus(changedManagerLogin, 200);
  const changedManagerToken = changedManagerLogin.payload?.data?.token;

  const deactivateCashier = await apiRequest(`/users/${cashierCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { is_active: false },
  });
  expectStatus(deactivateCashier, 200);

  const deactivatedCashierRequest = await apiRequest('/products', {
    token: cashierToken,
    deviceToken,
  });
  expectStatus(deactivatedCashierRequest, 401);
  assert.equal(deactivatedCashierRequest.payload.code, 'SESSION_INVALIDATED');

  const reactivateCashier = await apiRequest(`/users/${cashierCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { is_active: true },
  });
  expectStatus(reactivateCashier, 200);

  const staleCashierAfterReactivation = await apiRequest('/products', {
    token: cashierToken,
    deviceToken,
  });
  expectStatus(staleCashierAfterReactivation, 401);
  assert.equal(staleCashierAfterReactivation.payload.code, 'SESSION_INVALIDATED');

  const freshCashierLogin = await apiRequest('/auth/pin', {
    method: 'POST',
    deviceToken,
    body: { userId: cashierCreate.payload.data.id, pin: cashierPin },
  });
  expectStatus(freshCashierLogin, 200);
  const freshCashierToken = freshCashierLogin.payload?.data?.token;

  const changeCashierRole = await apiRequest(`/users/${cashierCreate.payload.data.id}`, {
    method: 'PUT',
    token: ownerToken,
    body: { role: 'manager', password: 'RoleChangePass123!' },
  });
  expectStatus(changeCashierRole, 200);

  const staleCashierAfterRoleChange = await apiRequest('/products', {
    token: freshCashierToken,
    deviceToken,
  });
  expectStatus(staleCashierAfterRoleChange, 401);
  assert.equal(staleCashierAfterRoleChange.payload.code, 'SESSION_INVALIDATED');

  const deleteManager = await apiRequest(`/users/${managerCreate.payload.data.id}`, {
    method: 'DELETE',
    token: ownerToken,
  });
  expectStatus(deleteManager, 200);

  const deletedManagerRequest = await apiRequest('/orders', {
    token: changedManagerToken,
  });
  expectStatus(deletedManagerRequest, 401);
  assert.equal(deletedManagerRequest.payload.code, 'SESSION_INVALIDATED');

  const usersList = await apiRequest('/users', { token: ownerToken });
  expectStatus(usersList, 200);
  expectNoCredentialFields(usersList.payload);

  const platformAdminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      username: PLATFORM_ADMIN_USERNAME,
      password: PLATFORM_ADMIN_PASSWORD,
    },
  });
  if (platformAdminLogin.response.status === 200) {
    expectNoCredentialFields(platformAdminLogin.payload);
    const platformAdminToken = platformAdminLogin.payload?.data?.token;
    const platformOwnerList = await apiRequest('/users', { token: platformAdminToken });
    expectStatus(platformOwnerList, 200);
    expectNoCredentialFields(platformOwnerList.payload);
  }
});
