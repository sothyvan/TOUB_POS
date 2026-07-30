import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderFingerprint,
  normalizeIdempotencyKey,
} from '../src/services/orders/order-idempotency.js';

function normalizeNotes(value) {
  const text = String(value || '').trim();
  return text || null;
}

test('idempotency keys require a bounded safe format', () => {
  assert.equal(
    normalizeIdempotencyKey('0d635ea2-8ea1-46a0-a195-a3ef02032594'),
    '0d635ea2-8ea1-46a0-a195-a3ef02032594',
  );
  assert.throws(
    () => normalizeIdempotencyKey('short'),
    /16-64 characters/,
  );
  assert.throws(
    () => normalizeIdempotencyKey('invalid key with spaces'),
    /16-64 characters/,
  );
});

test('order fingerprints are stable across item ordering but change with request data', () => {
  const first = buildOrderFingerprint('cash', [
    { product_id: 8, quantity: 1, notes: 'No ice' },
    { product_id: 3, quantity: 2 },
  ], normalizeNotes);
  const reordered = buildOrderFingerprint('cash', [
    { product_id: 3, quantity: 2 },
    { product_id: 8, quantity: 1, notes: ' No ice ' },
  ], normalizeNotes);
  const changed = buildOrderFingerprint('cash', [
    { product_id: 3, quantity: 3 },
    { product_id: 8, quantity: 1, notes: 'No ice' },
  ], normalizeNotes);

  assert.equal(first.fingerprint, reordered.fingerprint);
  assert.notEqual(first.fingerprint, changed.fingerprint);
  assert.equal(first.fingerprint.length, 64);
});
