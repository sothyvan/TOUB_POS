import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTelegramOperations,
  mapTelegramFailure,
  resolveTelegramMonitorThresholds,
} from '../src/services/telegram-operations.service.js';
import { fetchTelegramOperationsSnapshot } from '../src/repositories/telegram-operations.repository.js';

const NOW = new Date('2026-08-05T12:00:00.000Z');

function snapshot(overrides = {}) {
  return {
    statusRows: [
      { status: 'pending', status_count: 2, stale_count: 1 },
      { status: 'processing', status_count: 1, stale_count: 0 },
      { status: 'retry', status_count: 3, stale_count: 0 },
      { status: 'failed', status_count: 1, stale_count: 0 },
      { status: 'sent', status_count: 8, stale_count: 0 },
    ],
    latencyRows: [
      { latency_ms: 800 },
      { latency_ms: 1200 },
      { latency_ms: 2600 },
    ],
    actionableRows: [{
      order_id: 42,
      stall_id: 3,
      stall_name: 'Main Booth',
      stall_location: 'Riverside',
      status: 'failed',
      attempt_count: 5,
      queued_at: '2026-08-05T11:51:00.000Z',
      last_attempt_at: '2026-08-05T11:56:00.000Z',
      next_attempt_at: null,
      last_error: 'fetch failed token=do-not-return-this',
      is_stale: 0,
    }],
    ...overrides,
  };
}

test('Telegram operations resolves Manager tenant scope and returns safe actionable health data', async () => {
  let captured;
  const result = await getTelegramOperations({ id: 17, role: 'manager', owner_id: 7 }, {}, {
    now: () => NOW,
    env: {},
    findOwnedStall: () => Promise.resolve(null),
    fetchSnapshot: (ownerId, options) => {
      captured = { ownerId, options };
      return Promise.resolve(snapshot());
    },
  });

  assert.equal(captured.ownerId, 7);
  assert.equal(captured.options.stallId, null);
  assert.equal(result.health, 'critical');
  assert.deepEqual(result.status_counts, {
    pending: 2,
    processing: 1,
    retry: 3,
    failed: 1,
    sent: 8,
    total: 15,
  });
  assert.deepEqual(result.alerts, {
    stale_pending: 1,
    stale_processing: 0,
    failed: 1,
    retrying: 3,
  });
  assert.deepEqual(result.latency, {
    sample_count: 3,
    average_ms: 1533,
    p95_ms: 2600,
    max_ms: 2600,
    target_ms: 2000,
  });
  assert.deepEqual(result.actionable_jobs[0], {
    order_id: 42,
    order_no: 'ORD-0042',
    stall_id: 3,
    stall_name: 'Main Booth — Riverside',
    status: 'failed',
    attempt_count: 5,
    queued_at: '2026-08-05T11:51:00.000Z',
    last_attempt_at: '2026-08-05T11:56:00.000Z',
    next_attempt_at: null,
    age_seconds: 540,
    is_stale: false,
    failure_code: 'NETWORK_FAILURE',
    failure_summary: 'Telegram could not be reached.',
    can_retry: true,
  });
  assert.equal(JSON.stringify(result).includes('do-not-return-this'), false);
  assert.equal(Object.hasOwn(result.actionable_jobs[0], 'last_error'), false);
  assert.equal(Object.hasOwn(result.actionable_jobs[0], 'locked_by'), false);
});

test('Telegram operations validates Owner scope and hides cross-tenant Stall existence', async () => {
  await assert.rejects(
    getTelegramOperations({ id: 5, role: 'owner' }, { stall_id: '99' }, {
      now: () => NOW,
      env: {},
      findOwnedStall: () => Promise.resolve(null),
      fetchSnapshot: () => assert.fail('snapshot must not load for an out-of-scope Stall'),
    }),
    (error) => error.status === 404,
  );

  await assert.rejects(
    getTelegramOperations({ id: 22, role: 'manager', owner_id: null }, {}, {
      now: () => NOW,
      env: {},
    }),
    (error) => error.status === 403,
  );
});

test('Telegram monitor thresholds reject unsafe values and apply documented caps', () => {
  assert.deepEqual(resolveTelegramMonitorThresholds({}), {
    pendingStaleMs: 60000,
    processingStaleMs: 60000,
    latencyWindowHours: 24,
    deliveryTargetMs: 2000,
  });
  assert.deepEqual(resolveTelegramMonitorThresholds({
    TELEGRAM_MONITOR_PENDING_STALE_MS: '-1',
    TELEGRAM_MONITOR_PROCESSING_STALE_MS: '99999999',
    TELEGRAM_MONITOR_LATENCY_WINDOW_HOURS: '999',
  }), {
    pendingStaleMs: 60000,
    processingStaleMs: 60000,
    latencyWindowHours: 24,
    deliveryTargetMs: 2000,
  });
});

test('Telegram failure mapping never echoes provider text or secret-like values', () => {
  assert.deepEqual(mapTelegramFailure('Previous Telegram send ended in an unknown state'), {
    code: 'UNKNOWN_SEND_STATE',
    summary: 'A previous send ended in an unknown state. Review before retrying.',
  });
  assert.deepEqual(mapTelegramFailure('429 Too Many Requests'), {
    code: 'RATE_LIMITED',
    summary: 'Telegram temporarily limited delivery attempts.',
  });
  assert.deepEqual(mapTelegramFailure('customer@example.com api_key=abc123'), {
    code: 'DELIVERY_FAILED',
    summary: 'Telegram could not deliver this kitchen ticket.',
  });
});

test('Telegram operations repository applies owner scope to every query', async () => {
  const calls = [];
  const rowsByCall = [[], [], []];
  await fetchTelegramOperationsSnapshot(9, {
    stallId: null,
    pendingStaleBefore: new Date('2026-08-05T11:59:00.000Z'),
    processingStaleBefore: new Date('2026-08-05T11:59:00.000Z'),
    latencySince: new Date('2026-08-04T12:00:00.000Z'),
  }, {
    query: (sql, options) => {
      calls.push({ sql, options });
      return Promise.resolve(rowsByCall[calls.length - 1]);
    },
  });

  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.match(call.sql, /s\.owner_id\s*=\s*:ownerId/);
    assert.match(call.sql, /s\.is_deleted\s*=\s*0/);
    assert.equal(call.options.replacements.ownerId, 9);
  }
  assert.match(calls[0].sql, /j\.status = 'pending' AND j\.updated_at < :pendingStaleBefore/);
  assert.match(calls[0].sql, /j\.status <> 'sent' OR j\.updated_at >= :latencySince/);
  assert.match(calls[1].sql, /j\.status = 'pending' AND j\.updated_at < :pendingStaleBefore/);
  assert.match(calls[1].sql, /j\.updated_at AS queued_at/);
  assert.doesNotMatch(calls[1].sql, /locked_by|telegram_chat_id|telegram_msg_id/i);
});

test('Telegram operations returns healthy empty latency values without NaN', async () => {
  const result = await getTelegramOperations({ id: 5, role: 'owner' }, {}, {
    now: () => NOW,
    env: {},
    fetchSnapshot: () => Promise.resolve(snapshot({
      statusRows: [],
      latencyRows: [],
      actionableRows: [],
    })),
  });

  assert.equal(result.health, 'healthy');
  assert.deepEqual(result.latency, {
    sample_count: 0,
    average_ms: null,
    p95_ms: null,
    max_ms: null,
    target_ms: 2000,
  });
  assert.equal(JSON.stringify(result).includes('NaN'), false);
});
