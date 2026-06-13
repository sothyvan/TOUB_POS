import MetricCard from './dashboard/MetricCard';
import RevenueChart from './dashboard/RevenueChart';
import LiveEvents from './dashboard/LiveEvents';
import QuickActions from './dashboard/QuickActions';

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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.6666 4.66663L8.99998 10.3333L5.66665 6.99996L1.33331 11.3333" stroke="#15803D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.6667 4.66663H14.6667V8.66663" stroke="#15803D" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        />
        <MetricCard
          title="Total Orders Processed"
          value="184 Orders"
          subtitle="0 pending in kitchen"
          subtitleColor="text-green-700"
          iconBgColor="bg-blue-100"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_143_2819)">
                <path d="M5.33335 14.6667C5.70154 14.6667 6.00002 14.3682 6.00002 14C6.00002 13.6319 5.70154 13.3334 5.33335 13.3334C4.96516 13.3334 4.66669 13.6319 4.66669 14C4.66669 14.3682 4.96516 14.6667 5.33335 14.6667Z" stroke="#1D4ED8" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.6667 14.6667C13.0349 14.6667 13.3333 14.3682 13.3333 14C13.3333 13.6319 13.0349 13.3334 12.6667 13.3334C12.2985 13.3334 12 13.6319 12 14C12 14.3682 12.2985 14.6667 12.6667 14.6667Z" stroke="#1D4ED8" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1.36664 1.3667H2.69997L4.4733 9.6467C4.53836 9.94994 4.70709 10.221 4.95045 10.4133C5.19381 10.6055 5.49658 10.7069 5.80664 10.7H12.3266C12.6301 10.6995 12.9243 10.5956 13.1607 10.4053C13.397 10.215 13.5614 9.94972 13.6266 9.65337L14.7266 4.70003H3.4133" stroke="#1D4ED8" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <defs>
                <clipPath id="clip0_143_2819">
                  <rect width="16" height="16" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          }
        />
        <MetricCard
          title="Active Locations"
          value="3 / 4 Online"
          subtitle="Stall 3 (Toul Tom Poung) is offline"
          subtitleColor="text-amber-700"
          iconBgColor="bg-amber-100"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.40066 14.5327C9.64066 13.462 13.3333 9.99537 13.3333 6.66671C13.3333 5.25222 12.7714 3.89567 11.7712 2.89547C10.771 1.89528 9.41448 1.33337 7.99999 1.33337C6.5855 1.33337 5.22895 1.89528 4.22875 2.89547C3.22856 3.89567 2.66666 5.25222 2.66666 6.66671C2.66666 9.99537 6.35932 13.462 7.59932 14.5327C7.71484 14.6196 7.85546 14.6665 7.99999 14.6665C8.14452 14.6665 8.28514 14.6196 8.40066 14.5327Z" stroke="#B45309" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 8.66663C9.10457 8.66663 10 7.7712 10 6.66663C10 5.56206 9.10457 4.66663 8 4.66663C6.89543 4.66663 6 5.56206 6 6.66663C6 7.7712 6.89543 8.66663 8 8.66663Z" stroke="#B45309" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        />
        <MetricCard
          title="Average Ticket Prep Time"
          value="3m 45s"
          subtitle="Optimal operational speed"
          subtitleColor="text-blue-700"
          iconBgColor="bg-violet-100"
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8.00004C14.6667 4.31814 11.6819 1.33337 8 1.33337C4.3181 1.33337 1.33333 4.31814 1.33333 8.00004C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#003EC7" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 4V8L10.6667 9.33333" stroke="#003EC7" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
