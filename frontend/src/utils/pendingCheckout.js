const PENDING_CHECKOUT_PREFIX = 'toub-pending-checkout';
const PENDING_CHECKOUT_VERSION = 1;
const PENDING_CHECKOUT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function getStorageKey(scope) {
  return `${PENDING_CHECKOUT_PREFIX}:${scope.key}`;
}

export function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure checkout identifiers are not supported by this browser.');
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const randomPart = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `checkout-${randomPart}`;
}

export function createCheckoutSignature(orderPayload) {
  const items = orderPayload.items
    .map((item) => ({
      id: Number(item.id),
      quantity: Number(item.quantity),
      notes: String(item.notes || '').trim(),
    }))
    .sort((left, right) => (
      left.id - right.id
      || left.quantity - right.quantity
      || left.notes.localeCompare(right.notes)
    ));

  return JSON.stringify({
    paymentMethod: String(orderPayload.paymentMethod || '').toUpperCase(),
    items,
  });
}

export function readPendingCheckout(scope, now = Date.now()) {
  if (!scope) return null;

  try {
    const value = localStorage.getItem(getStorageKey(scope));
    if (!value) return null;

    const checkout = JSON.parse(value);
    const updatedAt = Number(checkout?.updatedAt);
    const orderId = checkout?.orderId === null ? null : Number(checkout?.orderId);
    if (
      checkout?.version !== PENDING_CHECKOUT_VERSION
      || checkout?.userId !== scope.userId
      || checkout?.deviceId !== scope.deviceId
      || !Number.isFinite(updatedAt)
      || now - updatedAt > PENDING_CHECKOUT_MAX_AGE_MS
      || typeof checkout?.signature !== 'string'
      || !checkout.signature
      || typeof checkout?.idempotencyKey !== 'string'
      || !checkout.idempotencyKey
      || (orderId !== null && (!Number.isInteger(orderId) || orderId <= 0))
    ) {
      localStorage.removeItem(getStorageKey(scope));
      return null;
    }

    return checkout;
  } catch {
    return null;
  }
}

export function writePendingCheckout(scope, checkout, now = Date.now()) {
  if (!scope) return;

  try {
    localStorage.setItem(getStorageKey(scope), JSON.stringify({
      ...checkout,
      version: PENDING_CHECKOUT_VERSION,
      userId: scope.userId,
      deviceId: scope.deviceId,
      updatedAt: now,
    }));
  } catch {
    // The hook also retains this value in memory when storage is unavailable.
  }
}

export function clearPendingCheckout(scope) {
  if (!scope) return;

  try {
    localStorage.removeItem(getStorageKey(scope));
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}
