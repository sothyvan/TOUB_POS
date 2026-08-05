import * as telegramOperationsRepository from '../repositories/telegram-operations.repository.js';
import { httpError } from '../utils/http-error.util.js';

const DEFAULT_PENDING_STALE_MS = 60000;
const DEFAULT_PROCESSING_STALE_MS = 60000;
const DEFAULT_LATENCY_WINDOW_HOURS = 24;
const DELIVERY_TARGET_MS = 2000;
const MAX_STALE_MS = 60 * 60 * 1000;
const MAX_LATENCY_WINDOW_HOURS = 24 * 7;
const JOB_STATUSES = ['pending', 'processing', 'retry', 'failed', 'sent'];

function boundedPositiveInteger(value, fallback, maximum) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

export function resolveTelegramMonitorThresholds(env = process.env) {
  const dispatchLockTimeout = boundedPositiveInteger(
    env.TELEGRAM_DISPATCH_LOCK_TIMEOUT_MS,
    DEFAULT_PROCESSING_STALE_MS,
    MAX_STALE_MS,
  );
  return {
    pendingStaleMs: boundedPositiveInteger(
      env.TELEGRAM_MONITOR_PENDING_STALE_MS,
      DEFAULT_PENDING_STALE_MS,
      MAX_STALE_MS,
    ),
    processingStaleMs: boundedPositiveInteger(
      env.TELEGRAM_MONITOR_PROCESSING_STALE_MS,
      dispatchLockTimeout,
      MAX_STALE_MS,
    ),
    latencyWindowHours: boundedPositiveInteger(
      env.TELEGRAM_MONITOR_LATENCY_WINDOW_HOURS,
      DEFAULT_LATENCY_WINDOW_HOURS,
      MAX_LATENCY_WINDOW_HOURS,
    ),
    deliveryTargetMs: DELIVERY_TARGET_MS,
  };
}

function resolveOwnerId(actor) {
  const role = String(actor?.role || '').toLowerCase();
  const ownerId = Number(role === 'owner' ? actor?.id : actor?.owner_id);
  if (!['owner', 'manager'].includes(role) || !Number.isInteger(ownerId) || ownerId <= 0) {
    throw httpError('Unable to resolve Telegram operations owner scope.', 403);
  }
  return ownerId;
}

function parseOptionalStallId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw httpError('stall_id must be a positive integer.');
  }
  return parsed;
}

export function mapTelegramFailure(rawError) {
  const message = String(rawError || '').toLowerCase();
  if (/unknown state|manual review/.test(message)) {
    return {
      code: 'UNKNOWN_SEND_STATE',
      summary: 'A previous send ended in an unknown state. Review before retrying.',
    };
  }
  if (/no telegram|configuration|chat configured|bot token|required/.test(message)) {
    return {
      code: 'CONFIGURATION_MISSING',
      summary: 'The stall’s Telegram kitchen connection is unavailable.',
    };
  }
  if (/order no longer|only paid|cannot be dispatched/.test(message)) {
    return {
      code: 'ORDER_NOT_DISPATCHABLE',
      summary: 'This order can no longer be dispatched.',
    };
  }
  if (/429|too many requests|rate limit/.test(message)) {
    return {
      code: 'RATE_LIMITED',
      summary: 'Telegram temporarily limited delivery attempts.',
    };
  }
  if (/fetch failed|network|timeout|timed out|abort|econn/.test(message)) {
    return {
      code: 'NETWORK_FAILURE',
      summary: 'Telegram could not be reached.',
    };
  }
  return {
    code: 'DELIVERY_FAILED',
    summary: 'Telegram could not deliver this kitchen ticket.',
  };
}

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapLatency(rows, targetMs) {
  const values = rows
    .map((row) => Math.max(0, Math.round(Number(row.latency_ms))))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (values.length === 0) {
    return {
      sample_count: 0,
      average_ms: null,
      p95_ms: null,
      max_ms: null,
      target_ms: targetMs,
    };
  }
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const percentileIndex = Math.max(0, Math.ceil(values.length * 0.95) - 1);
  return {
    sample_count: values.length,
    average_ms: average,
    p95_ms: values[percentileIndex],
    max_ms: values[values.length - 1],
    target_ms: targetMs,
  };
}

function mapActionableJob(row, now) {
  const queuedAt = new Date(row.queued_at);
  const ageSeconds = Number.isNaN(queuedAt.getTime())
    ? null
    : Math.max(0, Math.floor((now.getTime() - queuedAt.getTime()) / 1000));
  const isStale = Boolean(Number(row.is_stale));
  const failure = isStale && ['pending', 'processing'].includes(row.status)
    ? {
      code: 'STALE_DISPATCH',
      summary: 'Kitchen delivery has been waiting longer than expected.',
    }
    : mapTelegramFailure(row.last_error);
  const stallName = row.stall_location
    ? `${row.stall_name} — ${row.stall_location}`
    : row.stall_name;

  return {
    order_id: Number(row.order_id),
    order_no: `ORD-${String(row.order_id).padStart(4, '0')}`,
    stall_id: Number(row.stall_id),
    stall_name: stallName || `Stall #${row.stall_id}`,
    status: row.status,
    attempt_count: Number(row.attempt_count || 0),
    queued_at: toIso(row.queued_at),
    last_attempt_at: toIso(row.last_attempt_at),
    next_attempt_at: row.status === 'failed' ? null : toIso(row.next_attempt_at),
    age_seconds: ageSeconds,
    is_stale: isStale,
    failure_code: failure.code,
    failure_summary: failure.summary,
    can_retry: row.status === 'failed',
  };
}

function mapStatusCounts(rows) {
  const counts = Object.fromEntries(JOB_STATUSES.map((status) => [status, 0]));
  const stale = { pending: 0, processing: 0 };
  for (const row of rows) {
    if (JOB_STATUSES.includes(row.status)) {
      counts[row.status] = Number(row.status_count || 0);
    }
    if (row.status === 'pending' || row.status === 'processing') {
      stale[row.status] = Number(row.stale_count || 0);
    }
  }
  return {
    counts: {
      ...counts,
      total: JOB_STATUSES.reduce((sum, status) => sum + counts[status], 0),
    },
    stale,
  };
}

export async function getTelegramOperations(actor, query = {}, dependencyOverrides = {}) {
  const ownerId = resolveOwnerId(actor);
  const stallId = parseOptionalStallId(query.stall_id);
  const dependencies = {
    env: process.env,
    now: () => new Date(),
    findOwnedStall: telegramOperationsRepository.findOwnedOperationsStall,
    fetchSnapshot: telegramOperationsRepository.fetchTelegramOperationsSnapshot,
    ...dependencyOverrides,
  };
  if (stallId) {
    const stall = await dependencies.findOwnedStall(ownerId, stallId);
    if (!stall) {
      throw httpError('Stall not found.', 404);
    }
  }

  const now = dependencies.now();
  const thresholds = resolveTelegramMonitorThresholds(dependencies.env);
  const snapshot = await dependencies.fetchSnapshot(ownerId, {
    stallId,
    pendingStaleBefore: new Date(now.getTime() - thresholds.pendingStaleMs),
    processingStaleBefore: new Date(now.getTime() - thresholds.processingStaleMs),
    latencySince: new Date(
      now.getTime() - (thresholds.latencyWindowHours * 60 * 60 * 1000),
    ),
  });
  const { counts, stale } = mapStatusCounts(snapshot.statusRows || []);
  const latency = mapLatency(snapshot.latencyRows || [], thresholds.deliveryTargetMs);
  const alerts = {
    stale_pending: stale.pending,
    stale_processing: stale.processing,
    failed: counts.failed,
    retrying: counts.retry,
  };
  const health = alerts.failed > 0 || alerts.stale_processing > 0
    ? 'critical'
    : (
      alerts.stale_pending > 0
      || alerts.retrying > 0
      || (latency.p95_ms !== null && latency.p95_ms > thresholds.deliveryTargetMs)
        ? 'warning'
        : 'healthy'
    );

  return {
    generated_at: now.toISOString(),
    scope: { stall_id: stallId },
    thresholds: {
      pending_stale_seconds: Math.round(thresholds.pendingStaleMs / 1000),
      processing_stale_seconds: Math.round(thresholds.processingStaleMs / 1000),
      delivery_target_ms: thresholds.deliveryTargetMs,
      latency_window_hours: thresholds.latencyWindowHours,
    },
    health,
    status_counts: counts,
    alerts,
    latency,
    actionable_jobs: (snapshot.actionableRows || []).map((row) => mapActionableJob(row, now)),
  };
}
