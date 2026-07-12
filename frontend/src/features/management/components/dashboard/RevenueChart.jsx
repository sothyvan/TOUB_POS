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

const HOURS = Array.from({ length: 24 }, (_, index) => index);

function isToday(dateValue) {
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function formatHour(hour) {
  if (hour === 12) return '12PM';
  if (hour > 12) return `${hour - 12}PM`;
  return `${hour}AM`;
}

function buildHourlyData(orders) {
  const slots = HOURS.map((hour) => ({
    hour,
    label: formatHour(hour),
    revenue: 0,
  }));

  orders
    .filter((order) => order.status === 'paid' && isToday(order.createdAt))
    .forEach((order) => {
      const date = new Date(order.createdAt);
      const hour = date.getHours();
      const slot = slots.find((item) => item.hour === hour);
      if (slot) {
        slot.revenue += Number(order.total || 0);
      }
    });

  return slots;
}

export default function RevenueChart({ hourlyData = [], orders = [], loading = false, error = '' }) {
  const data = hourlyData.length > 0
    ? hourlyData.map((slot) => ({
        hour: Number(slot.hour),
        label: slot.label || formatHour(Number(slot.hour)),
        revenue: Number(slot.revenue || 0),
      }))
    : buildHourlyData(orders);
  const total = data.reduce((sum, item) => sum + item.revenue, 0);
  const peak = data.reduce((best, item) => (
    item.revenue > best.revenue ? item : best
  ), data[0]);

  return (
    <div className="w-full min-h-96 bg-ui-surface rounded-lg border border-ui-border flex flex-col justify-start items-start overflow-hidden">
      <div className="self-stretch px-5 py-4 border-b-[0.80px] border-gray-100 flex justify-between items-center gap-4 max-[640px]:items-start max-[640px]:flex-col">
        <div className="flex flex-col justify-start items-start">
          <div className="text-gray-900 text-base font-bold font-sans leading-6">
            Hourly Revenue Breakdown
          </div>
          <div className="pt-[3px] text-gray-400 text-xs font-normal font-sans leading-4">
            Today total {money(total)}{peak?.revenue > 0 ? ` · Peak ${peak.label} at ${money(peak.revenue)}` : ''}
          </div>
        </div>
        <div className="px-3 py-1.5 bg-ui-bg rounded-md border border-ui-border text-center text-text-soft font-mono text-xs font-semibold leading-5">
          Today
        </div>
      </div>

      <div className="h-[300px] w-full px-4 pt-5 pb-3">
        {loading && hourlyData.length === 0 && orders.length === 0 ? (
          <LoadingState className="h-full" label="Loading hourly revenue..." />
        ) : error && hourlyData.length === 0 && orders.length === 0 ? (
          <Alert variant="danger" className="mt-8">
            {error}
          </Alert>
        ) : total === 0 ? (
          <EmptyState
            className="h-full border-0 bg-gray-50/70"
            iconName="trendUp"
            title="No paid sales today yet"
            message="Revenue will appear here by hour after the first cash or KHQR payment is confirmed."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E76F2E" stopOpacity={0.28} />
                  <stop offset="90%" stopColor="#E76F2E" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#302E2B" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#706C67', fontSize: 11, fontFamily: 'Geist Mono' }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tickFormatter={(value) => `$${value}`}
                tick={{ fill: '#706C67', fontSize: 12, fontFamily: 'Geist Mono' }}
                tickLine={false}
                axisLine={false}
                width={48}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [money(value), 'Revenue']}
                labelFormatter={(label) => `${label} today`}
                contentStyle={{
                  background: '#171715',
                  color: '#F1EFEA',
                  borderRadius: 6,
                  border: '1px solid #302E2B',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                  fontFamily: 'Geist Variable',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#E76F2E"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                activeDot={{ r: 4, fill: '#E76F2E' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
