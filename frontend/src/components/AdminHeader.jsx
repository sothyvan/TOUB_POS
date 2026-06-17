import Icon from './ui/Icon';

// Tab → breadcrumb label map
const PAGE_TITLES = {
  dashboard:  { crumb: 'Dashboard',      title: 'Operations Command Center' },
  products:   { crumb: 'Menu & Catalog', title: 'Menu & Catalog'            },
  stalls:     { crumb: 'Stall Mgmt',     title: 'Stall Management'          },
  users:      { crumb: 'Staff Mgmt',   title: 'Staff Management'              },
  orders:     { crumb: 'Sales Reports',  title: 'Revenue & Speed Analytics Ledger' },
  settings:   { crumb: 'Settings',       title: 'Settings'                  },
};

/**
 * AdminHeader — pixel-spec from Figma "Admin Dashboard - Computer" > Header [1274x64]
 *
 * Left:  breadcrumb (ToubPOS › [Page Name]) + page title h1
 * Right: notification bell (with red dot) + date label
 */
export default function AdminHeader({ activeTab }) {
  const { crumb, title } = PAGE_TITLES[activeTab] ?? { crumb: activeTab, title: activeTab };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header
      className="flex items-center justify-between gap-4 bg-white border-b border-[#f3f4f6] shrink-0"
      style={{ height: 64, paddingLeft: 28, paddingRight: 28 }}
    >
      {/* Left — breadcrumb + page title */}
      <div className="flex flex-col justify-center gap-0.5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
            ToubPOS
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 3l3 3-3 3" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#003ec7', fontFamily: 'Inter, sans-serif' }}>
            {crumb}
          </span>
        </div>
        {/* Page title */}
        <h1
          className="m-0 leading-tight"
          style={{ fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}
        >
          {title}
        </h1>
      </div>

      {/* Right — notification bell + date picker */}
      <div className="flex items-center gap-2.5">
        {/* Notification bell */}
        <button
          type="button"
          className="relative w-[38px] h-[38px] rounded-[10px] flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-gray-100 active:scale-95"
          style={{ background: '#f8fafc', border: 'none' }}
          aria-label="Notifications"
        >
          <Icon name="clock" className="w-4 h-4 text-[#374151]" strokeWidth={2} />
          {/* Red dot badge */}
          <span
            className="absolute"
            style={{
              top: 7, right: 7,
              width: 7, height: 7,
              borderRadius: '50%',
              background: '#ef4444',
            }}
          />
        </button>

        {/* Date label */}
        <div
          className="flex items-center gap-2 rounded-[10px] bg-white border border-[#e5e7eb]"
          style={{ height: 38, paddingLeft: 14, paddingRight: 14 }}
        >
          <Icon name="clock" className="w-3.5 h-3.5 text-[#6b7280]" strokeWidth={2} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
            {today}
          </span>
        </div>
      </div>
    </header>
  );
}
