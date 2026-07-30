const PENDING_CHECKOUT_PREFIX = 'toub-pending-checkout';

function getStorageKey(userId) {
  return `${PENDING_CHECKOUT_PREFIX}:${userId}`;
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

export function readPendingCheckout(userId) {
  try {
    const value = sessionStorage.getItem(getStorageKey(userId));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writePendingCheckout(userId, checkout) {
  try {
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(checkout));
  } catch {
    // The hook also retains this value in memory when storage is unavailable.
  }
}

export function clearPendingCheckout(userId) {
  try {
    sessionStorage.removeItem(getStorageKey(userId));
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}
