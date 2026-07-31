import {
  LIMITS,
  arrayField,
  assertAllowedFields,
  assertHasFields,
  booleanField,
  decimalField,
  emptyBody,
  enumField,
  positiveIntegerField,
  stringField,
  validationError,
} from './request-validation.js';

const USER_ROLES = ['owner', 'manager', 'cashier'];
const CATEGORY_TONES = ['gold', 'green', 'blue', 'rose'];

function credentials(body, output, { create = false } = {}) {
  if (body.password !== undefined) {
    output.password = stringField(body.password, 'password', {
      min: create ? 8 : 1,
      max: LIMITS.PASSWORD,
    });
  }
  if (body.pin !== undefined) {
    output.pin = stringField(body.pin, 'pin', { pattern: /^\d{4}$/ });
  }
}

export function loginBody(value) {
  const body = assertAllowedFields(value, ['username', 'password']);
  return {
    username: stringField(body.username, 'username', { required: true, max: LIMITS.USERNAME }),
    password: stringField(body.password, 'password', { required: true, max: LIMITS.PASSWORD }),
  };
}

export function pinLoginBody(value) {
  const body = assertAllowedFields(value, ['userId', 'pin']);
  return {
    userId: positiveIntegerField(body.userId, 'userId', { required: true }),
    pin: stringField(body.pin, 'pin', { required: true, pattern: /^\d{4}$/ }),
  };
}

export function createUserBody(value) {
  const body = assertAllowedFields(value, ['username', 'role', 'password', 'pin', 'is_active']);
  const output = {
    username: stringField(body.username, 'username', { required: true, max: LIMITS.USERNAME }),
    role: enumField(body.role, 'role', USER_ROLES, { required: true }),
  };
  credentials(body, output, { create: true });
  if (body.is_active !== undefined) {
    output.is_active = booleanField(body.is_active, 'is_active');
  }
  return output;
}

export function updateUserBody(value) {
  const body = assertAllowedFields(value, ['username', 'role', 'password', 'pin', 'is_active']);
  assertHasFields(body);
  const output = {};
  if (body.username !== undefined) {
    output.username = stringField(body.username, 'username', { max: LIMITS.USERNAME });
  }
  if (body.role !== undefined) {
    output.role = enumField(body.role, 'role', USER_ROLES);
  }
  credentials(body, output);
  if (body.is_active !== undefined) {
    output.is_active = booleanField(body.is_active, 'is_active');
  }
  return output;
}

function parseStallIds(body) {
  if (body.stall_ids !== undefined && body.stall_id !== undefined) {
    throw validationError('Use either stall_id or stall_ids, not both.');
  }
  if (body.stall_ids !== undefined) {
    const values = arrayField(body.stall_ids, 'stall_ids', { max: 100 });
    return [...new Set(values.map((id) => positiveIntegerField(id, 'stall_ids item', { required: true })))];
  }
  if (body.stall_id !== undefined) {
    return [positiveIntegerField(body.stall_id, 'stall_id', { required: true })];
  }
  return undefined;
}

function productBody(value, { create }) {
  const body = assertAllowedFields(value, [
    'name',
    'price_usd',
    'price_khr',
    'image_url',
    'is_visible',
    'category_id',
    'stall_id',
    'stall_ids',
  ]);
  if (!create) {
    assertHasFields(body);
  }
  const output = {};
  if (create || body.name !== undefined) {
    output.name = stringField(body.name, 'name', { required: create, max: LIMITS.PRODUCT_NAME });
  }
  if (create || body.price_usd !== undefined) {
    output.price_usd = decimalField(body.price_usd, 'price_usd', {
      required: create,
      max: LIMITS.PRODUCT_USD,
    });
  }
  if (create || body.price_khr !== undefined) {
    output.price_khr = positiveIntegerField(body.price_khr, 'price_khr', {
      required: create,
      max: LIMITS.KHR_AMOUNT,
    });
  }
  if (body.image_url !== undefined) {
    output.image_url = stringField(body.image_url, 'image_url', {
      max: LIMITS.IMAGE_URL,
      nullable: true,
    });
  }
  if (body.is_visible !== undefined) {
    output.is_visible = booleanField(body.is_visible, 'is_visible');
  }
  if (create || body.category_id !== undefined) {
    output.category_id = positiveIntegerField(body.category_id, 'category_id', { required: create });
  }
  const stallIds = parseStallIds(body);
  if (stallIds !== undefined) {
    output.stall_ids = stallIds;
  }
  return output;
}

export const createProductBody = (value) => productBody(value, { create: true });
export const updateProductBody = (value) => productBody(value, { create: false });

function categoryBody(value, { create }) {
  const body = assertAllowedFields(value, ['name', 'tone']);
  if (!create) {
    assertHasFields(body);
  }
  const output = {};
  if (create || body.name !== undefined) {
    output.name = stringField(body.name, 'name', { required: create, max: LIMITS.CATEGORY_NAME });
  }
  if (body.tone !== undefined) {
    output.tone = enumField(body.tone, 'tone', CATEGORY_TONES);
  }
  return output;
}

export const createCategoryBody = (value) => categoryBody(value, { create: true });
export const updateCategoryBody = (value) => categoryBody(value, { create: false });

function stallBody(value, { create }) {
  const body = assertAllowedFields(value, ['name', 'location']);
  if (!create) {
    assertHasFields(body);
  }
  const output = {};
  if (create || body.name !== undefined) {
    output.name = stringField(body.name, 'name', { required: create, max: LIMITS.STALL_NAME });
  }
  if (body.location !== undefined) {
    output.location = stringField(body.location, 'location', {
      max: LIMITS.STALL_LOCATION,
      nullable: true,
    });
  }
  return output;
}

export const createStallBody = (value) => stallBody(value, { create: true });
export const updateStallBody = (value) => stallBody(value, { create: false });

export function assignStaffBody(value) {
  const body = assertAllowedFields(value, ['userId']);
  return { userId: positiveIntegerField(body.userId, 'userId', { required: true }) };
}

export function registerDeviceBody(value) {
  const body = assertAllowedFields(value, ['device_name']);
  return {
    device_name: stringField(body.device_name, 'device_name', {
      required: true,
      min: 2,
      max: LIMITS.DEVICE_NAME,
    }),
  };
}

export function telegramCookBody(value) {
  const body = assertAllowedFields(value, ['display_name', 'telegram_user_id']);
  return {
    display_name: stringField(body.display_name, 'display_name', {
      required: true,
      min: 2,
      max: LIMITS.COOK_NAME,
    }),
    telegram_user_id: stringField(body.telegram_user_id, 'telegram_user_id', {
      required: true,
      pattern: /^[1-9]\d{0,18}$/,
    }),
  };
}

function orderItem(value, index) {
  const body = assertAllowedFields(
    value,
    ['product_id', 'productId', 'id', 'quantity', 'notes'],
    `items[${index}]`,
  );
  const suppliedIds = ['product_id', 'productId', 'id'].filter((field) => body[field] !== undefined);
  if (suppliedIds.length !== 1) {
    throw validationError(`items[${index}] must include exactly one product ID field.`);
  }
  return {
    product_id: positiveIntegerField(body[suppliedIds[0]], `items[${index}].product_id`, { required: true }),
    quantity: positiveIntegerField(body.quantity, `items[${index}].quantity`, {
      required: true,
      max: LIMITS.ORDER_ITEM_QUANTITY,
    }),
    notes: stringField(body.notes, `items[${index}].notes`, {
      max: LIMITS.ORDER_ITEM_NOTES,
      nullable: true,
    }),
  };
}

export function createOrderBody(value) {
  const body = assertAllowedFields(value, ['paymentMethod', 'payment_method', 'pricingCurrency', 'pricing_currency', 'items']);
  if (body.paymentMethod !== undefined && body.payment_method !== undefined) {
    throw validationError('Use either paymentMethod or payment_method, not both.');
  }
  const items = arrayField(body.items, 'items', {
    required: true,
    min: 1,
    max: LIMITS.ORDER_ITEMS,
  });
  return {
    paymentMethod: enumField(
      body.paymentMethod ?? body.payment_method,
      'paymentMethod',
      ['cash', 'khqr'],
      { required: true },
    ),
    pricingCurrency: enumField(
      body.pricingCurrency ?? body.pricing_currency ?? 'usd',
      'pricingCurrency',
      ['usd', 'khr'],
      { required: true },
    ),
    items: items.map(orderItem),
  };
}

export function confirmCashBody(value) {
  const body = assertAllowedFields(value, [
    'cash_received_usd', 'cashReceivedUsd',
    'cash_received_khr', 'cashReceivedKhr',
  ]);
  if (body.cash_received_usd !== undefined && body.cashReceivedUsd !== undefined) {
    throw validationError('Use either cash_received_usd or cashReceivedUsd, not both.');
  }
  if (body.cash_received_khr !== undefined && body.cashReceivedKhr !== undefined) {
    throw validationError('Use either cash_received_khr or cashReceivedKhr, not both.');
  }
  const cashReceivedUsd = decimalField(
    body.cash_received_usd ?? body.cashReceivedUsd,
    'cash_received_usd',
    { max: LIMITS.USD_AMOUNT },
  );
  const cashReceivedKhr = positiveIntegerField(
    body.cash_received_khr ?? body.cashReceivedKhr,
    'cash_received_khr',
    { max: LIMITS.KHR_AMOUNT },
  );
  if (cashReceivedUsd === undefined && cashReceivedKhr === undefined) {
    throw validationError('At least one received cash amount is required.');
  }
  return {
    ...(cashReceivedUsd === undefined ? {} : { cash_received_usd: cashReceivedUsd }),
    ...(cashReceivedKhr === undefined ? {} : { cash_received_khr: cashReceivedKhr }),
  };
}

export function updateFinancialSettingsBody(value) {
  const body = assertAllowedFields(value, ['exchange_rate_khr_per_usd']);
  const rate = positiveIntegerField(
    body.exchange_rate_khr_per_usd,
    'exchange_rate_khr_per_usd',
    { required: true, max: 10000 },
  );
  if (rate < 1000 || rate % 100 !== 0) {
    throw validationError('exchange_rate_khr_per_usd must be from 1000 to 10000 in increments of 100.');
  }
  return { exchange_rate_khr_per_usd: rate };
}

export { emptyBody };
