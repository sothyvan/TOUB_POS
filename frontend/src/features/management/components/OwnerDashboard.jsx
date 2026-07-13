import { useMemo } from 'react';
import MetricCard from './dashboard/MetricCard';
import RevenueChart from './dashboard/RevenueChart';
import Icon from '../../../components/ui/Icon';
import { money } from '../../../utils/format';
import { useSalesReport } from '../../../hooks/useSalesReport';

function isToday(dateValue) {
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

export default function OwnerDashboard({ orders = [] }) {
  const {
    report,
    loading: reportLoading,
    error: reportError,
  } = useSalesReport({ range: 'today' });

  const dashboardStats = useMemo(() => {
    if (report) {
      return {
        revenue: Number(report.summary?.totalRevenue || 0),
        paidOrdersCount: Number(report.summary?.paidOrders || 0),
        activeStallsCount: report.byStall?.length || 0,
        khqrOrders: Number(report.summary?.paymentMethods?.khqr?.count || 0),
        cashOrders: Number(report.summary?.paymentMethods?.cash?.count || 0),
      };
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
  }, [orders, report]);

  return (
    <div className="flex-1 flex flex-col justify-start items-start gap-5">
      <div className="w-full grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-2 max-[680px]:grid-cols-1">
        <MetricCard
          title="Gross Revenue Today"
          value={money(dashboardStats.revenue)}
          valueClassName="text-state-success"
          subtitle="Backend-owned paid orders only"
          subtitleColor="text-green-700"
          iconBgColor="bg-green-100"
          icon={
            <Icon name="trendUp" className="w-4.5 h-4.5 text-green-700" strokeWidth={2.2} />
          }
        />
        <MetricCard
          title="Paid Orders"
          value={`${dashboardStats.paidOrdersCount} Orders`}
          subtitle="Cash and KHQR completed payments"
          subtitleColor="text-blue-700"
          iconBgColor="bg-blue-100"
          icon={
            <Icon name="cart" className="w-4.5 h-4.5 text-blue-700" strokeWidth={2.2} />
          }
        />
        <MetricCard
          title="Selling Stalls Today"
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
        hourlyData={report?.byHour || []}
        orders={orders}
        loading={reportLoading}
        error={reportError}
      />
    </div>
  );
}
