import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money } from '../../utils/format';

const HOURS = Array.from({ length: 15 }, (_, index) => index + 6);

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

export default function RevenueChart({ orders = [] }) {
  const data = buildHourlyData(orders);
  const total = data.reduce((sum, item) => sum + item.revenue, 0);
  const peak = data.reduce((best, item) => (
    item.revenue > best.revenue ? item : best
  ), data[0]);

  return (
    <div className="w-full min-h-96 bg-white rounded-2xl shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] outline outline-[0.80px] outline-offset-[-0.80px] outline-gray-200 flex flex-col justify-start items-start overflow-hidden">
      <div className="self-stretch px-5 py-4 border-b-[0.80px] border-gray-100 flex justify-between items-center gap-4 max-[640px]:items-start max-[640px]:flex-col">
        <div className="flex flex-col justify-start items-start">
          <div className="text-gray-900 text-base font-bold font-['Inter'] leading-6">
            Hourly Revenue Breakdown
          </div>
          <div className="pt-[3px] text-gray-400 text-xs font-normal font-['Inter'] leading-4">
            Today total {money(total)}{peak?.revenue > 0 ? ` · Peak ${peak.label} at ${money(peak.revenue)}` : ''}
          </div>
        </div>
        <div className="px-3 py-1.5 bg-white rounded-lg outline outline-[0.80px] outline-offset-[-0.80px] outline-gray-200 text-center text-gray-700 text-xs font-semibold font-['Inter'] leading-5">
          Today
        </div>
      </div>

      <div className="w-full flex-1 min-h-[280px] px-4 pt-5 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#003EC7" stopOpacity={0.22} />
                <stop offset="90%" stopColor="#003EC7" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0F2F5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Inter' }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              tickFormatter={(value) => `$${value}`}
              tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Inter' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value) => [money(value), 'Revenue']}
              labelFormatter={(label) => `${label} today`}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                fontFamily: 'Inter',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#003EC7"
              strokeWidth={2.5}
              fill="url(#revenueFill)"
              activeDot={{ r: 4, fill: '#003EC7' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
