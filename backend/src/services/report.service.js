import * as reportRepository from '../repositories/report.repository.js';
import { parsePagination } from '../utils/pagination.js';
import { httpError } from '../utils/http-error.util.js';
import {
  REPORT_TIMEZONE_OFFSET,
  DAY_LABELS,
  DAY_MS,
  MONTH_LABELS,
  calculatePercentChange,
  countCalendarDays,
  formatReportDate,
  normalizeLedgerSearch,
  parsePositiveId,
  resolveDateRange,
  resolvePreviousDateRange,
  resolveTrendGranularity,
} from '../utils/report-range.util.js';

function roundUsd(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getOwnerScope(user) {
  const ownerId = user.role === 'owner' ? user.id : user.owner_id;
  if (!ownerId) {
    throw httpError('Unable to resolve report owner scope.', 403);
  }
  return ownerId;
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

  return {
    id: order.id,
    created_at: order.created_at || order.createdAt,
    completed_at: order.completed_at || order.completedAt,
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

function mapSummary(row = {}) {
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

function mapStallBreakdown(rows) {
  return rows.map((row) => ({
    stallId: row.stallId,
    stallName: row.stallName,
    orderCount: Number(row.orderCount),
    revenue: roundUsd(row.revenue),
  }));
}

function mapCashierBreakdown(rows) {
  return rows.map((row) => ({
    cashierId: row.cashierId,
    cashierName: row.cashierName || `Cashier #${row.cashierId}`,
    stallName: row.stallName || '—',
    orderCount: Number(row.orderCount),
    revenue: roundUsd(row.revenue),
  }));
}

function mapHourlyRevenue(rows) {
  const revenueByHour = new Map();
  for (const row of rows) {
    revenueByHour.set(Number(row.hour), {
      orderCount: Number(row.orderCount),
      revenue: roundUsd(row.revenue),
    });
  }

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHour(hour),
    orderCount: revenueByHour.get(hour)?.orderCount || 0,
    revenue: revenueByHour.get(hour)?.revenue || 0,
  }));
}

function mapDailyRevenue(rows, filters, range, displayEndDate = filters.endDate) {
  const revenueByDate = new Map(rows.map((row) => [
    String(row.bucketDate).slice(0, 10),
    {
      orderCount: Number(row.orderCount || 0),
      revenue: roundUsd(row.revenue),
    },
  ]));
  const start = new Date(`${formatReportDate(filters.startDate)}T00:00:00.000Z`);
  const end = new Date(`${formatReportDate(displayEndDate)}T00:00:00.000Z`);
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

function mapWeeklyRevenue(rows, filters) {
  const revenueByBucket = new Map(rows.map((row) => [
    Number(row.bucketIndex),
    {
      orderCount: Number(row.orderCount || 0),
      revenue: roundUsd(row.revenue),
    },
  ]));
  const localStartDate = formatReportDate(filters.startDate);
  const dayCount = countCalendarDays(filters.startDate, filters.endDate);
  const bucketCount = Math.ceil(dayCount / 7);
  const start = new Date(`${localStartDate}T00:00:00.000Z`);
  const finalDate = new Date(`${formatReportDate(filters.endDate)}T00:00:00.000Z`);

  return Array.from({ length: bucketCount }, (_, bucketIndex) => {
    const bucketStart = new Date(start.getTime() + (bucketIndex * 7 * DAY_MS));
    const bucketEnd = new Date(Math.min(
      bucketStart.getTime() + (6 * DAY_MS),
      finalDate.getTime(),
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

async function buildTrend(ownerId, filters, range, summary, byHour) {
  const granularity = resolveTrendGranularity(
    range,
    filters.startDate,
    filters.endDate,
  );
  const weeklyDisplayEnd = range === 'week'
    ? new Date(filters.startDate.getTime() + (7 * DAY_MS) - 1)
    : filters.endDate;
  const previousRange = resolvePreviousDateRange(
    range,
    filters.startDate,
    filters.endDate,
  );
  const previousFilters = {
    ...filters,
    startDate: previousRange.startDate,
    endDate: previousRange.endDate,
  };

  const pointsPromise = granularity === 'hour'
    ? Promise.resolve(byHour)
    : granularity === 'week'
      ? reportRepository.fetchWeeklyRevenue(ownerId, filters)
        .then((rows) => mapWeeklyRevenue(rows, filters))
      : reportRepository.fetchDailyRevenue(ownerId, filters)
        .then((rows) => mapDailyRevenue(rows, filters, range, weeklyDisplayEnd));
  const [points, previousSummaryRow] = await Promise.all([
    pointsPromise,
    reportRepository.fetchSummary(ownerId, previousFilters),
  ]);
  const previousSummary = mapSummary(previousSummaryRow);

  return {
    trend: { granularity, points },
    comparison: {
      previousStartDate: formatReportDate(previousRange.startDate),
      previousEndDate: formatReportDate(previousRange.endDate),
      summary: previousSummary,
      revenueChangePercent: calculatePercentChange(
        summary.totalRevenue,
        previousSummary.totalRevenue,
      ),
      paidOrdersChangePercent: calculatePercentChange(
        summary.paidOrders,
        previousSummary.paidOrders,
      ),
      averageOrderValueChangePercent: calculatePercentChange(
        summary.averageOrderValue,
        previousSummary.averageOrderValue,
      ),
    },
  };
}

export async function getSalesReport(user, query = {}) {
  const ownerId = getOwnerScope(user);
  const { range, startDate, endDate } = resolveDateRange(query);
  const stallId = parsePositiveId(query.stall_id, 'stall_id');
  const cashierId = parsePositiveId(query.cashier_id, 'cashier_id');
  const search = normalizeLedgerSearch(query.search);
  const pagination = parsePagination(query);
  const includeTrends = ['1', 'true'].includes(
    String(query.include_trends || '').toLowerCase(),
  );
  const filters = {
    startDate,
    endDate,
    ...(stallId ? { stall_id: stallId } : {}),
    ...(cashierId ? { cashier_id: cashierId } : {}),
  };

  const [
    summaryRow,
    stallRows,
    cashierRows,
    hourlyRows,
    ledgerResult,
  ] = await Promise.all([
    reportRepository.fetchSummary(ownerId, filters),
    reportRepository.fetchStallBreakdown(ownerId, filters),
    reportRepository.fetchCashierBreakdown(ownerId, filters),
    reportRepository.fetchHourlyRevenue(ownerId, filters),
    reportRepository.fetchLedgerOrders(ownerId, filters, pagination, search),
  ]);

  const summary = mapSummary(summaryRow);
  const byStall = mapStallBreakdown(stallRows);
  const byCashier = mapCashierBreakdown(cashierRows);
  const byHour = mapHourlyRevenue(hourlyRows);
  const trendResult = includeTrends
    ? await buildTrend(ownerId, filters, range, summary, byHour)
    : null;

  return {
    filters: {
      range,
      startDate: formatReportDate(startDate),
      endDate: formatReportDate(endDate),
      stallId,
      cashierId,
      search,
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
    },
    summary,
    byStall,
    byCashier,
    byHour,
    ...(trendResult || {}),
    orders: ledgerResult.rows.map(mapReportOrder),
    pagination: ledgerResult.pagination,
  };
}
