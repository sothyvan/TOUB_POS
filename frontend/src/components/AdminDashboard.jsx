import MetricCard from './dashboard/MetricCard';
import RevenueChart from './dashboard/RevenueChart';
import LiveEvents from './dashboard/LiveEvents';
import QuickActions from './dashboard/QuickActions';
import Icon from './ui/Icon';

export default function AdminDashboard() {
  return (
    <div className="flex-1 flex flex-col justify-start items-start gap-5">
      <div className="w-full flex justify-start items-stretch gap-3.5 flex-wrap max-[1024px]:flex-col">
        <MetricCard
          title="Gross Revenue (Today)"
          value={
            <div>
              <span>$1,240.00 </span>
              <span className="text-gray-400 text-xs font-medium">KHR</span>
            </div>
          }
          subtitle="↑ Up 15% from yesterday"
          subtitleColor="text-green-700"
          iconBgColor="bg-green-100"
          icon={
            <Icon name="trendUp" className="w-4.5 h-4.5 text-green-700" strokeWidth={2.2} />
          }
        />
        <MetricCard
          title="Total Orders Processed"
          value="184 Orders"
          subtitle="0 pending in kitchen"
          subtitleColor="text-green-700"
          iconBgColor="bg-blue-100"
          icon={
            <Icon name="cart" className="w-4.5 h-4.5 text-blue-700" strokeWidth={2.2} />
          }
        />
        <MetricCard
          title="Active Locations"
          value="3 / 4 Online"
          subtitle="Stall 3 (Toul Tom Poung) is offline"
          subtitleColor="text-amber-700"
          iconBgColor="bg-amber-100"
          icon={
            <Icon name="location" className="w-4.5 h-4.5 text-amber-700" strokeWidth={2.2} />
          }
        />
        <MetricCard
          title="Average Ticket Prep Time"
          value="3m 45s"
          subtitle="Optimal operational speed"
          subtitleColor="text-blue-700"
          iconBgColor="bg-violet-100"
          icon={
            <Icon name="clock" className="w-4.5 h-4.5 text-[#003EC7]" strokeWidth={2.2} />
          }
        />
      </div>
      
      <div className="w-full flex justify-start items-stretch gap-4 flex-wrap max-[1024px]:flex-col">
        <RevenueChart />
        <LiveEvents />
      </div>

      <QuickActions />
    </div>
  );
}

