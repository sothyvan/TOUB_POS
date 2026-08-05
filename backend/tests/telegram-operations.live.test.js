import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import {
  Order,
  Stall,
  TelegramDispatchJob,
  TelegramTicket,
  User,
  sequelize,
} from '../src/models/index.js';

const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, payload: await response.json().catch(() => null) };
}

test('Telegram operations endpoint is tenant-scoped and redacts provider diagnostics', async (t) => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const password = `Ops-${suffix}-pass`;
  const state = { userIds: [], stallIds: [], orderIds: [] };

  t.after(async () => {
    if (state.orderIds.length > 0) {
      await TelegramTicket.destroy({ where: { order_id: { [Op.in]: state.orderIds } } });
      await TelegramDispatchJob.destroy({ where: { order_id: { [Op.in]: state.orderIds } } });
      await Order.destroy({ where: { id: { [Op.in]: state.orderIds } }, force: true });
    }
    if (state.stallIds.length > 0) {
      await Stall.destroy({ where: { id: { [Op.in]: state.stallIds } }, force: true });
    }
    if (state.userIds.length > 0) {
      await User.destroy({ where: { id: { [Op.in]: state.userIds } }, force: true });
    }
    await sequelize.close();
  });

  const passwordHash = await bcrypt.hash(password, 4);
  const owners = await User.bulkCreate([
    {
      username: `telegram_ops_a_${suffix}`,
      password: passwordHash,
      role: 'owner',
      owner_id: null,
      is_active: true,
      is_deleted: false,
    },
    {
      username: `telegram_ops_b_${suffix}`,
      password: passwordHash,
      role: 'owner',
      owner_id: null,
      is_active: true,
      is_deleted: false,
    },
  ]);
  state.userIds.push(...owners.map((owner) => owner.id));
  const [ownerA, ownerB] = owners;

  const stalls = await Stall.bulkCreate([
    { owner_id: ownerA.id, name: `Operations A ${suffix}`, location: 'Test A' },
    { owner_id: ownerB.id, name: `Operations B ${suffix}`, location: 'Test B' },
  ]);
  state.stallIds.push(...stalls.map((stall) => stall.id));
  const [stallA, stallB] = stalls;
  const now = Date.now();

  async function createPaidOrder(stall, owner, offset) {
    const order = await Order.create({
      stall_id: stall.id,
      cashier_id: owner.id,
      payment_method: 'cash',
      status: 'paid',
      subtotal_usd: 1,
      total_usd: 1,
      subtotal_khr: 4100,
      total_khr: 4100,
      pricing_currency: 'usd',
      exchange_rate_khr_per_usd: 4100,
      completed_at: new Date(now - offset),
    });
    state.orderIds.push(order.id);
    return order;
  }

  const [pendingOrder, retryOrder, failedOrder, sentOrder, foreignOrder] = await Promise.all([
    createPaidOrder(stallA, ownerA, 120000),
    createPaidOrder(stallA, ownerA, 90000),
    createPaidOrder(stallA, ownerA, 60000),
    createPaidOrder(stallA, ownerA, 5000),
    createPaidOrder(stallB, ownerB, 60000),
  ]);
  await TelegramDispatchJob.bulkCreate([
    {
      order_id: pendingOrder.id,
      status: 'pending',
      next_attempt_at: new Date(now - 120000),
      createdAt: new Date(now - 120000),
      updatedAt: new Date(now - 120000),
    },
    {
      order_id: retryOrder.id,
      status: 'retry',
      attempt_count: 2,
      next_attempt_at: new Date(now + 30000),
      last_error: 'fetch failed api_key=must-not-leak',
    },
    {
      order_id: failedOrder.id,
      status: 'failed',
      attempt_count: 5,
      next_attempt_at: new Date(now),
      last_error: 'Telegram rejected secret=must-not-leak',
    },
    {
      order_id: sentOrder.id,
      status: 'sent',
      attempt_count: 1,
      next_attempt_at: new Date(now),
    },
    {
      order_id: foreignOrder.id,
      status: 'failed',
      attempt_count: 5,
      next_attempt_at: new Date(now),
      last_error: 'foreign tenant failure',
    },
  ]);
  await TelegramTicket.create({
    order_id: sentOrder.id,
    telegram_chat_id: `-100${String(now).slice(-10)}`,
    telegram_msg_id: String(now).slice(-9),
    status: 'sent',
    sent_at: new Date(now - 1000),
  });

  const login = await request('/auth/login', {
    method: 'POST',
    body: { username: ownerA.username, password },
  });
  assert.equal(login.response.status, 200);
  const token = login.payload?.data?.token;
  assert.ok(token);

  const result = await request('/operations/telegram', { token });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.payload.data.status_counts, {
    pending: 1,
    processing: 0,
    retry: 1,
    failed: 1,
    sent: 1,
    total: 4,
  });
  assert.equal(result.payload.data.alerts.failed, 1);
  assert.equal(result.payload.data.alerts.retrying, 1);
  assert.equal(result.payload.data.latency.sample_count, 1);
  assert.ok(result.payload.data.actionable_jobs.every((job) => job.stall_id === stallA.id));
  assert.equal(result.payload.data.actionable_jobs.find((job) => job.status === 'failed')?.can_retry, true);
  assert.equal(result.payload.data.actionable_jobs.find((job) => job.status === 'retry')?.can_retry, false);
  assert.doesNotMatch(JSON.stringify(result.payload), /must-not-leak|last_error|locked_by|telegram_chat_id|telegram_msg_id/i);

  const crossTenant = await request(`/operations/telegram?stall_id=${stallB.id}`, { token });
  assert.equal(crossTenant.response.status, 404);
});
