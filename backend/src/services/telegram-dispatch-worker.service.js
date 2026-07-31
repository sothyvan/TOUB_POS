import { randomUUID } from 'node:crypto';
import { Stall, TelegramTicket } from '../models/index.js';
import {
  claimNextTelegramDispatchJob,
  saveTelegramDispatchJob,
} from '../repositories/telegram-dispatch-job.repository.js';
import { getOrderById } from './orders/order-access.js';
import { dispatchToTelegram } from './telegram.service.js';
import { emitKitchenTicketUpdated } from './websocket.service.js';

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCK_TIMEOUT_MS = 60000;
const DEFAULT_RETRY_BASE_MS = 5000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

const workerId = `${process.pid}-${randomUUID()}`;
let timerId = null;
let isRunning = false;
let wakePromise = null;

function parsePositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isWorkerEnabled() {
  return String(process.env.TELEGRAM_DISPATCH_WORKER_ENABLED || 'true').toLowerCase() !== 'false';
}

function hasTelegramBotConfig() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  return Boolean(token)
    && !token.startsWith('your_')
    && !token.startsWith('replace_')
    && !token.startsWith('change_');
}

function normalizeErrorMessage(error) {
  const message = String(error?.message || 'Telegram dispatch failed.').trim();
  return message.slice(0, 500);
}

export function calculateTelegramRetryDelayMs(attemptCount, baseDelayMs = DEFAULT_RETRY_BASE_MS) {
  const normalizedAttempt = Math.max(1, Number(attemptCount) || 1);
  return Math.min(baseDelayMs * (2 ** (normalizedAttempt - 1)), MAX_RETRY_DELAY_MS);
}

async function markJobSent(job) {
  await saveTelegramDispatchJob(job, {
    status: 'sent',
    next_attempt_at: new Date(),
    locked_at: null,
    locked_by: null,
    last_error: null,
  });
}

async function markJobFailed(job, error, { terminal = false } = {}) {
  const maxAttempts = parsePositiveIntegerEnv(
    'TELEGRAM_DISPATCH_MAX_ATTEMPTS',
    DEFAULT_MAX_ATTEMPTS,
  );
  const shouldStop = terminal || job.attempt_count >= maxAttempts;
  const baseDelayMs = parsePositiveIntegerEnv(
    'TELEGRAM_DISPATCH_RETRY_BASE_MS',
    DEFAULT_RETRY_BASE_MS,
  );

  await saveTelegramDispatchJob(job, {
    status: shouldStop ? 'failed' : 'retry',
    next_attempt_at: shouldStop
      ? new Date()
      : new Date(Date.now() + calculateTelegramRetryDelayMs(job.attempt_count, baseDelayMs)),
    locked_at: null,
    locked_by: null,
    last_error: normalizeErrorMessage(error),
  });
  return shouldStop ? 'failed' : 'retry';
}

async function processClaimedJob(job) {
  const order = await getOrderById(job.order_id);
  if (!order) {
    return markJobFailed(job, new Error('Order no longer exists.'), { terminal: true });
  }
  if (order.status !== 'paid') {
    return markJobFailed(job, new Error('Only paid orders can be sent to the kitchen.'), {
      terminal: true,
    });
  }

  const latestTicket = await TelegramTicket.findOne({
    where: { order_id: order.id },
    order: [['id', 'DESC']],
  });

  if (latestTicket && ['sent', 'done'].includes(latestTicket.status)) {
    await markJobSent(job);
    return 'sent';
  }

  if (latestTicket?.status === 'pending') {
    latestTicket.status = 'failed';
    await latestTicket.save();
    const stall = await Stall.findByPk(order.stall_id, { attributes: ['owner_id'] });
    emitKitchenTicketUpdated({
      cashierId: order.cashier_id,
      ownerId: stall?.owner_id,
      orderId: order.id,
      ticketId: latestTicket.id,
      status: latestTicket.status,
      completedAt: latestTicket.completed_at,
    });
    return markJobFailed(
      job,
      new Error('Previous Telegram send ended in an unknown state; manual retry is required.'),
      { terminal: true },
    );
  }

  const ticket = await dispatchToTelegram(order, { forceRetry: Boolean(latestTicket) });
  if (ticket && ['sent', 'done'].includes(ticket.status)) {
    await markJobSent(job);
    return 'sent';
  }

  return markJobFailed(
    job,
    ticket?.dispatchError || new Error(
      ticket?.status === 'failed'
        ? 'Telegram rejected or could not deliver the kitchen ticket.'
        : 'Telegram kitchen configuration is unavailable.',
    ),
  );
}

export async function runTelegramDispatchWorkerOnce() {
  if (!isWorkerEnabled()) {
    return { skipped: true, reason: 'disabled' };
  }
  if (!hasTelegramBotConfig()) {
    return { skipped: true, reason: 'missing_bot_token' };
  }
  if (isRunning) {
    return { skipped: true, reason: 'already_running' };
  }

  isRunning = true;
  const batchSize = parsePositiveIntegerEnv(
    'TELEGRAM_DISPATCH_BATCH_SIZE',
    DEFAULT_BATCH_SIZE,
  );
  const lockTimeoutMs = parsePositiveIntegerEnv(
    'TELEGRAM_DISPATCH_LOCK_TIMEOUT_MS',
    DEFAULT_LOCK_TIMEOUT_MS,
  );
  const stats = { claimed: 0, sent: 0, retry: 0, failed: 0 };

  try {
    for (let index = 0; index < batchSize; index += 1) {
      const job = await claimNextTelegramDispatchJob({
        workerId,
        lockTimeoutMs,
      });
      if (!job) {
        break;
      }

      stats.claimed += 1;
      try {
        const outcome = await processClaimedJob(job);
        stats[outcome] += 1;
      } catch (error) {
        const outcome = await markJobFailed(job, error);
        stats[outcome] += 1;
        console.error(
          `[telegram-dispatch-worker] Job #${job.id} for order #${job.order_id} failed:`,
          normalizeErrorMessage(error),
        );
      }
    }

    return stats;
  } finally {
    isRunning = false;
  }
}

export function requestTelegramDispatchRun() {
  if (wakePromise || !isWorkerEnabled() || !hasTelegramBotConfig()) {
    return wakePromise;
  }

  wakePromise = Promise.resolve()
    .then(() => runTelegramDispatchWorkerOnce())
    .catch((error) => {
      console.error('[telegram-dispatch-worker] Requested run failed:', normalizeErrorMessage(error));
    })
    .finally(() => {
      wakePromise = null;
    });
  return wakePromise;
}

export function startTelegramDispatchWorker() {
  if (timerId || !isWorkerEnabled()) {
    return;
  }
  if (!hasTelegramBotConfig()) {
    console.warn('[telegram-dispatch-worker] Missing TELEGRAM_BOT_TOKEN; queued jobs remain pending.');
    return;
  }

  const intervalMs = parsePositiveIntegerEnv(
    'TELEGRAM_DISPATCH_INTERVAL_MS',
    DEFAULT_INTERVAL_MS,
  );
  timerId = setInterval(requestTelegramDispatchRun, intervalMs);
  timerId.unref?.();
  console.info(`[telegram-dispatch-worker] Started. Interval: ${intervalMs}ms.`);
  requestTelegramDispatchRun();
}

export async function stopTelegramDispatchWorker() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  if (wakePromise) {
    await wakePromise;
  }
}
