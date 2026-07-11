import { Op } from 'sequelize';
import { Order, Stall, TelegramTicket, User } from '../models/index.js';

const REPORT_RANGES = new Set(['today', 'week', 'month', 'custom']);

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function roundUsd(value) {
  return Number(Number(value || 0).toFixed(2));
}

function parseDateOnly(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw httpError('Dates must use YYYY-MM-DD format.');
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw httpError('Invalid report date.');
  }

  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date;
}

function resolveDateRange({ range = 'today', start_date, end_date }) {
  const normalizedRange = String(range || 'today').toLowerCase();
  if (!REPORT_RANGES.has(normalizedRange)) {
    throw httpError('Report range must be today, week, month, or custom.');
  }

  if (start_date || end_date || normalizedRange === 'custom') {
    const startDate = parseDateOnly(start_date);
    const endDate = parseDateOnly(end_date || start_date, true);
    if (!startDate || !endDate) {
      throw httpError('Custom reports require start_date and end_date.');
    }
    if (startDate > endDate) {
      throw httpError('start_date must be before or equal to end_date.');
    }
    return { range: 'custom', startDate, endDate };
  }

  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);

  if (normalizedRange === 'today') {
    startDate.setHours(0, 0, 0, 0);
  }

  if (normalizedRange === 'week') {
    startDate.setDate(now.getDate() - now.getDay());
    startDate.setHours(0, 0, 0, 0);
  }

  if (normalizedRange === 'month') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  }

  endDate.setHours(23, 59, 59, 999);
  return { range: normalizedRange, startDate, endDate };
}

function parsePositiveId(value, fieldName) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw httpError(`${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function getOwnerScope(user) {
  const ownerId = user.role === 'owner' ? user.id : user.owner_id;
  if (!ownerId) {
    throw httpError('Unable to resolve report owner scope.', 403);
  }
  return ownerId;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHour(hour) {
  if (hour === 0) {
    return '12AM';
  }
  if (hour === 12) {
    return '12PM';
  }
  if (hour > 12) {
    return `${hour - 12}PM`;
  }
  return `${hour}AM`;
}

function mapTickets(tickets = []) {
  return tickets
    .map((ticket) => ({
      id: ticket.id,
      status: ticket.status,
      sent_at: ticket.sent_at,
      completed_at: ticket.completed_at,
    }))
    .sort((a, b) => Number(b.id) - Number(a.id));
}

function mapReportOrder(order) {
  const telegramTickets = mapTickets(order.TelegramTickets || []);
  const latestTicket = telegramTickets[0] || null;
  const stall = order.Stall;
  const cashier = order.Cashier;
  const createdAt = order.created_at || order.createdAt;
  const completedAt = order.completed_at || order.completedAt;

  return {
    id: order.id,
    created_at: createdAt,
    completed_at: completedAt,
    status: order.status,
    payment_method: order.payment_method,
    total_usd: roundUsd(order.total_usd),
    subtotal_usd: roundUsd(order.subtotal_usd),
    stall_id: order.stall_id,
    stall_name: stall?.location ? `${stall.name} — ${stall.location}` : stall?.name,
    cashier_id: order.cashier_id,
    cashier_name: cashier?.username,
    kitchen_status: latestTicket?.status || (order.status === 'paid' ? 'not_sent' : 'not_ready'),
    telegram_tickets: telegramTickets,
  };
}

function summarizePaidOrders(orders) {
  const summary = {
    totalOrders: orders.length,
    paidOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    paymentMethods: {
      cash: { count: 0, revenue: 0 },
      khqr: { count: 0, revenue: 0 },
    },
  };

  for (const order of orders) {
    if (order.status !== 'paid') {
      continue;
    }

    const amount = Number(order.total_usd || 0);
    const method = order.payment_method === 'khqr' ? 'khqr' : 'cash';
    summary.paidOrders += 1;
    summary.totalRevenue += amount;
    summary.paymentMethods[method].count += 1;
    summary.paymentMethods[method].revenue += amount;
  }

  summary.totalRevenue = roundUsd(summary.totalRevenue);
  summary.averageOrderValue = summary.paidOrders > 0
    ? roundUsd(summary.totalRevenue / summary.paidOrders)
    : 0;
  summary.paymentMethods.cash.revenue = roundUsd(summary.paymentMethods.cash.revenue);
  summary.paymentMethods.khqr.revenue = roundUsd(summary.paymentMethods.khqr.revenue);

  return summary;
}

function buildStallBreakdown(orders) {
  const byStall = new Map();

  for (const order of orders) {
    if (order.status !== 'paid') {
      continue;
    }

    const stall = order.Stall;
    const stallId = order.stall_id;
    const current = byStall.get(stallId) || {
      stallId,
      stallName: stall?.location ? `${stall.name} — ${stall.location}` : stall?.name || `Stall #${stallId}`,
      orderCount: 0,
      revenue: 0,
    };
    current.orderCount += 1;
    current.revenue += Number(order.total_usd || 0);
    byStall.set(stallId, current);
  }

  return Array.from(byStall.values())
    .map((entry) => ({ ...entry, revenue: roundUsd(entry.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildCashierBreakdown(orders) {
  const byCashier = new Map();

  for (const order of orders) {
    if (order.status !== 'paid') {
      continue;
    }

    const cashierId = order.cashier_id;
    const current = byCashier.get(cashierId) || {
      cashierId,
      cashierName: order.Cashier?.username || `Cashier #${cashierId}`,
      stallName: order.Stall?.location ? `${order.Stall.name} — ${order.Stall.location}` : order.Stall?.name || '—',
      orderCount: 0,
      revenue: 0,
    };
    current.orderCount += 1;
    current.revenue += Number(order.total_usd || 0);
    byCashier.set(cashierId, current);
  }

  return Array.from(byCashier.values())
    .map((entry) => ({ ...entry, revenue: roundUsd(entry.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildHourlyRevenue(orders) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHour(hour),
    orderCount: 0,
    revenue: 0,
  }));

  for (const order of orders) {
    if (order.status !== 'paid') {
      continue;
    }

    const hour = new Date(order.created_at || order.createdAt).getHours();
    buckets[hour].orderCount += 1;
    buckets[hour].revenue += Number(order.total_usd || 0);
  }

  return buckets.map((entry) => ({
    ...entry,
    revenue: roundUsd(entry.revenue),
  }));
}

export async function getSalesReport(user, query = {}) {
  const ownerId = getOwnerScope(user);
  const { range, startDate, endDate } = resolveDateRange(query);
  const stallId = parsePositiveId(query.stall_id, 'stall_id');
  const cashierId = parsePositiveId(query.cashier_id, 'cashier_id');

  const orderWhere = {
    created_at: {
      [Op.between]: [startDate, endDate],
    },
    ...(stallId ? { stall_id: stallId } : {}),
    ...(cashierId ? { cashier_id: cashierId } : {}),
  };

  const orders = await Order.findAll({
    where: orderWhere,
    include: [
      {
        model: Stall,
        attributes: ['id', 'name', 'location', 'owner_id'],
        where: { owner_id: ownerId },
      },
      {
        model: User,
        as: 'Cashier',
        attributes: ['id', 'username', 'role'],
      },
      {
        model: TelegramTicket,
        as: 'TelegramTickets',
        attributes: ['id', 'status', 'sent_at', 'completed_at'],
      },
    ],
    order: [['created_at', 'DESC'], ['id', 'DESC']],
  });

  return {
    filters: {
      range,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      stallId,
      cashierId,
    },
    summary: summarizePaidOrders(orders),
    byStall: buildStallBreakdown(orders),
    byCashier: buildCashierBreakdown(orders),
    byHour: buildHourlyRevenue(orders),
    orders: orders.map(mapReportOrder),
  };
}
