import {
  Order,
  OrderItem,
  Stall,
  TelegramTicket,
  User,
} from '../../models/index.js';
import { httpError } from '../../utils/http-error.util.js';

const MANAGEMENT_ORDER_ROLES = new Set(['owner', 'manager']);

export function parsePositiveInteger(value, fieldName, { max } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw httpError(`${fieldName} must be a positive integer.`);
  }
  if (max !== undefined && number > max) {
    throw httpError(`${fieldName} must be ${max} or less.`);
  }
  return number;
}

export function parseUsdCents(value, fieldName, { max = 99999999.99 } = {}) {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw httpError(`${fieldName} must be a positive USD amount with up to 2 decimals.`);
  }

  const number = Number(text);
  if (!Number.isFinite(number) || number <= 0) {
    throw httpError(`${fieldName} must be greater than 0.`);
  }
  if (number > max) {
    throw httpError(`${fieldName} must be ${max} or less.`);
  }
  return Math.round(number * 100);
}

export function centsToUsd(cents) {
  return (cents / 100).toFixed(2);
}

export function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

function getActorOwnerId(actor) {
  const actorRole = String(actor?.role || '').toLowerCase();
  if (actorRole === 'owner') {
    return Number(actor.id);
  }
  if (actorRole === 'manager') {
    return Number(actor.owner_id);
  }
  return null;
}

export function getOrderOwnerId(order) {
  return Number(order?.Stall?.owner_id ?? order?.stall?.owner_id);
}

export function canAccessOrder(order, actor) {
  const actorId = Number(actor?.id);
  const actorRole = String(actor?.role || '').toLowerCase();
  if (actorRole === 'cashier') {
    return Number(order.cashier_id) === actorId;
  }
  if (!MANAGEMENT_ORDER_ROLES.has(actorRole)) {
    return false;
  }

  const actorOwnerId = getActorOwnerId(actor);
  const orderOwnerId = getOrderOwnerId(order);
  return Number.isInteger(actorOwnerId)
    && Number.isInteger(orderOwnerId)
    && actorOwnerId > 0
    && actorOwnerId === orderOwnerId;
}

export function isKhqrExpired(order) {
  return Boolean(
    order.payment_expires_at
    && new Date(order.payment_expires_at).getTime() < Date.now()
  );
}

export function buildOrderInclude() {
  return [
    {
      model: OrderItem,
      as: 'Items',
    },
    {
      model: TelegramTicket,
      as: 'TelegramTickets',
    },
    {
      model: Stall,
      attributes: ['id', 'name', 'location', 'telegram_chat_id'],
    },
    {
      model: User,
      as: 'Cashier',
      attributes: ['id', 'username', 'role'],
    },
  ];
}

export function buildOrderAccessInclude() {
  return [
    {
      model: Stall,
      attributes: ['id', 'owner_id'],
    },
  ];
}

export function getOrderById(orderId) {
  return Order.findByPk(orderId, {
    include: buildOrderInclude(),
  });
}

export function buildPaymentConfirmedPayload(order) {
  return {
    orderId: order.id,
    status: order.status,
    paymentMethod: order.payment_method,
    totalUsd: Number(order.total_usd),
    completedAt: order.completed_at,
  };
}
