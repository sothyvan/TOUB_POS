import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const OWNER_USERNAME = process.env.TEST_OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || 'owner123';

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

async function cleanupTestData(ids) {
  const {
    sequelize,
    AuditLog,
    Category,
    Order,
    OrderItem,
    Product,
    ProductStall,
    Stall,
    StallDevice,
    StallStaff,
    TelegramTicket,
    User,
  } = await import('../src/models/index.js');

  try {
    if (ids.orderIds.length > 0) {
      await TelegramTicket.destroy({ where: { order_id: ids.orderIds } });
      await AuditLog.destroy({ where: { order_id: ids.orderIds } });
      await OrderItem.destroy({ where: { order_id: ids.orderIds } });
      await Order.destroy({ where: { id: ids.orderIds } });
    }
    if (ids.productIds.length > 0) {
      await ProductStall.destroy({ where: { product_id: ids.productIds } });
      await Product.destroy({ where: { id: ids.productIds }, force: true });
    }
    if (ids.stallIds.length > 0) {
      await StallDevice.destroy({ where: { stall_id: ids.stallIds } });
      await StallStaff.destroy({ where: { stall_id: ids.stallIds } });
      await Stall.destroy({ where: { id: ids.stallIds }, force: true });
    }
    if (ids.categoryId) {
      await Category.destroy({ where: { id: ids.categoryId }, force: true });
    }
    if (ids.userId) {
      await AuditLog.destroy({ where: { actor_user_id: ids.userId } });
      await User.destroy({ where: { id: ids.userId }, force: true });
    }
  } finally {
    await sequelize.close();
  }
}

test('live order flow enforces trusted totals, stall scope, cash rules, and RBAC', async (t) => {
  try {
    await apiRequest('/health');
  } catch (error) {
    throw new Error(
      `Could not reach ${API_BASE_URL}. Start the backend before running npm run test:orders. Original error: ${error.message}`,
      { cause: error },
    );
  }

  const ids = {
    userId: null,
    categoryId: null,
    stallIds: [],
    productIds: [],
    orderIds: [],
  };
  t.after(() => cleanupTestData(ids));

  const ownerLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username: OWNER_USERNAME, password: OWNER_PASSWORD },
  });
  expectStatus(ownerLogin, 200);
  const ownerToken = ownerLogin.payload?.data?.token;
  assert.ok(ownerToken, 'Owner login should return a token.');

  const cashierPin = '8642';
  const cashierCreate = await apiRequest('/users', {
    method: 'POST',
    token: ownerToken,
    body: {
      username: uniqueName('order_test_cashier'),
      role: 'cashier',
      pin: cashierPin,
    },
  });
  expectStatus(cashierCreate, 201);
  ids.userId = cashierCreate.payload.data.id;

  for (const label of ['A', 'B']) {
    const stallCreate = await apiRequest('/stalls', {
      method: 'POST',
      token: ownerToken,
      body: {
        name: uniqueName(`order_test_stall_${label}`),
        location: `Order test ${label}`,
      },
    });
    expectStatus(stallCreate, 201);
    ids.stallIds.push(stallCreate.payload.data.id);
  }
  const [stallAId, stallBId] = ids.stallIds;

  const categoryCreate = await apiRequest('/categories', {
    method: 'POST',
    token: ownerToken,
    body: { name: uniqueName('order_test_category'), tone: 'gold' },
  });
  expectStatus(categoryCreate, 201);
  ids.categoryId = categoryCreate.payload.data.id;

  const productDefinitions = [
    {
      name: uniqueName('order_test_visible'),
      stall_ids: [stallAId],
      is_visible: true,
      price_usd: 2.75,
      price_khr: 11000,
    },
    {
      name: uniqueName('order_test_hidden'),
      stall_ids: [stallAId],
      is_visible: false,
      price_usd: 1.5,
      price_khr: 6000,
    },
    {
      name: uniqueName('order_test_other_stall'),
      stall_ids: [stallBId],
      is_visible: true,
      price_usd: 9,
      price_khr: 36000,
    },
  ];
  for (const definition of productDefinitions) {
    const productCreate = await apiRequest('/products', {
      method: 'POST',
      token: ownerToken,
      body: {
        ...definition,
        category_id: ids.categoryId,
      },
    });
    expectStatus(productCreate, 201);
    ids.productIds.push(productCreate.payload.data.id);
  }
  const [visibleProductId, hiddenProductId, otherStallProductId] = ids.productIds;

  const assignment = await apiRequest(`/stalls/${stallAId}/staff`, {
    method: 'POST',
    token: ownerToken,
    body: { userId: ids.userId },
  });
  expectStatus(assignment, 200);

  const deviceRegistration = await apiRequest(`/stalls/${stallAId}/register-device`, {
    method: 'POST',
    token: ownerToken,
    body: { device_name: uniqueName('order_test_terminal') },
  });
  expectStatus(deviceRegistration, 200);
  const deviceToken = deviceRegistration.payload?.data?.device_token;
  assert.ok(deviceToken, 'Device registration should return its token once.');

  const cashierLogin = await apiRequest('/auth/pin', {
    method: 'POST',
    deviceToken,
    body: { userId: ids.userId, pin: cashierPin },
  });
  expectStatus(cashierLogin, 200);
  const cashierToken = cashierLogin.payload?.data?.token;
  assert.ok(cashierToken, 'Cashier PIN login should return a token.');

  for (const path of ['/users', '/stalls', '/orders']) {
    const forbidden = await apiRequest(path, {
      token: cashierToken,
      deviceToken,
    });
    expectStatus(forbidden, 403);
  }

  const trustedTopLevel = await apiRequest('/orders', {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: {
      items: [{ product_id: visibleProductId, quantity: 1 }],
      paymentMethod: 'cash',
      total_usd: 0.01,
    },
  });
  expectStatus(trustedTopLevel, 400);

  const trustedItemPrice = await apiRequest('/orders', {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: {
      items: [{ product_id: visibleProductId, quantity: 1, price_usd: 0.01 }],
      paymentMethod: 'cash',
    },
  });
  expectStatus(trustedItemPrice, 400);

  const invalidQuantity = await apiRequest('/orders', {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: {
      items: [{ product_id: visibleProductId, quantity: 0 }],
      paymentMethod: 'cash',
    },
  });
  expectStatus(invalidQuantity, 400);

  const hiddenProduct = await apiRequest('/orders', {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: {
      items: [{ product_id: hiddenProductId, quantity: 1 }],
      paymentMethod: 'cash',
    },
  });
  expectStatus(hiddenProduct, 400);

  const otherStallProduct = await apiRequest('/orders', {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: {
      items: [{ product_id: otherStallProductId, quantity: 1 }],
      paymentMethod: 'cash',
    },
  });
  expectStatus(otherStallProduct, 404);

  const orderCreate = await apiRequest('/orders', {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: {
      items: [{
        product_id: visibleProductId,
        quantity: 2,
        notes: 'Less sugar',
      }],
      paymentMethod: 'cash',
    },
  });
  expectStatus(orderCreate, 201);
  const order = orderCreate.payload.data;
  ids.orderIds.push(order.id);
  assert.equal(Number(order.total_usd), 5.5);
  assert.equal(Number(order.subtotal_usd), 5.5);
  assert.equal(order.status, 'pending_payment');
  assert.equal(order.cashier_id, ids.userId);
  assert.equal(order.stall_id, stallAId);
  assert.equal(order.Items[0].name, productDefinitions[0].name);
  assert.equal(Number(order.Items[0].price_usd), 2.75);
  assert.equal(order.Items[0].notes, 'Less sugar');

  const underpayment = await apiRequest(`/orders/${order.id}/confirm-cash`, {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: { cash_received_usd: 5 },
  });
  expectStatus(underpayment, 400);

  const confirmation = await apiRequest(`/orders/${order.id}/confirm-cash`, {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: { cash_received_usd: 6 },
  });
  expectStatus(confirmation, 200);
  assert.equal(confirmation.payload.data.status, 'paid');
  assert.equal(Number(confirmation.payload.data.cash_received_usd), 6);
  assert.equal(Number(confirmation.payload.data.change_due_usd), 0.5);
  assert.ok(confirmation.payload.data.completed_at);

  const duplicateConfirmation = await apiRequest(`/orders/${order.id}/confirm-cash`, {
    method: 'POST',
    token: cashierToken,
    deviceToken,
    body: { cash_received_usd: 6 },
  });
  expectStatus(duplicateConfirmation, 409);

  const cashierOrders = await apiRequest('/orders/mine', {
    token: cashierToken,
    deviceToken,
  });
  expectStatus(cashierOrders, 200);
  assert.ok(
    cashierOrders.payload.data.some((candidate) => candidate.id === order.id),
    'Cashier order history should contain the created order.',
  );

  const ownerOrders = await apiRequest('/orders', { token: ownerToken });
  expectStatus(ownerOrders, 200);
  assert.ok(
    ownerOrders.payload.data.some((candidate) => candidate.id === order.id),
    'Owner order history should contain the same-business order.',
  );
});
