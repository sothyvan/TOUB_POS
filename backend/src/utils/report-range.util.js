import { httpError } from './http-error.util.js';

const REPORT_RANGES = new Set(['today', 'week', 'month', 'custom']);

export const REPORT_TIMEZONE_OFFSET = process.env.REPORT_TIMEZONE_OFFSET || '+07:00';
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

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

const timezoneOffsetMs = parseTimezoneOffsetMinutes(REPORT_TIMEZONE_OFFSET) * 60 * 1000;

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

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ) - timezoneOffsetMs,
  );
}

export function resolveDateRange({ range = 'today', start_date, end_date }) {
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

  const localNow = new Date(Date.now() + timezoneOffsetMs);
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

  return {
    range: normalizedRange,
    startDate: new Date(
      Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0) - timezoneOffsetMs,
    ),
    endDate: new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        23,
        59,
        59,
        999,
      ) - timezoneOffsetMs,
    ),
  };
}

export function parsePositiveId(value, fieldName) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw httpError(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

export function normalizeLedgerSearch(value) {
  const search = String(value || '').trim();
  if (search.length > 100) {
    throw httpError('Report search must be 100 characters or fewer.');
  }
  return search;
}

export function formatReportDate(date) {
  const localDate = new Date(date.getTime() + timezoneOffsetMs);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatUtcSqlDateTime(date) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

export function resolvePreviousDateRange(range, startDate, endDate) {
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
    const localEnd = new Date(endDate.getTime() + timezoneOffsetMs);
    const previousMonthAnchor = new Date(Date.UTC(
      localEnd.getUTCFullYear(),
      localEnd.getUTCMonth() - 1,
      1,
    ));
    const previousYear = previousMonthAnchor.getUTCFullYear();
    const previousMonth = previousMonthAnchor.getUTCMonth();
    const previousMonthLastDay = new Date(
      Date.UTC(previousYear, previousMonth + 1, 0),
    ).getUTCDate();
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

export function calculatePercentChange(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (previous === 0) {
    return null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function countCalendarDays(startDate, endDate) {
  const start = new Date(`${formatReportDate(startDate)}T00:00:00.000Z`);
  const end = new Date(`${formatReportDate(endDate)}T00:00:00.000Z`);
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

export function resolveTrendGranularity(range, startDate, endDate) {
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
