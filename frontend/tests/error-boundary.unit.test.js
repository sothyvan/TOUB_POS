import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFrontendErrorId,
  createFrontendErrorReport,
  reportFrontendRenderError,
  sanitizeComponentStack,
  sanitizeFrontendPath,
} from '../src/utils/frontendErrorReport.js';

test('frontend render error IDs use a non-sensitive correlation value', () => {
  const errorId = createFrontendErrorId({ randomUUID: () => '12345678-1234-4123-8123-123456789abc' });

  assert.equal(errorId, 'ERR-12345678-1234-4123-8123-123456789abc');
});

test('frontend render reports contain only sanitized diagnostic metadata', () => {
  const report = createFrontendErrorReport({
    errorId: 'ERR-safe?token=secret-value',
    pathname: '/cashier?token=secret-value#payment',
    componentStack: `
      at CashierPage (https://pos.example/assets/app.js:1:10)
      at CheckoutDialog (https://pos.example/assets/app.js:2:20)
      raw password=secret-value`,
  });

  assert.deepEqual(report, {
    event: 'frontend_render_error',
    error_id: 'ERR-unavailable',
    route: '/cashier',
    components: ['CashierPage', 'CheckoutDialog'],
  });
  assert.equal(JSON.stringify(report).includes('secret-value#payment'), false);
  assert.equal(JSON.stringify(report).includes('https://'), false);
  assert.equal(JSON.stringify(report).includes('password='), false);
});

test('frontend path and component sanitizers apply safe bounds', () => {
  assert.equal(sanitizeFrontendPath('/orders/customer-name?jwt=secret'), '/_unknown');
  assert.deepEqual(sanitizeComponentStack('at Safe_Component\nat Unsafe Component\nat $Provider'), [
    'Safe_Component',
    'Unsafe',
    '$Provider',
  ]);
});

test('diagnostic delivery cannot break the recovery screen', () => {
  assert.doesNotThrow(() => reportFrontendRenderError(
    { event: 'frontend_render_error' },
    { error: () => { throw new Error('logging unavailable'); } },
  ));
});
