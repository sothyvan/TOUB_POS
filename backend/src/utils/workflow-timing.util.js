import { performance } from 'node:perf_hooks';
import { writeStructuredLog } from './logger.util.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_LABEL_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const TELEGRAM_UPDATE_OUTCOMES = new Set(['updated', 'notified', 'failed']);
const ALLOWED_TIMING_KEYS = new Set([
  'order_lock_read',
  'transaction_open',
  'settlement',
  'order_save',
  'audit_insert',
  'outbox_enqueue',
  'transaction_commit',
  'order_reload',
  'post_commit_notify',
  'claim',
  'job_processing',
  'existing_ticket_lookup',
  'stall_lookup',
  'pending_ticket_insert',
  'telegram_api',
  'final_stall_reload',
  'sent_ticket_save',
  'atomic_completion',
  'ticket_lookup',
  'order_lookup',
  'cook_access_check',
  'telegram_edit',
  'websocket_emit',
  'callback_answer',
]);
const ALLOWED_AGE_KEYS = new Set([
  'order_created_to_paid',
  'job_due_to_claim',
  'paid_to_sent',
  'ticket_sent_to_done',
]);

function normalizeMilliseconds(value) {
  const parsed = Number(value);
  const rounded = Math.round(parsed);
  return Number.isFinite(parsed) && parsed >= 0 && Number.isSafeInteger(rounded)
    ? rounded
    : null;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function filterMeasurements(values, allowedKeys) {
  const filtered = {};
  let clockAnomaly = false;
  for (const [key, value] of Object.entries(values || {})) {
    if (!allowedKeys.has(key)) {
      continue;
    }
    const normalized = normalizeMilliseconds(value);
    if (normalized === null) {
      clockAnomaly = true;
      continue;
    }
    filtered[key] = normalized;
  }
  return { values: filtered, clockAnomaly };
}

export function calculateAgeMilliseconds(start, end) {
  if (!start || !end) {
    return { value: null, clockAnomaly: true };
  }
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const value = normalizeMilliseconds(endMs - startMs);
  return {
    value,
    clockAnomaly: value === null,
  };
}

export function createWorkflowTimer({ now = () => performance.now() } = {}) {
  const startedAt = Number(now());
  let previousAt = startedAt;
  let elapsed = 0;
  let clockAnomaly = !Number.isFinite(startedAt);
  const timingsMs = {};

  return {
    mark(phase) {
      const currentAt = Number(now());
      const phaseDuration = normalizeMilliseconds(currentAt - previousAt);
      const totalDuration = normalizeMilliseconds(currentAt - startedAt);
      if (!ALLOWED_TIMING_KEYS.has(phase) || phaseDuration === null || totalDuration === null) {
        clockAnomaly = true;
      } else {
        timingsMs[phase] = phaseDuration;
        elapsed = totalDuration;
      }
      if (Number.isFinite(currentAt)) {
        previousAt = currentAt;
      }
      return phaseDuration;
    },
    snapshot() {
      return {
        duration_ms: elapsed,
        timings_ms: { ...timingsMs },
        clock_anomaly: clockAnomaly,
      };
    },
  };
}

export function buildWorkflowTimingEvent({
  workflow,
  outcome,
  requestId,
  orderId,
  attemptCount,
  durationMs,
  timingsMs,
  agesMs,
  clockAnomaly = false,
  telegramUpdate,
} = {}) {
  const timings = filterMeasurements(timingsMs, ALLOWED_TIMING_KEYS);
  const ages = filterMeasurements(agesMs, ALLOWED_AGE_KEYS);
  const event = {
    schema_version: 1,
    workflow: SAFE_LABEL_PATTERN.test(workflow || '') ? workflow : 'unknown',
    outcome: SAFE_LABEL_PATTERN.test(outcome || '') ? outcome : 'unknown',
  };
  if (REQUEST_ID_PATTERN.test(requestId || '')) {
    event.request_id = requestId;
  }
  const normalizedOrderId = normalizePositiveInteger(orderId);
  if (normalizedOrderId !== null) {
    event.order_id = normalizedOrderId;
  }
  const normalizedAttemptCount = normalizePositiveInteger(attemptCount);
  if (normalizedAttemptCount !== null) {
    event.attempt_count = normalizedAttemptCount;
  }
  const normalizedDuration = normalizeMilliseconds(durationMs);
  if (normalizedDuration !== null) {
    event.duration_ms = normalizedDuration;
  }
  event.timings_ms = timings.values;
  event.ages_ms = ages.values;
  event.clock_anomaly = Boolean(clockAnomaly || timings.clockAnomaly || ages.clockAnomaly);
  if (TELEGRAM_UPDATE_OUTCOMES.has(telegramUpdate)) {
    event.telegram_update = telegramUpdate;
  }
  return event;
}

export function writeWorkflowTimingEvent(event, logger = writeStructuredLog) {
  const safeEvent = buildWorkflowTimingEvent({
    workflow: event?.workflow,
    outcome: event?.outcome,
    requestId: event?.request_id,
    orderId: event?.order_id,
    attemptCount: event?.attempt_count,
    durationMs: event?.duration_ms,
    timingsMs: event?.timings_ms,
    agesMs: event?.ages_ms,
    clockAnomaly: event?.clock_anomaly,
    telegramUpdate: event?.telegram_update,
  });
  try {
    logger('info', 'order_kitchen_latency', safeEvent);
  } catch {
    // Performance diagnostics are best-effort and must never change business outcomes.
  }
  return safeEvent;
}

export function recordWorkflowTiming(details, logger = writeStructuredLog) {
  return writeWorkflowTimingEvent(buildWorkflowTimingEvent(details), logger);
}
