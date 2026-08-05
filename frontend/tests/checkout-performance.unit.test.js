import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOrderSnapshotIfCurrent,
  completeCheckoutWithoutBlocking,
  mergeConfirmedOrder,
} from '../src/utils/checkoutCompletion.js';

test('confirmed order merge replaces the matching snapshot without mutating input', () => {
  const original = [
    { id: 8, status: 'pending_payment', total: 4 },
    { id: 7, status: 'paid', total: 3 },
  ];

  const merged = mergeConfirmedOrder(original, { id: 8, status: 'paid' });

  assert.deepEqual(merged, [
    { id: 8, status: 'paid', total: 4 },
    { id: 7, status: 'paid', total: 3 },
  ]);
  assert.notEqual(merged, original);
  assert.deepEqual(original[0], { id: 8, status: 'pending_payment', total: 4 });
});

test('confirmed order merge prepends an order missing from the current page', () => {
  const merged = mergeConfirmedOrder(
    [{ id: 7, status: 'paid' }],
    { id: 9, status: 'paid' },
  );

  assert.deepEqual(merged.map((order) => order.id), [9, 7]);
});

test('successful checkout returns before the guarded order refresh settles', async () => {
  const finalOrder = { id: 10, status: 'paid' };
  let refreshStarted = false;
  let resolveRefresh;
  const refreshPromise = new Promise((resolve) => {
    resolveRefresh = resolve;
  });
  const calls = [];
  let localOrders = [{ id: 10, status: 'pending_payment' }];

  const result = completeCheckoutWithoutBlocking({
    finalOrder,
    updateOrders: (updater) => {
      localOrders = updater(localOrders);
      calls.push('orders');
    },
    clearPendingCheckout: () => calls.push('pending'),
    clearCart: () => calls.push('cart'),
    refreshOrders: () => {
      refreshStarted = true;
      return refreshPromise;
    },
  });

  assert.equal(result, finalOrder);
  assert.deepEqual(localOrders, [{ id: 10, status: 'paid' }]);
  assert.deepEqual(calls, ['orders', 'pending', 'cart']);
  assert.equal(refreshStarted, false);

  await Promise.resolve();
  assert.equal(refreshStarted, true);
  resolveRefresh([]);
  await refreshPromise;
});

test('background refresh rejection cannot change successful checkout completion', async () => {
  const finalOrder = { id: 11, status: 'paid' };
  let refreshError = null;
  const result = completeCheckoutWithoutBlocking({
    finalOrder,
    updateOrders: () => {},
    clearPendingCheckout: () => {},
    clearCart: () => {},
    refreshOrders: () => Promise.reject(new Error('refresh unavailable')),
    onRefreshError: (error) => {
      refreshError = error;
    },
  });

  assert.equal(result, finalOrder);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshError?.message, 'refresh unavailable');
});

test('an order snapshot started before checkout confirmation cannot overwrite local success', () => {
  let appliedOrders = null;

  const applied = applyOrderSnapshotIfCurrent({
    requestGeneration: 4,
    currentGeneration: 5,
    orders: [{ id: 12, status: 'pending_payment' }],
    applySnapshot: (orders) => {
      appliedOrders = orders;
    },
  });

  assert.equal(applied, false);
  assert.equal(appliedOrders, null);
});
