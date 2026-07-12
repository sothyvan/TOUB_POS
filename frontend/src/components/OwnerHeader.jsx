import Icon from './ui/Icon';
import ThemeToggle from './ui/ThemeToggle';

// Tab → breadcrumb label map
const PAGE_TITLES = {
  dashboard:  { crumb: 'Dashboard',      title: 'Business Overview'          },
  products:   { crumb: 'Menu & Catalog', title: 'Menu & Catalog'            },
  stalls:     { crumb: 'Stall Mgmt',     title: 'Stall Management'          },
  users:      { crumb: 'Staff Mgmt',   title: 'Staff Management'              },
  orders:     { crumb: 'Sales Reports',  title: 'Sales Reports'              },
  settings:   { crumb: 'Settings',       title: 'Settings'                  },
};

/**
 * OwnerHeader — pixel-spec from Figma "Owner Dashboard - Computer" > Header [1274x64]
 *
 * Left:  breadcrumb (ToubPOS › [Page Name]) + page title h1
 * Right: current date label
 */
export default function OwnerHeader({ activeTab }) {
  const { crumb, title } = PAGE_TITLES[activeTab] ?? { crumb: activeTab, title: activeTab };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header
      className="flex items-center justify-between gap-4 bg-ui-surface border-b border-brand-border shrink-0"
      style={{ height: 64, paddingLeft: 28, paddingRight: 28 }}
    >
      {/* Left — breadcrumb + page title */}
      <div className="flex flex-col justify-center gap-0.5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
            ToubPOS
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-action">
            {crumb}
          </span>
        </div>
        {/* Page title */}
        <h1
          className="m-0 text-[16px] font-semibold leading-tight text-brand-text"
        >
          {title}
        </h1>
      </div>

      {/* Right — current date */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        {/* Date label */}
        <div
          className="flex items-center gap-2 rounded-md bg-ui-bg border border-brand-border"
          style={{ height: 38, paddingLeft: 14, paddingRight: 14 }}
        >
          <Icon name="clock" className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
          <span className="whitespace-nowrap font-mono text-[12px] font-medium text-text-soft">
            {today}
          </span>
        </div>
      </div>
    </header>
  );
}
