import { useMemo, useState } from 'react';
import MetricCard from './dashboard/MetricCard';
import RevenueChart from './dashboard/RevenueChart';
import Icon from '../../../components/ui/Icon';
import { money } from '../../../utils/format';
import { useSalesReport } from '../../../hooks/useSalesReport';
import DateRangeDialog from '../../reports/components/DateRangeDialog';

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function isToday(dateValue) {
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

export default function OwnerDashboard({ orders = [] }) {
  const today = localDateValue();
  const [revenueRange, setRevenueRange] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ startDate: today, endDate: today });
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const {
    report,
    loading: reportLoading,
    error: reportError,
  } = useSalesReport({
    range: revenueRange,
    startDate: customDateRange.startDate,
    endDate: customDateRange.endDate,
    includeTrends: true,
  });

  const reportMatchesRange = report?.filters?.range === revenueRange
    && (revenueRange !== 'custom'
      || (report.filters.startDate === customDateRange.startDate
        && report.filters.endDate === customDateRange.endDate));
  const currentReport = reportMatchesRange ? report : null;
  const periodCopy = {
    today: { revenue: 'Gross Revenue Today', orders: 'Paid Orders Today', stalls: 'Selling Stalls Today' },
    week: { revenue: 'Revenue This Week', orders: 'Paid Orders This Week', stalls: 'Selling Stalls This Week' },
    month: { revenue: 'Revenue This Month', orders: 'Paid Orders This Month', stalls: 'Selling Stalls This Month' },
    custom: { revenue: 'Revenue In Range', orders: 'Paid Orders In Range', stalls: 'Selling Stalls In Range' },
  }[revenueRange];

  const handleRangeChange = (nextRange) => {
    if (nextRange === 'custom') {
      setIsDateRangeOpen(true);
      return;
    }
    setRevenueRange(nextRange);
  };

  const handleApplyCustomRange = (nextRange) => {
    setCustomDateRange(nextRange);
    setRevenueRange('custom');
    setIsDateRangeOpen(false);
  };

  const dashboardStats = useMemo(() => {
    if (currentReport) {
      return {
        revenue: Number(currentReport.summary?.totalRevenue || 0),
        paidOrdersCount: Number(currentReport.summary?.paidOrders || 0),
        activeStallsCount: currentReport.byStall?.length || 0,
        khqrOrders: Number(currentReport.summary?.paymentMethods?.khqr?.count || 0),
        cashOrders: Number(currentReport.summary?.paymentMethods?.cash?.count || 0),
      };
    }

    if (revenueRange !== 'today') {
      return { revenue: 0, paidOrdersCount: 0, activeStallsCount: 0, khqrOrders: 0, cashOrders: 0 };
    }

    const todaysOrders = orders.filter((order) => isToday(order.createdAt));
    const paidOrders = todaysOrders.filter((order) => order.status === 'paid');
    const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const activeStalls = new Set(
      todaysOrders
        .map((order) => order.stallName)
        .filter(Boolean)
    );
    const khqrOrders = paidOrders.filter((order) => order.paymentMethod === 'KHQR').length;
    const cashOrders = paidOrders.filter((order) => order.paymentMethod === 'CASH').length;

    return {
      revenue,
      paidOrdersCount: paidOrders.length,
      activeStallsCount: activeStalls.size,
      khqrOrders,
      cashOrders,
    };
  }, [currentReport, orders, revenueRange]);

  const revenueComparison = currentReport?.comparison?.revenueChangePercent;
  const comparisonLabel = revenueComparison === null || revenueComparison === undefined
    ? 'No previous-period revenue yet'
    : `${revenueComparison > 0 ? '+' : ''}${revenueComparison}% vs ${
        revenueRange === 'today' ? 'previous day' : (revenueRange === 'custom' ? 'previous range' : `previous ${revenueRange}`)
      }`;
  const customRangeLabel = revenueRange === 'custom'
    ? (customDateRange.startDate === customDateRange.endDate
        ? formatDateLabel(customDateRange.startDate)
        : `${formatDateLabel(customDateRange.startDate)} - ${formatDateLabel(customDateRange.endDate)}`)
    : '';

  return (
    <>
      <div className="flex-1 flex flex-col justify-start items-start gap-5">
      <div className="w-full grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-2 max-[680px]:grid-cols-1">
        <MetricCard
          title={periodCopy.revenue}
          value={money(dashboardStats.revenue)}
          valueClassName="text-state-success"
          subtitle={comparisonLabel}
          subtitleColor={Number(revenueComparison) < 0 ? 'text-state-danger' : 'text-state-success'}
          iconBgColor="bg-green-100"
          icon={
            <Icon name="trendUp" className="w-4.5 h-4.5 text-green-700" strokeWidth={2.2} />
          }
        />
        <MetricCard
          title={periodCopy.orders}
          value={`${dashboardStats.paidOrdersCount} Orders`}
          subtitle="Cash and KHQR completed payments"
          subtitleColor="text-blue-700"
          iconBgColor="bg-blue-100"
          icon={
            <Icon name="cart" className="w-4.5 h-4.5 text-blue-700" strokeWidth={2.2} />
          }
        />
        <MetricCard
          title={periodCopy.stalls}
          value={`${dashboardStats.activeStallsCount} Stalls`}
          subtitle={`Cash ${dashboardStats.cashOrders} · KHQR ${dashboardStats.khqrOrders}`}
          subtitleColor="text-amber-700"
          iconBgColor="bg-amber-100"
          icon={
            <Icon name="location" className="w-4.5 h-4.5 text-amber-700" strokeWidth={2.2} />
          }
        />
      </div>

      <RevenueChart
        trendData={currentReport?.trend?.points || []}
        summary={currentReport?.summary}
        comparison={currentReport?.comparison}
        range={revenueRange}
        rangeLabel={customRangeLabel}
        onRangeChange={handleRangeChange}
        orders={orders}
        loading={reportLoading || (!currentReport && !reportError)}
        error={reportError}
      />
      </div>

      <DateRangeDialog
        key={`${customDateRange.startDate}-${customDateRange.endDate}`}
        isOpen={isDateRangeOpen}
        initialStartDate={customDateRange.startDate}
        initialEndDate={customDateRange.endDate}
        onApply={handleApplyCustomRange}
        onClose={() => setIsDateRangeOpen(false)}
      />
    </>
  );
}
