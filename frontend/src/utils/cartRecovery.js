import { readStoredDeviceInfo } from '../features/auth/authStorage';

const CART_STORAGE_PREFIX = 'toub-cart';
const CART_STORAGE_VERSION = 1;
const CART_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function createCashierRecoveryScope(user) {
  if (String(user?.apiRole || user?.role || '').toLowerCase() !== 'cashier') {
    return null;
  }

  const userId = positiveInteger(user?.id);
  if (!userId) return null;

  const deviceId = positiveInteger(readStoredDeviceInfo()?.id);
  return {
    userId,
    deviceId,
    key: `${userId}:${deviceId || 'unregistered'}`,
  };
}

function getStorageKey(scope) {
  return `${CART_STORAGE_PREFIX}:${scope.key}`;
}

export function readRecoveredCart(scope, now = Date.now()) {
  if (!scope) return [];

  try {
    const raw = localStorage.getItem(getStorageKey(scope));
    if (!raw) return [];

    const record = JSON.parse(raw);
    const updatedAt = Number(record?.updatedAt);
    if (
      record?.version !== CART_STORAGE_VERSION
      || record?.userId !== scope.userId
      || record?.deviceId !== scope.deviceId
      || !Number.isFinite(updatedAt)
      || now - updatedAt > CART_MAX_AGE_MS
      || !Array.isArray(record?.items)
    ) {
      localStorage.removeItem(getStorageKey(scope));
      return [];
    }

    return record.items
      .map((item) => ({
        id: positiveInteger(item?.id),
        quantity: positiveInteger(item?.quantity),
        notes: String(item?.notes || '').trim(),
      }))
      .filter((item) => item.id && item.quantity);
  } catch {
    return [];
  }
}

export function writeRecoveredCart(scope, cart, now = Date.now()) {
  if (!scope) return;

  try {
    if (!cart.length) {
      localStorage.removeItem(getStorageKey(scope));
      return;
    }

    const items = cart
      .map(({ id, quantity, notes }) => ({
        id: positiveInteger(id),
        quantity: positiveInteger(quantity),
        ...(notes ? { notes: String(notes).trim() } : {}),
      }))
      .filter((item) => item.id && item.quantity);

    if (!items.length) {
      localStorage.removeItem(getStorageKey(scope));
      return;
    }

    localStorage.setItem(getStorageKey(scope), JSON.stringify({
      version: CART_STORAGE_VERSION,
      userId: scope.userId,
      deviceId: scope.deviceId,
      updatedAt: now,
      items,
    }));
  } catch {
    // Checkout remains usable when browser storage is unavailable.
  }
}

export function clearRecoveredCart(scope) {
  if (!scope) return;

  try {
    localStorage.removeItem(getStorageKey(scope));
  } catch {
    // Browser storage can be unavailable in restricted contexts.
  }
}

export function reconcileRecoveredCart(items, products, categoryById) {
  const productById = new Map(
    products
      .filter((product) => product.available !== false)
      .map((product) => [Number(product.id), product]),
  );

  return items.flatMap((item) => {
    const product = productById.get(Number(item.id));
    if (!product) return [];

    return [{
      ...product,
      categoryName: categoryById.get(product.categoryId)?.name || 'Menu',
      quantity: item.quantity,
      ...(item.notes ? { notes: item.notes } : {}),
    }];
  });
}
