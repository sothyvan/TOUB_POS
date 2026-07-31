import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCurrentDisplayTotal,
  CURRENT_FINANCIAL_POLICY,
} from '../config/financial-policy.js';

test('current release does not enable service fees or taxes', () => {
  assert.equal(CURRENT_FINANCIAL_POLICY.serviceFeesEnabled, false);
  assert.equal(CURRENT_FINANCIAL_POLICY.taxesEnabled, false);
  assert.equal(CURRENT_FINANCIAL_POLICY.totalRule, 'item_subtotal_only');
});

test('current display total equals the item subtotal without adjustments', () => {
  assert.equal(calculateCurrentDisplayTotal(12.5), 12.5);
  assert.equal(calculateCurrentDisplayTotal('7.25'), 7.25);
  assert.equal(calculateCurrentDisplayTotal(undefined), 0);
});

