import test from 'node:test';
import assert from 'node:assert/strict';

process.env.REPORT_TIMEZONE_OFFSET = '+07:00';

const {
  calculatePercentChange,
  countCalendarDays,
  formatReportDate,
  formatUtcSqlDateTime,
  resolveDateRange,
  resolvePreviousDateRange,
  resolveTrendGranularity,
} = await import('../src/utils/report-range.util.js');

test('custom report dates use Cambodia-local day boundaries stored as UTC', () => {
  const result = resolveDateRange({
    range: 'custom',
    start_date: '2026-07-02',
    end_date: '2026-07-02',
  });

  assert.equal(result.range, 'custom');
  assert.equal(result.startDate.toISOString(), '2026-07-01T17:00:00.000Z');
  assert.equal(result.endDate.toISOString(), '2026-07-02T16:59:59.999Z');
  assert.equal(formatReportDate(result.startDate), '2026-07-02');
  assert.equal(formatReportDate(result.endDate), '2026-07-02');
  assert.equal(formatUtcSqlDateTime(result.startDate), '2026-07-01 17:00:00.000');
});

test('invalid custom report dates are rejected cleanly', () => {
  assert.throws(
    () => resolveDateRange({
      range: 'custom',
      start_date: '2026-02-30',
      end_date: '2026-03-01',
    }),
    (error) => error.status === 400 && error.message === 'Invalid report date.',
  );

  assert.throws(
    () => resolveDateRange({
      range: 'custom',
      start_date: '2026-07-10',
      end_date: '2026-07-01',
    }),
    (error) => (
      error.status === 400
      && error.message === 'start_date must be before or equal to end_date.'
    ),
  );
});

test('custom range granularity changes at the documented boundaries', () => {
  const oneDay = resolveDateRange({
    range: 'custom',
    start_date: '2026-07-01',
    end_date: '2026-07-01',
  });
  const thirtyOneDays = resolveDateRange({
    range: 'custom',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
  });
  const longRange = resolveDateRange({
    range: 'custom',
    start_date: '2026-06-01',
    end_date: '2026-07-31',
  });

  assert.equal(resolveTrendGranularity('custom', oneDay.startDate, oneDay.endDate), 'hour');
  assert.equal(
    resolveTrendGranularity('custom', thirtyOneDays.startDate, thirtyOneDays.endDate),
    'day',
  );
  assert.equal(
    resolveTrendGranularity('custom', longRange.startDate, longRange.endDate),
    'week',
  );
  assert.equal(countCalendarDays(thirtyOneDays.startDate, thirtyOneDays.endDate), 31);
});

test('previous ranges and percentage comparisons remain deterministic', () => {
  const current = resolveDateRange({
    range: 'custom',
    start_date: '2026-07-01',
    end_date: '2026-07-15',
  });
  const previous = resolvePreviousDateRange('month', current.startDate, current.endDate);

  assert.equal(formatReportDate(previous.startDate), '2026-06-01');
  assert.equal(formatReportDate(previous.endDate), '2026-06-15');
  assert.equal(calculatePercentChange(150, 100), 50);
  assert.equal(calculatePercentChange(50, 100), -50);
  assert.equal(calculatePercentChange(100, 0), null);
});
