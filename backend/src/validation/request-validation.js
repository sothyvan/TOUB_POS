import { httpError } from '../utils/http-error.util.js';

export const LIMITS = Object.freeze({
  USERNAME: 50,
  PASSWORD: 72,
  CATEGORY_NAME: 100,
  PRODUCT_NAME: 150,
  STALL_NAME: 100,
  STALL_LOCATION: 150,
  IMAGE_URL: 500,
  DEVICE_NAME: 100,
  COOK_NAME: 100,
  ORDER_ITEMS: 100,
  ORDER_ITEM_QUANTITY: 100,
  ORDER_ITEM_NOTES: 500,
  USD_AMOUNT: 99999999.99,
  PRODUCT_USD: 999999.99,
  KHR_AMOUNT: 2147483647,
});

export function validationError(message) {
  return httpError(message, 400, 'VALIDATION_ERROR');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function assertObject(value, label = 'Request body') {
  if (!isPlainObject(value)) {
    throw validationError(`${label} must be a JSON object.`);
  }
  return value;
}

export function assertAllowedFields(value, allowedFields, label = 'Request body') {
  const body = assertObject(value, label);
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length > 0) {
    throw validationError(`${label} contains unsupported fields: ${unknownFields.join(', ')}.`);
  }
  return body;
}

export function assertHasFields(value, label = 'Request body') {
  if (Object.keys(value).length === 0) {
    throw validationError(`${label} must include at least one editable field.`);
  }
}

export function stringField(value, field, {
  required = false,
  min = 1,
  max,
  nullable = false,
  pattern,
} = {}) {
  if (value === undefined) {
    if (required) {
      throw validationError(`${field} is required.`);
    }
    return undefined;
  }
  if (value === null && nullable) {
    return null;
  }
  if (typeof value !== 'string') {
    throw validationError(`${field} must be text.`);
  }
  const normalized = value.trim();
  if (nullable && normalized === '') {
    return null;
  }
  if (normalized.length < min) {
    throw validationError(`${field} must be at least ${min} characters.`);
  }
  if (max && normalized.length > max) {
    throw validationError(`${field} must be ${max} characters or fewer.`);
  }
  if (pattern && !pattern.test(normalized)) {
    throw validationError(`${field} has an invalid format.`);
  }
  return normalized;
}

export function enumField(value, field, values, { required = false } = {}) {
  const normalized = stringField(value, field, { required });
  if (normalized === undefined) {
    return undefined;
  }
  const lower = normalized.toLowerCase();
  if (!values.includes(lower)) {
    throw validationError(`${field} must be one of: ${values.join(', ')}.`);
  }
  return lower;
}

export function booleanField(value, field) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw validationError(`${field} must be true or false.`);
  }
  return value;
}

export function positiveIntegerField(value, field, { required = false, max } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw validationError(`${field} is required.`);
    }
    return undefined;
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw validationError(`${field} must be a positive integer.`);
  }
  if (max !== undefined && number > max) {
    throw validationError(`${field} must be ${max} or less.`);
  }
  return number;
}

export function decimalField(value, field, {
  required = false,
  max,
  decimalPlaces = 2,
} = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw validationError(`${field} is required.`);
    }
    return undefined;
  }
  const text = String(value).trim();
  const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${decimalPlaces}})?$`);
  const number = Number(text);
  if (!pattern.test(text) || !Number.isFinite(number) || number <= 0) {
    throw validationError(`${field} must be a positive number with at most ${decimalPlaces} decimal places.`);
  }
  if (max !== undefined && number > max) {
    throw validationError(`${field} must be ${max} or less.`);
  }
  return number;
}

export function arrayField(value, field, {
  required = false,
  min = 0,
  max,
} = {}) {
  if (value === undefined) {
    if (required) {
      throw validationError(`${field} is required.`);
    }
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw validationError(`${field} must be an array.`);
  }
  if (value.length < min) {
    throw validationError(`${field} must contain at least ${min} item(s).`);
  }
  if (max !== undefined && value.length > max) {
    throw validationError(`${field} must contain ${max} items or fewer.`);
  }
  return value;
}

export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema(req.body ?? {});
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function emptyBody(value) {
  const body = assertAllowedFields(value, []);
  return body;
}
