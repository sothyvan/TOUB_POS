import { Op } from 'sequelize';
import {
  sequelize,
  Order,
  Stall,
  TelegramTicket,
  User,
} from '../models/index.js';
import {
  buildOrderClause,
  buildPaginationMeta,
} from '../utils/pagination.js';
import {
  REPORT_TIMEZONE_OFFSET,
  formatReportDate,
  formatUtcSqlDateTime,
} from '../utils/report-range.util.js';

const REPORTING_TOTAL_USD_SQL = "CASE WHEN o.pricing_currency = 'khr' THEN o.total_khr / o.exchange_rate_khr_per_usd ELSE o.total_usd END";

function buildSqlReplacements(ownerId, filters, extras = {}) {
  return {
    ownerId,
    startDate: formatUtcSqlDateTime(filters.startDate),
    endDate: formatUtcSqlDateTime(filters.endDate),
    ...(filters.stall_id ? { stallId: filters.stall_id } : {}),
    ...(filters.cashier_id ? { cashierId: filters.cashier_id } : {}),
    ...extras,
  };
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

export async function fetchSummary(ownerId, filters) {
  const rows = await sequelize.query(`
    SELECT
      COUNT(o.id) AS totalOrders,
      SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) AS paidOrders,
      COALESCE(SUM(CASE WHEN o.status = 'paid' THEN ${REPORTING_TOTAL_USD_SQL} ELSE 0 END), 0) AS totalRevenue,
      SUM(CASE WHEN o.status = 'paid' AND o.payment_method = 'khqr' THEN 1 ELSE 0 END) AS cashCount,
      COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_method = 'khqr' THEN ${REPORTING_TOTAL_USD_SQL} ELSE 0 END), 0) AS khqrRevenue,
      SUM(CASE WHEN o.status = 'paid' AND o.payment_method != 'khqr' THEN 1 ELSE 0 END) AS cashPaidCount,
      COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_method != 'khqr' THEN ${REPORTING_TOTAL_USD_SQL} ELSE 0 END), 0) AS cashRevenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      ${filters.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${filters.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
  `, {
    replacements: buildSqlReplacements(ownerId, filters),
    type: sequelize.QueryTypes.SELECT,
  });
  return rows[0] || {};
}

export function fetchStallBreakdown(ownerId, filters) {
  return sequelize.query(`
    SELECT
      s.id AS stallId,
      CASE
        WHEN s.location IS NOT NULL AND s.location != '' THEN CONCAT(s.name, ' — ', s.location)
        ELSE s.name
      END AS stallName,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(${REPORTING_TOTAL_USD_SQL}), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${filters.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${filters.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY s.id, s.name, s.location
    ORDER BY revenue DESC
  `, {
    replacements: buildSqlReplacements(ownerId, filters),
    type: sequelize.QueryTypes.SELECT,
  });
}

export function fetchCashierBreakdown(ownerId, filters) {
  return sequelize.query(`
    SELECT
      o.cashier_id AS cashierId,
      u.username AS cashierName,
      CASE
        WHEN s.location IS NOT NULL AND s.location != '' THEN CONCAT(s.name, ' — ', s.location)
        ELSE s.name
      END AS stallName,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(${REPORTING_TOTAL_USD_SQL}), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    LEFT JOIN users u ON u.id = o.cashier_id
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${filters.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${filters.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY o.cashier_id, u.username, s.name, s.location
    ORDER BY revenue DESC
  `, {
    replacements: buildSqlReplacements(ownerId, filters),
    type: sequelize.QueryTypes.SELECT,
  });
}

export function fetchHourlyRevenue(ownerId, filters) {
  return sequelize.query(`
    SELECT
      HOUR(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset)) AS hour,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(${REPORTING_TOTAL_USD_SQL}), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${filters.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${filters.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY HOUR(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset))
    ORDER BY hour ASC
  `, {
    replacements: buildSqlReplacements(ownerId, filters, {
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
    }),
    type: sequelize.QueryTypes.SELECT,
  });
}

export function fetchDailyRevenue(ownerId, filters) {
  return sequelize.query(`
    SELECT
      DATE_FORMAT(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset), '%Y-%m-%d') AS bucketDate,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(${REPORTING_TOTAL_USD_SQL}), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${filters.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${filters.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY DATE_FORMAT(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset), '%Y-%m-%d')
    ORDER BY bucketDate ASC
  `, {
    replacements: buildSqlReplacements(ownerId, filters, {
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
    }),
    type: sequelize.QueryTypes.SELECT,
  });
}

export function fetchWeeklyRevenue(ownerId, filters) {
  const localStartDate = formatReportDate(filters.startDate);
  return sequelize.query(`
    SELECT
      FLOOR(DATEDIFF(
        DATE(CONVERT_TZ(o.created_at, '+00:00', :timezoneOffset)),
        :localStartDate
      ) / 7) AS bucketIndex,
      COUNT(o.id) AS orderCount,
      COALESCE(SUM(${REPORTING_TOTAL_USD_SQL}), 0) AS revenue
    FROM orders o
    INNER JOIN stalls s ON s.id = o.stall_id AND s.owner_id = :ownerId AND s.is_deleted = 0
    WHERE o.created_at BETWEEN :startDate AND :endDate
      AND o.status = 'paid'
      ${filters.stall_id ? 'AND o.stall_id = :stallId' : ''}
      ${filters.cashier_id ? 'AND o.cashier_id = :cashierId' : ''}
    GROUP BY bucketIndex
    ORDER BY bucketIndex ASC
  `, {
    replacements: buildSqlReplacements(ownerId, filters, {
      timezoneOffset: REPORT_TIMEZONE_OFFSET,
      localStartDate,
    }),
    type: sequelize.QueryTypes.SELECT,
  });
}

export async function fetchLedgerOrders(ownerId, filters, pagination, search) {
  const orderClause = buildOrderClause(
    pagination,
    ['created_at', 'id', 'status', 'total_usd'],
    [['created_at', 'DESC'], ['id', 'DESC']],
  );
  const { rows, count } = await Order.findAndCountAll({
    where: {
      created_at: { [Op.between]: [filters.startDate, filters.endDate] },
      ...(filters.stall_id ? { stall_id: filters.stall_id } : {}),
      ...(filters.cashier_id ? { cashier_id: filters.cashier_id } : {}),
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
    rows,
    pagination: buildPaginationMeta(pagination, count),
  };
}
