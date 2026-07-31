import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateMixedCashPreview,
  calculateCurrentDisplayTotal,
  convertKhrPriceToUsd,
  convertUsdPriceToKhr,
  CURRENT_FINANCIAL_POLICY,
} from '../config/financial-policy.js';

test('current release does not enable service fees or taxes', () => {
  assert.equal(CURRENT_FINANCIAL_POLICY.serviceFeesEnabled, false);
  assert.equal(CURRENT_FINANCIAL_POLICY.taxesEnabled, false);
  assert.equal(CURRENT_FINANCIAL_POLICY.totalRule, 'item_subtotal_only');
});

test('mixed cash preview keeps USD and KHR inputs independent', () => {
  assert.deepEqual(calculateMixedCashPreview({
    totalUsd: 10,
    totalKhr: 40000,
    pricingCurrency: 'usd',
    exchangeRateKhrPerUsd: 4100,
    cashReceivedUsd: 5,
    cashReceivedKhr: 20500,
  }), {
    isValid: true,
    isUnderpaid: false,
    changeUsd: 0,
    changeKhr: 0,
  });
});

test('product prices synchronize in both directions using the saved rate', () => {
  assert.equal(convertUsdPriceToKhr('3.50', 4000), '14000');
  assert.equal(convertKhrPriceToUsd('14000', 4000), '3.50');
});

test('mixed cash preview exposes both equivalent change amounts', () => {
  assert.deepEqual(calculateMixedCashPreview({
    totalUsd: 3.5,
    totalKhr: 14000,
    pricingCurrency: 'usd',
    exchangeRateKhrPerUsd: 4000,
    cashReceivedUsd: 5,
  }), {
    isValid: true,
    isUnderpaid: false,
    changeUsd: 1.5,
    changeKhr: 6000,
  });
});

test('current display total equals the item subtotal without adjustments', () => {
  assert.equal(calculateCurrentDisplayTotal(12.5), 12.5);
  assert.equal(calculateCurrentDisplayTotal('7.25'), 7.25);
  assert.equal(calculateCurrentDisplayTotal(undefined), 0);
});

