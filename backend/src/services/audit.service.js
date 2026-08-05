import { AuditLog } from '../models/index.js';

export const AUDIT_ACTIONS = Object.freeze({
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  STALL_CREATED: 'stall.created',
  STALL_UPDATED: 'stall.updated',
  STALL_DELETED: 'stall.deleted',
  STAFF_ASSIGNED: 'staff.assigned',
  STAFF_UNASSIGNED: 'staff.unassigned',
  DEVICE_REGISTERED: 'device.registered',
  DEVICE_REVOKED: 'device.revoked',
  TELEGRAM_COOK_AUTHORIZED: 'telegram_cook.authorized',
  TELEGRAM_COOK_REVOKED: 'telegram_cook.revoked',
  TELEGRAM_GROUP_LINK_CREATED: 'telegram_group.link_created',
  TELEGRAM_GROUP_CONNECTED: 'telegram_group.connected',
  TELEGRAM_GROUP_CHAT_MIGRATED: 'telegram_group.chat_migrated',
  FINANCIAL_SETTINGS_UPDATED: 'financial_settings.updated',
});

const ALLOWED_ACTIONS = new Set(Object.values(AUDIT_ACTIONS));
const SENSITIVE_KEY = /(password|passphrase|pin|token|secret|authorization|cookie|csrf|session|telegram_(?:user|chat)_id|device_token)/i;
const MAX_DEPTH = 5;
const MAX_STRING_LENGTH = 500;

function sanitizeValue(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return value.slice(0, MAX_STRING_LENGTH);
  }
  if (depth >= MAX_DEPTH) {
    return '[TRUNCATED]';
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeValue(item, depth + 1, seen));
  }
  if (typeof value !== 'object') {
    return String(value).slice(0, MAX_STRING_LENGTH);
  }
  if (seen.has(value)) {
    return '[CIRCULAR]';
  }
  seen.add(value);

  const safe = {};
  for (const [key, item] of Object.entries(value)) {
    if (!SENSITIVE_KEY.test(key)) {
      safe[key] = sanitizeValue(item, depth + 1, seen);
    }
  }
  return safe;
}

export function sanitizeAuditDetails(details) {
  return details ? sanitizeValue(details) : null;
}

export function resolveAuditOwnerId(actor, explicitOwnerId) {
  if (explicitOwnerId !== undefined && explicitOwnerId !== null) {
    return Number(explicitOwnerId);
  }
  if (actor?.role === 'owner') {
    return Number(actor.id);
  }
  return actor?.owner_id === null || actor?.owner_id === undefined
    ? null
    : Number(actor.owner_id);
}

export function writeAdministrativeAudit({
  actor,
  ownerId,
  action,
  targetType,
  targetId,
  requestId,
  before,
  after,
  metadata,
  transaction,
  auditModel = AuditLog,
}) {
  if (!ALLOWED_ACTIONS.has(action)) {
    throw new Error(`Unsupported administrative audit action: ${action}`);
  }
  const scopedOwnerId = resolveAuditOwnerId(actor, ownerId);
  if (!scopedOwnerId) {
    throw new Error(`Administrative audit action ${action} requires an owner scope.`);
  }
  const detailInput = {
    ...(before === undefined ? {} : { before }),
    ...(after === undefined ? {} : { after }),
    ...(metadata || {}),
  };

  return auditModel.create({
    actor_user_id: actor?.id ?? null,
    owner_id: scopedOwnerId,
    action,
    target_type: targetType,
    target_id: targetId === null || targetId === undefined ? null : String(targetId),
    request_id: requestId || null,
    details: sanitizeAuditDetails(detailInput),
  }, { transaction });
}
