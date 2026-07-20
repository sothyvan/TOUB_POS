import { Op } from 'sequelize';
import { sequelize, Order, Stall, TelegramTicket, User } from '../models/index.js';
import { parsePagination, buildOrderClause, buildPaginationMeta } from '../utils/pagination.js';

const REPORT_RANGES = new Set(['today', 'week', 'month', 'custom']);
const REPORT_TIMEZONE_OFFSET = process.env.REPORT_TIMEZONE_OFFSET || '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseTimezoneOffsetMinutes(value) {
  const match = String(value).match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error('REPORT_TIMEZONE_OFFSET must use +HH:MM or -HH:MM format.');
  }

  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) {
    throw new Error('REPORT_TIMEZONE_OFFSET must be between -14:00 and +14:00.');
  }

  const direction = match[1] === '-' ? -1 : 1;
  return direction * ((hours * 60) + minutes);
}

const REPORT_TIMEZONE_OFFSET_MINUTES = parseTimezoneOffsetMinutes(REPORT_TIMEZONE_OFFSET);
const REPORT_TIMEZONE_OFFSET_MS = REPORT_TIMEZONE_OFFSET_MINUTES * 60 * 1000;

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
  const validationDate = new Date(Date.UTC(year, month - 1, day));
  if (
    validationDate.getUTCFullYear() !== year
    || validationDate.getUTCMonth() !== month - 1
    || validationDate.getUTCDate() !== day
  ) {
    throw httpError('Invalid report date.');
  }

  const utcTimestamp = Date.UTC(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ) - REPORT_TIMEZONE_OFFSET_MS;
  return new Date(utcTimestamp);
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

  const localNow = new Date(Date.now() + REPORT_TIMEZONE_OFFSET_MS);
  let startYear = localNow.getUTCFullYear();
  let startMonth = localNow.getUTCMonth();
  let startDay = localNow.getUTCDate();

  if (normalizedRange === 'week') {
    const daysSinceMonday = (localNow.getUTCDay() + 6) % 7;
    const weekStart = new Date(Date.UTC(startYear, startMonth, startDay - daysSinceMonday));
    startYear = weekStart.getUTCFullYear();
    startMonth = weekStart.getUTCMonth();
    startDay = weekStart.getUTCDate();
  }

  if (normalizedRange === 'month') {
    startDay = 1;
  }

  const startDate = new Date(
    Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0) - REPORT_TIMEZONE_OFFSET_MS
  );
  const endDate = new Date(
    Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
      23,
      59,
      59,
      999,
    ) - REPORT_TIMEZONE_OFFSET_MS
  );
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

function normalizeLedgerSearch(value) {
  const search = String(value || '').trim();
  if (search.length > 100) {
    throw httpError('Report search must be 100 characters or fewer.');
  }
  return search;
}

function buildLedgerSearchWhere(search) {
  if (!search) {
    return {};
  }

  const like = `%${search}%`;
  const conditions = [
    { payment_reference: { [Op.like]: like } },
    { payment_method: { [Op.like]: like } },
    { status: { [Op.like]: like } },
    { '$Stall.name$': { [Op.like]: like } },
    { '$Stall.location$': { [Op.like]: like } },
    { '$Cashier.username$': { [Op.like]: like } },
  ];
  const orderIdMatch = search.match(/^(?:order\s*)?#?(?:ord[-\s]*)?0*(\d+)$/i);
  if (orderIdMatch) {
    conditions.unshift({ id: Number(orderIdMatch[1]) });
  }

  return { [Op.or]: conditions };
}

function getOwnerScope(user) {
  const ownerId = user.role === 'owner' ? user.id : user.owner_id;
  if (!ownerId) {
    throw httpError('Unable to resolve report owner scope.', 403);
  }
  return ownerId;
}

function formatDate(date) {
  const localDate = new Date(date.getTime() + REPORT_TIMEZONE_OFFSET_MS);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatUtcSqlDateTime(date) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function buildSqlReportReplacements(ownerId, orderWhere, extras = {}) {
  return {
    ownerId,
    startDate: formatUtcSqlDateTime(orderWhere.startDate),
    endDate: formatUtcSqlDateTime(orderWhere.endDate),
    ...(orderWhere.stall_id ? { stallId: orderWhere.stall_id } : {}),
    ...(orderWhere.cashier_id ? { cashierId: orderWhere.cashier_id } : {}),
    ...extras,
  };
}

function resolvePreviousDateRange(range, startDate, endDate) {
  if (range === 'today') {
    return {
      startDate: new Date(startDate.getTime() - DAY_MS),
      endDate: new Date(endDate.getTime() - DAY_MS),
    };
  }

  if (range === 'week') {
    return {
      startDate: new Date(startDate.getTime() - (7 * DAY_MS)),
      endDate: new Date(endDate.getTime() - (7 * DAY_MS)),
    };
  }

  if (range === 'month') {
    const localEnd = new Date(endDate.getTime() + REPORT_TIMEZONE_OFFSET_MS);
    const previousMonthAnchor = new Date(Date.UTC(
      localEnd.getUTCFullYear(),
      localEnd.getUTCMonth() - 1,
      1,
    ));
    const previousYear = previousMonthAnchor.getUTCFullYear();
    const previousMonth = previousMonthAnchor.getUTCMonth();
    const previousMonthLastDay = new Date(Date.UTC(previousYear, previousMonth + 1, 0)).getUTCDate();
    const previousEndDay = Math.min(localEnd.getUTCDate(), previousMonthLastDay);
    const previousMonthText = String(previousMonth + 1).padStart(2, '0');

    return {
      startDate: parseDateOnly(`${previousYear}-${previousMonthText}-01`),
      endDate: parseDateOnly(
        `${previousYear}-${previousMonthText}-${String(previousEndDay).padStart(2, '0')}`,
        true,
      ),
    };
  }

  const duration = endDate.getTime() - startDate.getTime() + 1;
  return {
    startDate: new Date(startDate.getTime() - duration),
    endDate: new Date(startDate.getTime() - 1),
  };
}

function calculatePercentChange(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (previous === 0) {
    return null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function countCalendarDays(startDate, endDate) {
  const start = new Date(`${formatDate(startDate)}T00:00:00.000Z`);
  const end = new Date(`${formatDate(endDate)}T00:00:00.000Z`);
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

function resolveTrendGranularity(range, startDate, endDate) {
  if (range === 'today') {
    return 'hour';
  }
  if (range !== 'custom') {
    return 'day';
  }

  const dayCount = countCalendarDays(startDate, endDate);
  if (dayCount === 1) {
    return 'hour';
  }
  if (dayCount <= 31) {
    return 'day';
  }
  return 'week';
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
    replacements: buildSqlReportReplacements(ownerId, orderWhere),
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
    replacements: buildSqlReportReplacements(ownerId, orderWhere),
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
    replacements: buildSqlReportReplacements(ownerId, orderWhere),
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
      HOUR(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset)) AS hour,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(o.total_usd), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${orderWhere.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${orderWhere.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY HOUR(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset))
    ORDER BY hour ASC
  `, {
    replacements: buildSqlReportReplacements(ownerId, orderWhere, {
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
    }),
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
 * SQL-based daily revenue aggregation for week/month dashboard trends.
 */
async function fetchSqlDailyRevenue(ownerId, orderWhere, range, displayEndDate = orderWhere.endDate) {
  const rows = await sequelize.query(`
    SELECT
      DATE_FORMAT(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset), '%Y-%m-%d') AS bucketDate,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(o.total_usd), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${orderWhere.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${orderWhere.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY DATE_FORMAT(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset), '%Y-%m-%d')
    ORDER BY bucketDate ASC
  `, {
    replacements: buildSqlReportReplacements(ownerId, orderWhere, {
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
    }),
    type: sequelize.QueryTypes.SELECT,
  });

  const revenueByDate = new Map(rows.map((row) => [String(row.bucketDate).slice(0, 10), {
    orderCount: Number(row.orderCount || 0),
    revenue: roundUsd(row.revenue),
  }]));
  const startKey = formatDate(orderWhere.startDate);
  const endKey = formatDate(displayEndDate);
  const start = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey}T00:00:00.000Z`);
  const points = [];

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const date = cursor.toISOString().slice(0, 10);
    const value = revenueByDate.get(date);
    points.push({
      date,
      label: range === 'week'
        ? DAY_LABELS[cursor.getUTCDay()]
        : `${MONTH_LABELS[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`,
      orderCount: value?.orderCount || 0,
      revenue: value?.revenue || 0,
    });
  }

  return points;
}

/**
 * SQL-based seven-day buckets for custom dashboard ranges longer than 31 days.
 */
async function fetchSqlWeeklyRevenue(ownerId, orderWhere) {
  const localStartDate = formatDate(orderWhere.startDate);
  const rows = await sequelize.query(`
    SELECT
      FLOOR(DATEDIFF(
        DATE(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset)),
        :localStartDate
      ) / 7) AS bucketIndex,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(o.total_usd), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${orderWhere.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${orderWhere.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY bucketIndex
    ORDER BY bucketIndex ASC
  `, {
    replacements: buildSqlReportReplacements(ownerId, orderWhere, {
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
      localStartDate,
    }),
    type: sequelize.QueryTypes.SELECT,
  });

  const revenueByBucket = new Map(rows.map((row) => [Number(row.bucketIndex), {
    orderCount: Number(row.orderCount || 0),
    revenue: roundUsd(row.revenue),
  }]));
  const dayCount = countCalendarDays(orderWhere.startDate, orderWhere.endDate);
  const bucketCount = Math.ceil(dayCount / 7);
  const start = new Date(`${localStartDate}T00:00:00.000Z`);

  return Array.from({ length: bucketCount }, (_, bucketIndex) => {
    const bucketStart = new Date(start.getTime() + (bucketIndex * 7 * DAY_MS));
    const bucketEnd = new Date(Math.min(
      bucketStart.getTime() + (6 * DAY_MS),
      new Date(`${formatDate(orderWhere.endDate)}T00:00:00.000Z`).getTime(),
    ));
    const value = revenueByBucket.get(bucketIndex);
    const startLabel = `${MONTH_LABELS[bucketStart.getUTCMonth()]} ${bucketStart.getUTCDate()}`;
    const endLabel = `${MONTH_LABELS[bucketEnd.getUTCMonth()]} ${bucketEnd.getUTCDate()}`;

    return {
      startDate: bucketStart.toISOString().slice(0, 10),
      endDate: bucketEnd.toISOString().slice(0, 10),
      label: `${startLabel}-${endLabel}`,
      orderCount: value?.orderCount || 0,
      revenue: value?.revenue || 0,
    };
  });
}

/**
 * Fetch paginated ledger rows with Sequelize includes.
 */
async function fetchLedgerOrders(ownerId, orderWhere, pagination, search) {
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
      ...buildLedgerSearchWhere(search),
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
        separate: true,
        order: [['id', 'DESC']],
      },
    ],
    order: orderClause,
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
    subQuery: false,
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
  const search = normalizeLedgerSearch(query.search);
  const pagination = parsePagination(query);
  const includeTrends = ['1', 'true'].includes(String(query.include_trends || '').toLowerCase());

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
    fetchLedgerOrders(ownerId, orderWhere, pagination, search),
  ]);

  let trend = null;
  let comparison = null;
  if (includeTrends) {
    const trendGranularity = resolveTrendGranularity(range, startDate, endDate);
    const weeklyDisplayEnd = range === 'week'
      ? new Date(startDate.getTime() + (7 * DAY_MS) - 1)
      : endDate;
    const previousRange = resolvePreviousDateRange(range, startDate, endDate);
    const previousWhere = {
      ...orderWhere,
      startDate: previousRange.startDate,
      endDate: previousRange.endDate,
    };
    const [trendPoints, previousSummary] = await Promise.all([
      trendGranularity === 'hour'
        ? Promise.resolve(byHour)
        : (trendGranularity === 'week'
            ? fetchSqlWeeklyRevenue(ownerId, orderWhere)
            : fetchSqlDailyRevenue(ownerId, orderWhere, range, weeklyDisplayEnd)),
      fetchSqlSummary(ownerId, previousWhere),
    ]);

    trend = {
      granularity: trendGranularity,
      points: trendPoints,
    };
    comparison = {
      previousStartDate: formatDate(previousRange.startDate),
      previousEndDate: formatDate(previousRange.endDate),
      summary: previousSummary,
      revenueChangePercent: calculatePercentChange(summary.totalRevenue, previousSummary.totalRevenue),
      paidOrdersChangePercent: calculatePercentChange(summary.paidOrders, previousSummary.paidOrders),
      averageOrderValueChangePercent: calculatePercentChange(
        summary.averageOrderValue,
        previousSummary.averageOrderValue,
      ),
    };
  }

  return {
    filters: {
      range,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      stallId,
      cashierId,
      search,
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
    },
    summary,
    byStall,
    byCashier,
    byHour,
    ...(trend ? { trend, comparison } : {}),
    orders: ledgerResult.orders,
    pagination: ledgerResult.pagination,
  };
}
