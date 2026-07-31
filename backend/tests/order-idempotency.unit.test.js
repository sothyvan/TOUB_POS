import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderFingerprint,
  normalizeIdempotencyKey,
} from '../src/services/orders/order-idempotency.js';
import { calculateMixedCashSettlement } from '../src/services/orders/cash-payment.service.js';
import { validateExchangeRate } from '../src/services/financial-settings.service.js';
import { mixedCurrencySettlementColumns } from '../src/database/migrations/202607310006-add-mixed-currency-settlement.js';

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
  const khrPriced = buildOrderFingerprint('cash', [
    { product_id: 3, quantity: 2 },
    { product_id: 8, quantity: 1, notes: 'No ice' },
  ], normalizeNotes, 'khr');
  assert.notEqual(first.fingerprint, khrPriced.fingerprint);
  assert.equal(first.fingerprint.length, 64);
});

test('mixed-currency migration defines every immutable settlement field', () => {
  assert.deepEqual(mixedCurrencySettlementColumns, [
    'subtotal_khr', 'total_khr', 'pricing_currency',
    'exchange_rate_khr_per_usd', 'cash_received_khr',
    'change_due_khr', 'change_currency',
  ]);
});

test('mixed USD and KHR cash exactly settles a USD-priced order', () => {
  assert.deepEqual(calculateMixedCashSettlement({
    totalUsd: '10.00', totalKhr: 40000, pricingCurrency: 'usd',
    exchangeRateKhrPerUsd: 4100, cashReceivedUsd: '5.00',
    cashReceivedKhr: 20500,
  }), {
    cashReceivedUsd: '5.00', cashReceivedKhr: 20500,
    changeCurrency: null, changeDueUsd: '0.00', changeDueKhr: 0,
  });
});

test('settlement returns equivalent USD and KHR change amounts', () => {
  const result = calculateMixedCashSettlement({
    totalUsd: '2.50', totalKhr: 10000, pricingCurrency: 'khr',
    exchangeRateKhrPerUsd: 4100, cashReceivedKhr: 15000,
  });
  assert.equal(result.changeDueUsd, '1.22');
  assert.equal(result.changeDueKhr, 5000);
  assert.equal(result.changeCurrency, null);
});

test('mixed cash settlement rejects combined underpayment', () => {
  assert.throws(() => calculateMixedCashSettlement({
    totalUsd: '10.00', totalKhr: 40000, pricingCurrency: 'usd',
    exchangeRateKhrPerUsd: 4100, cashReceivedUsd: '4.00', cashReceivedKhr: 20000,
  }), /Combined cash received/);
});

test('Owner exchange rates are bounded whole-hundred KHR values', () => {
  assert.equal(validateExchangeRate(4100), 4100);
  assert.throws(() => validateExchangeRate(4125), /increments of 100/);
  assert.throws(() => validateExchangeRate(500), /from 1000 to 10000/);
});
