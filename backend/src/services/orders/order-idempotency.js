import { createHash } from 'node:crypto';
import { httpError } from '../../utils/http-error.util.js';
import { parsePositiveInteger } from './order-access.js';
import { LIMITS } from '../../validation/request-validation.js';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,64}$/;

export function normalizeIdempotencyKey(value) {
  if (typeof value !== 'string') {
    throw httpError('Idempotency-Key header is required.');
  }

  const key = value.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw httpError('Idempotency-Key must be 16-64 characters using letters, numbers, dot, underscore, colon, or hyphen.');
  }
  return key;
}

export function buildOrderFingerprint(paymentMethod, items, normalizeNotes, pricingCurrency = 'usd') {
  const normalizedItems = items.map((item) => ({
    product_id: parsePositiveInteger(
      item.product_id ?? item.productId ?? item.id,
      'product_id',
    ),
    quantity: parsePositiveInteger(
      item.quantity,
      'quantity',
      { max: LIMITS.ORDER_ITEM_QUANTITY },
    ),
    notes: normalizeNotes(item.notes),
  }));

  const canonicalItems = [...normalizedItems].sort((left, right) => (
    left.product_id - right.product_id
    || left.quantity - right.quantity
    || String(left.notes || '').localeCompare(String(right.notes || ''))
  ));
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({
      payment_method: paymentMethod,
      pricing_currency: pricingCurrency,
      items: canonicalItems,
    }))
    .digest('hex');

  return { fingerprint, normalizedItems };
}
