import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money } from '../../../../utils/format';
import Alert from '../../../../components/ui/Alert';
import EmptyState from '../../../../components/ui/EmptyState';
import LoadingState from '../../../../components/ui/LoadingState';
import TabPills from '../../../../components/ui/TabPills';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const RANGE_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

const RANGE_COPY = {
  today: {
    emptyTitle: 'No paid sales today yet',
    emptyMessage: 'Revenue will appear here by hour after the first cash or KHQR payment is confirmed.',
    peakPrefix: 'Peak hour',
    totalPrefix: 'Today total',
    tooltipSuffix: 'today',
  },
  week: {
    emptyTitle: 'No paid sales this week yet',
    emptyMessage: 'Daily revenue will appear here as paid orders are completed during this week.',
    peakPrefix: 'Best day',
    totalPrefix: 'Week-to-date',
    tooltipSuffix: 'this week',
  },
  month: {
    emptyTitle: 'No paid sales this month yet',
    emptyMessage: 'Daily revenue will appear here as paid orders are completed during this month.',
    peakPrefix: 'Best day',
    totalPrefix: 'Month-to-date',
    tooltipSuffix: 'this month',
  },
  custom: {
    emptyTitle: 'No paid sales in this range',
    emptyMessage: 'Try another date range or complete a paid cash or KHQR order.',
    peakPrefix: 'Best period',
    totalPrefix: 'Selected total',
    tooltipSuffix: 'in the selected range',
  },
};

function isToday(dateValue) {
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function formatHour(hour) {
  if (hour === 0) return '12AM';
  if (hour === 12) return '12PM';
  if (hour > 12) return `${hour - 12}PM`;
  return `${hour}AM`;
}

function buildHourlyData(orders) {
  const slots = HOURS.map((hour) => ({
    hour,
    label: formatHour(hour),
    revenue: 0,
    orderCount: 0,
  }));

  orders
    .filter((order) => order.status === 'paid' && isToday(order.createdAt))
    .forEach((order) => {
      const date = new Date(order.createdAt);
      const slot = slots[date.getHours()];
      if (slot) {
        slot.revenue += Number(order.total || 0);
        slot.orderCount += 1;
      }
    });

  return slots;
}

function formatComparison(value, range) {
  const previousLabel = range === 'today'
    ? 'yesterday'
    : (range === 'custom' ? 'previous range' : `previous ${range}`);
  if (value === null || value === undefined) return `No ${previousLabel} revenue`;
  if (value === 0) return `No change vs ${previousLabel}`;
  return `${value > 0 ? '+' : ''}${value}% vs ${previousLabel}`;
}

export default function RevenueChart({
  comparison,
  error = '',
  loading = false,
  onRangeChange,
  orders = [],
  range = 'today',
  rangeLabel = '',
  summary,
  trendData = [],
}) {
  const copy = RANGE_COPY[range] || RANGE_COPY.today;
  const data = trendData.length > 0
    ? trendData.map((point) => ({
        ...point,
        revenue: Number(point.revenue || 0),
        orderCount: Number(point.orderCount || 0),
      }))
    : (range === 'today' ? buildHourlyData(orders) : []);
  const total = summary ? Number(summary.totalRevenue || 0) : data.reduce((sum, item) => sum + item.revenue, 0);
  const peak = data.reduce((best, item) => (
    !best || item.revenue > best.revenue ? item : best
  ), null);
  const xAxisInterval = range === 'month' || range === 'custom'
    ? Math.max(Math.ceil(data.length / 8) - 1, 0)
    : (range === 'today' ? 2 : 0);
  const isEmpty = !loading && total === 0;

  return (
    <section className="flex min-h-96 w-full flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
      <div className="flex items-center justify-between gap-4 border-b border-ui-border px-5 py-4 max-[700px]:items-start max-[700px]:flex-col">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-bold leading-6 text-text-strong">Revenue Trends</h2>
          <p className="mt-1 text-xs font-medium leading-4 text-text-muted">
            {rangeLabel ? `${rangeLabel} · ` : ''}
            {copy.totalPrefix} <span className="font-bold text-state-success">{money(total)}</span>
            {peak?.revenue > 0 ? ` · ${copy.peakPrefix} ${peak.label} at ${money(peak.revenue)}` : ''}
          </p>
          <p className={`mt-1 text-xs font-bold ${
            Number(comparison?.revenueChangePercent) < 0 ? 'text-state-danger' : 'text-text-soft'
          }`}>
            {formatComparison(comparison?.revenueChangePercent, range)}
          </p>
        </div>
        <TabPills tabs={RANGE_TABS} activeId={range} onChange={onRangeChange} className="max-w-full overflow-x-auto" />
      </div>

      <div className="h-[320px] w-full px-3 pb-3 pt-5 sm:px-4">
        {loading && trendData.length === 0 ? (
          <LoadingState className="h-full" label={`Loading ${range} revenue...`} />
        ) : error && trendData.length === 0 ? (
          <Alert variant="danger" className="mt-8">{error}</Alert>
        ) : isEmpty ? (
          <EmptyState
            className="h-full border-0 bg-ui-muted/60"
            iconName="trendUp"
            title={copy.emptyTitle}
            message={copy.emptyMessage}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, left: -4, bottom: 8 }}>
              <defs>
                <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-action)" stopOpacity={0.3} />
                  <stop offset="90%" stopColor="var(--color-brand-action)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-ui-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'Geist Mono' }}
                tickLine={false}
                axisLine={false}
                interval={xAxisInterval}
                minTickGap={12}
              />
              <YAxis
                tickFormatter={(value) => `$${value}`}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'Geist Mono' }}
                tickLine={false}
                axisLine={false}
                width={48}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value, name, item) => [
                  `${money(value)} · ${item.payload.orderCount} paid order${item.payload.orderCount === 1 ? '' : 's'}`,
                  name === 'revenue' ? 'Revenue' : name,
                ]}
                labelFormatter={(label) => `${label} ${copy.tooltipSuffix}`}
                contentStyle={{
                  background: 'var(--color-ui-elevated)',
                  color: 'var(--color-text-strong)',
                  borderRadius: 6,
                  border: '1px solid var(--color-ui-border)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                  fontFamily: 'Geist Variable',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-brand-action)"
                strokeWidth={2.5}
                fill="url(#revenueTrendFill)"
                activeDot={{ r: 4, fill: 'var(--color-brand-action)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
