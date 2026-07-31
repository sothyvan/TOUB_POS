export const MAX_VISIBLE_NOTIFICATIONS = 3;
export const DEFAULT_NOTIFICATION_DURATION_MS = 4500;

const ALLOWED_VARIANTS = new Set(['success', 'info', 'warning', 'danger']);

function cleanText(value, maximumLength) {
  return String(value || '').trim().slice(0, maximumLength);
}

export function createNotification(input, id) {
  const notification = typeof input === 'string' ? { message: input } : input || {};
  const duration = Number(notification.duration);

  return {
    id,
    variant: ALLOWED_VARIANTS.has(notification.variant) ? notification.variant : 'info',
    title: cleanText(notification.title, 80),
    message: cleanText(notification.message, 240),
    duration: Number.isFinite(duration) && duration >= 0
      ? duration
      : DEFAULT_NOTIFICATION_DURATION_MS,
  };
}

export function appendNotification(current, notification) {
  return [...current.filter((item) => item.id !== notification.id), notification]
    .slice(-MAX_VISIBLE_NOTIFICATIONS);
}
