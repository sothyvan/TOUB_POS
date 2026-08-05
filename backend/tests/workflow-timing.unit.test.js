import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkflowTimingEvent,
  calculateAgeMilliseconds,
  createWorkflowTimer,
  recordWorkflowTiming,
  writeWorkflowTimingEvent,
} from '../src/utils/workflow-timing.util.js';
import { buildCashConfirmationTiming } from '../src/services/orders/cash-payment.service.js';
import { buildTelegramDispatchWorkerTiming } from '../src/services/telegram-dispatch-worker.service.js';
import { buildTelegramTicketDispatchTiming } from '../src/services/telegram.service.js';
import { redactForLog } from '../src/utils/logger.util.js';

test('workflow timer records monotonic phase and total durations', () => {
  const readings = [100, 105.4, 118.2];
  const timer = createWorkflowTimer({ now: () => readings.shift() });

  timer.mark('order_save');
  timer.mark('transaction_commit');

  assert.deepEqual(timer.snapshot(), {
    duration_ms: 18,
    timings_ms: {
      order_save: 5,
      transaction_commit: 13,
    },
    clock_anomaly: false,
  });
});

test('workflow timing rejects invalid and negative wall-clock ages', () => {
  assert.deepEqual(
    calculateAgeMilliseconds(
      '2026-08-05T12:00:00.000Z',
      '2026-08-05T12:00:01.250Z',
    ),
    { value: 1250, clockAnomaly: false },
  );
  assert.deepEqual(
    calculateAgeMilliseconds(
      '2026-08-05T12:00:02.000Z',
      '2026-08-05T12:00:01.000Z',
    ),
    { value: null, clockAnomaly: true },
  );
  assert.deepEqual(
    calculateAgeMilliseconds('not-a-date', new Date()),
    { value: null, clockAnomaly: true },
  );
});

test('workflow timing event allows only approved operational fields', () => {
  const event = buildWorkflowTimingEvent({
    workflow: 'telegram_done',
    outcome: 'completed',
    requestId: 'request-123',
    orderId: 42,
    attemptCount: 1,
    durationMs: 213.7,
    timingsMs: {
      atomic_completion: 12.2,
      telegram_edit: 199.8,
      telegram_chat_id: -100123,
      provider_payload: 'secret response',
    },
    agesMs: {
      ticket_sent_to_done: 180000,
      telegram_user_id: 987654,
    },
    telegramUpdate: 'updated',
    raw_error: 'token=must-not-leak',
    cash_received_usd: 100,
  });

  assert.deepEqual(event, {
    schema_version: 1,
    workflow: 'telegram_done',
    outcome: 'completed',
    request_id: 'request-123',
    order_id: 42,
    attempt_count: 1,
    duration_ms: 214,
    timings_ms: {
      atomic_completion: 12,
      telegram_edit: 200,
    },
    ages_ms: {
      ticket_sent_to_done: 180000,
    },
    clock_anomaly: false,
    telegram_update: 'updated',
  });
  assert.doesNotMatch(JSON.stringify(event), /must-not-leak|chat_id|user_id|cash_received|provider_payload/);
});

test('cook access timing remains numeric after global log redaction', () => {
  const event = buildWorkflowTimingEvent({
    workflow: 'telegram_done',
    outcome: 'completed',
    timingsMs: { cook_access_check: 94 },
  });

  assert.equal(redactForLog(event).timings_ms.cook_access_check, 94);
});

test('workflow timing writes one structured event through the shared logger', () => {
  const calls = [];
  const event = recordWorkflowTiming({
    workflow: 'cash_confirmation',
    outcome: 'succeeded',
    orderId: 7,
    durationMs: 25,
    timingsMs: { transaction_commit: 10 },
  }, (...args) => calls.push(args));

  assert.deepEqual(calls, [['info', 'order_kitchen_latency', event]]);
  assert.equal(event.order_id, 7);
});

test('workflow timing diagnostics can never fail the business workflow', () => {
  const event = buildWorkflowTimingEvent({
    workflow: 'cash_confirmation',
    outcome: 'succeeded',
    orderId: 7,
  });
  const failingLogger = () => {
    throw new Error('log transport unavailable');
  };

  assert.doesNotThrow(() => writeWorkflowTimingEvent(event, failingLogger));
  assert.doesNotThrow(() => recordWorkflowTiming({
    workflow: 'telegram_done',
    outcome: 'completed',
    orderId: 7,
  }, failingLogger));

  const directEvent = writeWorkflowTimingEvent({
    workflow: 'telegram_done',
    outcome: 'completed',
    order_id: 7,
    telegram_chat_id: '-100-secret',
    timings_ms: { telegram_edit: 20, provider_payload: 'secret response' },
  }, () => {});
  assert.doesNotMatch(JSON.stringify(directEvent), /chat_id|provider_payload|secret response/);
});

test('cash confirmation timing derives order-created-to-paid age', () => {
  const event = buildCashConfirmationTiming({
    order: {
      id: 14,
      created_at: '2026-08-05T12:00:00.000Z',
      completed_at: '2026-08-05T12:00:03.250Z',
    },
    requestId: 'cash-request-14',
    timerSnapshot: {
      duration_ms: 80,
      timings_ms: { order_save: 12, transaction_commit: 18 },
      clock_anomaly: false,
    },
  });

  assert.equal(event.workflow, 'cash_confirmation');
  assert.equal(event.request_id, 'cash-request-14');
  assert.equal(event.order_id, 14);
  assert.equal(event.ages_ms.order_created_to_paid, 3250);
});

test('dispatch worker timing separates claim, processing, and due pickup delay', () => {
  const event = buildTelegramDispatchWorkerTiming({
    job: {
      order_id: 21,
      attempt_count: 2,
      next_attempt_at: '2026-08-05T12:00:00.000Z',
      last_attempt_at: '2026-08-05T12:00:00.075Z',
    },
    outcome: 'sent',
    timerSnapshot: {
      duration_ms: 240,
      timings_ms: { claim: 15, job_processing: 225 },
      clock_anomaly: false,
    },
  });

  assert.equal(event.workflow, 'kitchen_dispatch_worker');
  assert.equal(event.outcome, 'sent');
  assert.equal(event.attempt_count, 2);
  assert.equal(event.ages_ms.job_due_to_claim, 75);
});

test('dispatch worker queue age uses timestamps captured before outcome mutation', () => {
  const event = buildTelegramDispatchWorkerTiming({
    job: {
      order_id: 22,
      attempt_count: 1,
      next_attempt_at: '2026-08-05T12:00:05.000Z',
      last_attempt_at: '2026-08-05T12:00:00.075Z',
    },
    dueAt: '2026-08-05T12:00:00.000Z',
    claimedAt: '2026-08-05T12:00:00.075Z',
    outcome: 'sent',
    timerSnapshot: {
      duration_ms: 200,
      timings_ms: { claim: 10, job_processing: 190 },
      clock_anomaly: false,
    },
  });

  assert.equal(event.ages_ms.job_due_to_claim, 75);
  assert.equal(event.clock_anomaly, false);
});

test('ticket dispatch timing separates Telegram API time from persistence', () => {
  const event = buildTelegramTicketDispatchTiming({
    order: {
      id: 31,
      completed_at: '2026-08-05T12:00:00.000Z',
    },
    ticket: {
      sent_at: '2026-08-05T12:00:00.420Z',
    },
    outcome: 'sent',
    timerSnapshot: {
      duration_ms: 420,
      timings_ms: {
        pending_ticket_insert: 8,
        telegram_api: 380,
        sent_ticket_save: 12,
      },
      clock_anomaly: false,
    },
  });

  assert.equal(event.workflow, 'telegram_ticket_dispatch');
  assert.equal(event.outcome, 'sent');
  assert.equal(event.timings_ms.telegram_api, 380);
  assert.equal(event.ages_ms.paid_to_sent, 420);
});

test('failed ticket dispatch omits paid-to-sent age without reporting a clock anomaly', () => {
  const event = buildTelegramTicketDispatchTiming({
    order: { id: 32, completed_at: '2026-08-05T12:00:00.000Z' },
    ticket: { sent_at: null },
    outcome: 'failed',
    timerSnapshot: {
      duration_ms: 10000,
      timings_ms: { telegram_api: 9990, sent_ticket_save: 10 },
      clock_anomaly: false,
    },
  });

  assert.deepEqual(event.ages_ms, {});
  assert.equal(event.clock_anomaly, false);
});
