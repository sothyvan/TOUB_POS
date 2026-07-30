import { Op } from 'sequelize';
import { isKhqrEnabled } from '../config/env.js';
import { Order } from '../models/index.js';
import { checkKhqrPaymentStatusAsSystem } from '../services/order.service.js';

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_BATCH_SIZE = 10;

let timerId = null;
let isChecking = false;

function parsePositiveIntegerEnv(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    console.warn(`[khqr-background-checker] ${name} must be a positive integer. Using ${fallback}.`);
    return fallback;
  }

  return value;
}

function isCheckerEnabled() {
  return process.env.KHQR_BACKGROUND_CHECK_ENABLED !== 'false';
}

function isConfiguredValue(value) {
  const text = String(value || '').trim();
  return Boolean(text)
    && !text.startsWith('replace_')
    && !text.startsWith('your_')
    && !text.startsWith('change_')
    && text !== 'owner_or_stall_account@bakong';
}

function hasBakongStatusConfig() {
  return isConfiguredValue(process.env.BAKONG_ACCOUNT_ID)
    && isConfiguredValue(process.env.BAKONG_OPEN_API_BASE_URL)
    && isConfiguredValue(process.env.BAKONG_OPEN_API_TOKEN);
}

function findPendingKhqrOrders() {
  const batchSize = parsePositiveIntegerEnv('KHQR_BACKGROUND_CHECK_BATCH_SIZE', DEFAULT_BATCH_SIZE);

  return Order.findAll({
    where: {
      payment_method: 'khqr',
      status: 'pending_payment',
      qr_md5: { [Op.ne]: null },
      payment_expires_at: { [Op.gt]: new Date() },
    },
    attributes: ['id', 'payment_reference', 'payment_expires_at'],
    order: [['created_at', 'ASC']],
    limit: batchSize,
  });
}

export async function runKhqrBackgroundCheckOnce() {
  if (!isKhqrEnabled()) {
    return { skipped: true, reason: 'khqr_disabled' };
  }

  if (!isCheckerEnabled()) {
    return { skipped: true, reason: 'disabled' };
  }

  if (!hasBakongStatusConfig()) {
    return { skipped: true, reason: 'missing_bakong_config' };
  }

  if (isChecking) {
    return { skipped: true, reason: 'already_running' };
  }

  isChecking = true;
  const stats = {
    checked: 0,
    paid: 0,
    errors: 0,
  };

  try {
    const orders = await findPendingKhqrOrders();

    for (const order of orders) {
      stats.checked += 1;
      try {
        const result = await checkKhqrPaymentStatusAsSystem(order.id);
        if (result.paymentStatus === 'paid') {
          stats.paid += 1;
        }
      } catch (error) {
        stats.errors += 1;
        console.error(`[khqr-background-checker] Failed checking order #${order.id}:`, error.message);
      }
    }

    if (stats.checked > 0 && (stats.paid > 0 || stats.errors > 0)) {
      console.info('[khqr-background-checker] Completed run', stats);
    }

    return stats;
  } finally {
    isChecking = false;
  }
}

export function startKhqrBackgroundChecker() {
  if (timerId) {
    return;
  }

  if (!isKhqrEnabled()) {
    console.info('[khqr-background-checker] KHQR is disabled by KHQR_ENABLED.');
    return;
  }

  if (!isCheckerEnabled()) {
    console.info('[khqr-background-checker] Disabled by KHQR_BACKGROUND_CHECK_ENABLED=false.');
    return;
  }

  if (!hasBakongStatusConfig()) {
    console.warn('[khqr-background-checker] Missing Bakong config; background checker will not start.');
    return;
  }

  const intervalMs = parsePositiveIntegerEnv('KHQR_BACKGROUND_CHECK_INTERVAL_MS', DEFAULT_INTERVAL_MS);

  timerId = setInterval(() => {
    runKhqrBackgroundCheckOnce().catch((error) => {
      console.error('[khqr-background-checker] Unexpected run failure:', error);
    });
  }, intervalMs);

  timerId.unref?.();
  console.info(`[khqr-background-checker] Started. Interval: ${intervalMs}ms.`);

  runKhqrBackgroundCheckOnce().catch((error) => {
    console.error('[khqr-background-checker] Initial run failed:', error);
  });
}

export function stopKhqrBackgroundChecker() {
  if (!timerId) {
    return;
  }

  clearInterval(timerId);
  timerId = null;
}
