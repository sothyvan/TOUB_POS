import test from 'node:test';
import assert from 'node:assert/strict';

const originalKhqrEnabled = process.env.KHQR_ENABLED;
process.env.KHQR_ENABLED = 'false';

const { isKhqrEnabled, validateEnvironment } = await import('../src/config/env.js');
const { createOrder } = await import('../src/services/orders/order-creation.service.js');
const { checkKhqrPaymentStatus } = await import('../src/services/orders/khqr-payment.service.js');
const { generateKhqrIndividualPayment } = await import('../src/services/khqr-provider.service.js');
const { runKhqrBackgroundCheckOnce } = await import('../src/startup/khqr-background-checker.js');

test('KHQR suspension blocks every Bakong entry point without querying the database', async () => {
  assert.equal(isKhqrEnabled(), false);

  await assert.rejects(
    () => createOrder(1, [{ id: 1, quantity: 1 }], 'khqr'),
    (error) => (
      error.status === 503
      && error.code === 'KHQR_DISABLED'
      && error.message.includes('temporarily unavailable')
    ),
  );

  await assert.rejects(
    () => checkKhqrPaymentStatus(1, { id: 1, role: 'cashier' }),
    (error) => error.status === 503 && error.code === 'KHQR_DISABLED',
  );

  assert.deepEqual(
    await runKhqrBackgroundCheckOnce(),
    { skipped: true, reason: 'khqr_disabled' },
  );
});

test('removed KHQR provider adapter fails closed without a legacy SDK fallback', () => {
  assert.throws(
    () => generateKhqrIndividualPayment(),
    (error) => (
      error.status === 503
      && error.code === 'KHQR_PROVIDER_UNAVAILABLE'
      && error.message.includes('approved payment provider')
    ),
  );
});

test('startup validation rejects attempts to enable KHQR without an approved adapter', () => {
  process.env.KHQR_ENABLED = 'true';
  try {
    assert.throws(
      () => validateEnvironment(),
      (error) => error.message.includes(
        'KHQR_ENABLED must remain false until an approved payment provider adapter is installed.',
      ),
    );
  } finally {
    process.env.KHQR_ENABLED = 'false';
  }
});

test.after(() => {
  if (originalKhqrEnabled === undefined) {
    delete process.env.KHQR_ENABLED;
  } else {
    process.env.KHQR_ENABLED = originalKhqrEnabled;
  }
});
