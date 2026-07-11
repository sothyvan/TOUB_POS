import { Op, fn, col, literal } from 'sequelize';
import { sequelize, Order, Stall, TelegramTicket, User } from '../models/index.js';
import { parsePagination, buildOrderClause, buildPaginationMeta } from '../utils/pagination.js';

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
  if (hour === 0) return '12AM';
  if (hour === 12) return '12PM';
  if (hour > 12) return `${hour - 12}PM`;
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

/**
 * SQL-based summary aggregation — runs COUNT + SUM over the matched orders.
 */
async function fetchSqlSummary(ownerId, orderWhere) {
  const results = await sequelize.query(`
    SELECT
      COUNT(o.id) AS totalOrders,
      SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) AS paidOrders,
      COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.total_usd ELSE 0 END), 0) AS totalRevenue,
      SUM(CASE WHEN o.status = 'paid' AND o.payment_method = 'khqr' THEN 1 ELSE 0 END) AS cashCount,
      COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_method = 'khqr' THEN o.total_usd ELSE 0 END), 0) AS khqrRevenue,
      SUM(CASE WHEN o.status = 'paid' AND o.payment_method != 'khqr' THEN 1 ELSE 0 END) AS cashPaidCount,
      COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_method != 'khqr' THEN o.total_usd ELSE 0 END), 0) AS cashRevenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      ${orderWhere.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${orderWhere.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
  `, {
    replacements: {
      ownerId,
      startDate: orderWhere.startDate,
      endDate: orderWhere.endDate,
      ...(orderWhere.stall_id ? { stallId: orderWhere.stall_id } : {}),
      ...(orderWhere.cashier_id ? { cashierId: orderWhere.cashier_id } : {}),
    },
    type: sequelize.QueryTypes.SELECT,
  });

  const row = results[0] || {};
  const paidOrders = Number(row.paidOrders || 0);
  const totalRevenue = roundUsd(row.totalRevenue || 0);

  return {
    totalOrders: Number(row.totalOrders || 0),
    paidOrders,
    totalRevenue,
    averageOrderValue: paidOrders > 0 ? roundUsd(totalRevenue / paidOrders) : 0,
    paymentMethods: {
      cash: {
        count: Number(row.cashPaidCount || 0),
        revenue: roundUsd(row.cashRevenue || 0),
      },
      khqr: {
        count: Number(row.cashCount || 0),
        revenue: roundUsd(row.khqrRevenue || 0),
      },
    },
  };
}

/**
 * SQL-based stall breakdown aggregation.
 */
async function fetchSqlStallBreakdown(ownerId, orderWhere) {
  const rows = await sequelize.query(`
    SELECT
      s.id AS stallId,
      CASE
        WHEN s.location IS NOT NULL AND s.location != '' THEN CONCAT(s.name, ' — ', s.location)
        ELSE s.name
      END AS stallName,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(o.total_usd), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${orderWhere.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${orderWhere.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY s.id, s.name, s.location
    ORDER BY revenue DESC
  `, {
    replacements: {
      ownerId,
      startDate: orderWhere.startDate,
      endDate: orderWhere.endDate,
      ...(orderWhere.stall_id ? { stallId: orderWhere.stall_id } : {}),
      ...(orderWhere.cashier_id ? { cashierId: orderWhere.cashier_id } : {}),
    },
    type: sequelize.QueryTypes.SELECT,
  });

  return rows.map((r) => ({
    stallId: r.stallId,
    stallName: r.stallName,
    orderCount: Number(r.orderCount),
    revenue: roundUsd(r.revenue),
  }));
}

/**
 * SQL-based cashier breakdown aggregation.
 */
async function fetchSqlCashierBreakdown(ownerId, orderWhere) {
  const rows = await sequelize.query(`
    SELECT
      o.cashier_id AS cashierId,
      u.username AS cashierName,
      CASE
        WHEN s.location IS NOT NULL AND s.location != '' THEN CONCAT(s.name, ' — ', s.location)
        ELSE s.name
      END AS stallName,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(o.total_usd), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    LEFT JOIN users u ON u.id = o.cashier_id
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${orderWhere.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${orderWhere.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY o.cashier_id, u.username, s.name, s.location
    ORDER BY revenue DESC
  `, {
    replacements: {
      ownerId,
      startDate: orderWhere.startDate,
      endDate: orderWhere.endDate,
      ...(orderWhere.stall_id ? { stallId: orderWhere.stall_id } : {}),
      ...(orderWhere.cashier_id ? { cashierId: orderWhere.cashier_id } : {}),
    },
    type: sequelize.QueryTypes.SELECT,
  });

  return rows.map((r) => ({
    cashierId: r.cashierId,
    cashierName: r.cashierName || `Cashier #${r.cashierId}`,
    stallName: r.stallName || '—',
    orderCount: Number(r.orderCount),
    revenue: roundUsd(r.revenue),
  }));
}

/**
 * SQL-based hourly revenue aggregation (24 buckets).
 */
async function fetchSqlHourlyRevenue(ownerId, orderWhere) {
  const rows = await sequelize.query(`
    SELECT
      HOUR(o.created_at) AS hour,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(o.total_usd), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${orderWhere.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${orderWhere.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY HOUR(o.created_at)
    ORDER BY hour ASC
  `, {
    replacements: {
      ownerId,
      startDate: orderWhere.startDate,
      endDate: orderWhere.endDate,
      ...(orderWhere.stall_id ? { stallId: orderWhere.stall_id } : {}),
      ...(orderWhere.cashier_id ? { cashierId: orderWhere.cashier_id } : {}),
    },
    type: sequelize.QueryTypes.SELECT,
  });

  const revenueByHour = new Map();
  for (const r of rows) {
    revenueByHour.set(Number(r.hour), {
      orderCount: Number(r.orderCount),
      revenue: roundUsd(r.revenue),
    });
  }

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHour(hour),
    orderCount: revenueByHour.get(hour)?.orderCount || 0,
    revenue: revenueByHour.get(hour)?.revenue || 0,
  }));
}

/**
 * Fetch paginated ledger rows with Sequelize includes.
 */
async function fetchLedgerOrders(ownerId, orderWhere, pagination) {
  const orderClause = buildOrderClause(
    pagination,
    ['created_at', 'id', 'status', 'total_usd'],
    [['created_at', 'DESC'], ['id', 'DESC']],
  );

  const { rows, count } = await Order.findAndCountAll({
    where: {
      created_at: { [Op.between]: [orderWhere.startDate, orderWhere.endDate] },
      ...(orderWhere.stall_id ? { stall_id: orderWhere.stall_id } : {}),
      ...(orderWhere.cashier_id ? { cashier_id: orderWhere.cashier_id } : {}),
    },
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
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });

  return {
    orders: rows.map(mapReportOrder),
    pagination: buildPaginationMeta(pagination, count),
  };
}

export async function getSalesReport(user, query = {}) {
  const ownerId = getOwnerScope(user);
  const { range, startDate, endDate } = resolveDateRange(query);
  const stallId = parsePositiveId(query.stall_id, 'stall_id');
  const cashierId = parsePositiveId(query.cashier_id, 'cashier_id');
  const pagination = parsePagination(query);

  const orderWhere = {
    startDate,
    endDate,
    ...(stallId ? { stall_id: stallId } : {}),
    ...(cashierId ? { cashier_id: cashierId } : {}),
  };

  const [summary, byStall, byCashier, byHour, ledgerResult] = await Promise.all([
    fetchSqlSummary(ownerId, orderWhere),
    fetchSqlStallBreakdown(ownerId, orderWhere),
    fetchSqlCashierBreakdown(ownerId, orderWhere),
    fetchSqlHourlyRevenue(ownerId, orderWhere),
    fetchLedgerOrders(ownerId, orderWhere, pagination),
  ]);

  return {
    filters: {
      range,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      stallId,
      cashierId,
    },
    summary,
    byStall,
    byCashier,
    byHour,
    orders: ledgerResult.orders,
    pagination: ledgerResult.pagination,
  };
}
