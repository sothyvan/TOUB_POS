import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignStaffBody,
  confirmCashBody,
  createCategoryBody,
  createOrderBody,
  createProductBody,
  createStallBody,
  createUserBody,
  emptyBody,
  loginBody,
  pinLoginBody,
  registerDeviceBody,
  telegramCookBody,
  updateCategoryBody,
  updateProductBody,
  updateStallBody,
  updateUserBody,
} from '../src/validation/mutation-schemas.js';
import { LIMITS } from '../src/validation/request-validation.js';

function assertValidationError(callback, messagePattern) {
  assert.throws(callback, (error) => {
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.match(error.message, messagePattern);
    return true;
  });
}

test('auth schemas normalize valid credentials and reject malformed or unknown input', () => {
  assert.deepEqual(
    loginBody({ username: '  owner  ', password: 'owner123' }),
    { username: 'owner', password: 'owner123' },
  );
  assert.deepEqual(pinLoginBody({ userId: '12', pin: '1111' }), { userId: 12, pin: '1111' });
  assertValidationError(
    () => loginBody({ username: 'owner', password: 'owner123', token: 'unsafe' }),
    /unsupported fields: token/,
  );
  assertValidationError(() => pinLoginBody({ userId: 12, pin: '12ab' }), /invalid format/);
});

test('user schemas enforce bounded credentials, strict roles, booleans, and non-empty updates', () => {
  assert.deepEqual(createUserBody({
    username: 'cashier-a',
    role: 'cashier',
    pin: '1111',
    is_active: false,
  }), {
    username: 'cashier-a',
    role: 'cashier',
    pin: '1111',
    is_active: false,
  });
  assertValidationError(
    () => createUserBody({ username: 'a'.repeat(LIMITS.USERNAME + 1), role: 'cashier', pin: '1111' }),
    /50 characters or fewer/,
  );
  assertValidationError(() => createUserBody({ username: 'x', role: 'admin' }), /must be one of/);
  assertValidationError(() => updateUserBody({}), /at least one editable field/);
  assertValidationError(() => updateUserBody({ is_active: 'true' }), /true or false/);
});

test('product schemas enforce price precision, storage limits, IDs, and supported fields', () => {
  const product = createProductBody({
    name: 'Iced coffee',
    price_usd: '2.50',
    price_khr: 10000,
    category_id: 3,
    stall_ids: [1, '2', 2],
    is_visible: true,
  });
  assert.deepEqual(product.stall_ids, [1, 2]);
  assert.equal(product.price_usd, 2.5);

  assertValidationError(
    () => createProductBody({
      name: 'Bad price',
      price_usd: '1.999',
      price_khr: 8000,
      category_id: 1,
    }),
    /at most 2 decimal places/,
  );
  assertValidationError(
    () => createProductBody({
      name: 'Too expensive',
      price_usd: LIMITS.PRODUCT_USD + 1,
      price_khr: 8000,
      category_id: 1,
    }),
    /must be 999999.99 or less/,
  );
  assertValidationError(() => updateProductBody({ stall_ids: [1, 'bad'] }), /positive integer/);
  assertValidationError(() => updateProductBody({ total_usd: 1 }), /unsupported fields/);
});

test('category and stall schemas enforce model lengths, enums, and editable fields', () => {
  assert.deepEqual(createCategoryBody({ name: ' Drinks ', tone: 'BLUE' }), {
    name: 'Drinks',
    tone: 'blue',
  });
  assertValidationError(() => createCategoryBody({ name: 'Drinks', tone: 'purple' }), /must be one of/);
  assertValidationError(() => updateCategoryBody({}), /at least one editable field/);

  assert.deepEqual(createStallBody({ name: ' Stall A ', location: '' }), {
    name: 'Stall A',
    location: null,
  });
  assertValidationError(
    () => updateStallBody({ location: 'x'.repeat(LIMITS.STALL_LOCATION + 1) }),
    /150 characters or fewer/,
  );
  assertValidationError(() => updateStallBody({ owner_id: 1 }), /unsupported fields/);
});

test('staff, terminal, and Telegram cook schemas reject malformed identifiers and oversized names', () => {
  assert.deepEqual(assignStaffBody({ userId: '7' }), { userId: 7 });
  assertValidationError(() => assignStaffBody({ userId: 0 }), /positive integer/);
  assert.deepEqual(registerDeviceBody({ device_name: ' Counter 1 ' }), { device_name: 'Counter 1' });
  assertValidationError(() => registerDeviceBody({ device_name: 'x' }), /at least 2/);
  assert.deepEqual(telegramCookBody({
    display_name: 'Sophea',
    telegram_user_id: '123456789',
  }), {
    display_name: 'Sophea',
    telegram_user_id: '123456789',
  });
  assertValidationError(
    () => telegramCookBody({ display_name: 'Cook', telegram_user_id: '-1' }),
    /invalid format/,
  );
});

test('order schemas reject trusted fields, oversized carts, invalid quantities, and excessive cash', () => {
  assert.deepEqual(createOrderBody({
    payment_method: 'cash',
    items: [{ productId: '5', quantity: 2, notes: ' No ice ' }],
  }), {
    paymentMethod: 'cash',
    pricingCurrency: 'usd',
    items: [{ product_id: 5, quantity: 2, notes: 'No ice' }],
  });
  assertValidationError(
    () => createOrderBody({
      paymentMethod: 'cash',
      total_usd: 0.01,
      items: [{ product_id: 5, quantity: 1 }],
    }),
    /unsupported fields: total_usd/,
  );
  assertValidationError(
    () => createOrderBody({
      paymentMethod: 'cash',
      items: [{ product_id: 5, quantity: LIMITS.ORDER_ITEM_QUANTITY + 1 }],
    }),
    /must be 100 or less/,
  );
  assertValidationError(
    () => createOrderBody({
      paymentMethod: 'cash',
      items: Array.from(
        { length: LIMITS.ORDER_ITEMS + 1 },
        (_, index) => ({ product_id: index + 1, quantity: 1 }),
      ),
    }),
    /100 items or fewer/,
  );
  assertValidationError(
    () => confirmCashBody({ cash_received_usd: LIMITS.USD_AMOUNT + 0.01 }),
    /must be 99999999.99 or less/,
  );
  assert.deepEqual(confirmCashBody({ cashReceivedUsd: '20.00' }), {
    cash_received_usd: 20,
  });
  assert.deepEqual(confirmCashBody({
    cashReceivedUsd: '5.00',
    cashReceivedKhr: 20500,
  }), {
    cash_received_usd: 5,
    cash_received_khr: 20500,
  });
  assertValidationError(
    () => confirmCashBody({ cashReceivedUsd: '5.00', changeCurrency: 'khr' }),
    /unsupported fields: changeCurrency/,
  );
});

test('bodyless mutation schema rejects accidental or privileged fields', () => {
  assert.deepEqual(emptyBody({}), {});
  assertValidationError(() => emptyBody({ status: 'paid' }), /unsupported fields: status/);
});
