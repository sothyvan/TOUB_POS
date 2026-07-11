import Icon from './ui/Icon';
import Logo from './ui/Logo';

// Nav items matching Figma: Main Menu section
const MAIN_MENU = [
  { id: 'dashboard',   label: 'Dashboard',       icon: 'dashboard'  },
  { id: 'products',    label: 'Menu & Catalog',   icon: 'product'    },
  { id: 'stalls',      label: 'Stall Management', icon: 'location'   },
  { id: 'users',       label: 'Staff Management', icon: 'users'      },
  { id: 'orders',      label: 'Sales Reports',    icon: 'orders'     },
];

/**
 * OwnerSidebar — pixel-perfect match of Figma "Owner Dashboard - Computer" sidebar
 *
 * Props:
 *  activeTab     : string  — current active tab id
 *  allowedTabs   : string[] — tabs this user can see
 *  onTabChange   : (id) => void
 *  userName      : string  (default "Owner Account")
 *  userRole      : string
 *  onLogout      : () => void
 */
export default function OwnerSidebar({
  activeTab,
  allowedTabs = [],
  onTabChange,
  userName = 'Owner Account',
  userRole = 'Owner',
  onLogout,
}) {
  const visibleMain = MAIN_MENU.filter((item) => allowedTabs.includes(item.id));

  return (
    <aside className="flex h-full w-64 min-w-64 shrink-0 select-none flex-col border-r border-brand-border bg-white">
      {/* ── Logo / Brand ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 px-2">
          {/* Logo box — dark blue square with "r" icon feel */}
          <Logo />
          <span
            className="text-[#191b23] font-bold leading-none"
            style={{ fontSize: 18, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}
          >
            TOUB POS
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 flex flex-col px-3 pb-4 overflow-y-auto gap-0.5">

        {/* MAIN MENU section */}
        {visibleMain.length > 0 && (
          <>
            <p
              className="px-2.5 pt-2 pb-1"
              style={{ fontSize: 10, fontWeight: 700, color: '#c4c9d4', fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Main Menu
            </p>
            {visibleMain.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                onClick={() => onTabChange?.(item.id)}
              />
            ))}
          </>
        )}

      </nav>

      {/* ── User Footer ── */}
      <div
        className="flex items-center gap-2.5 border-t border-[#f3f4f6] px-4"
        style={{ paddingTop: 14, paddingBottom: 14 }}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-[#f3f4f6] flex items-center justify-center shrink-0">
          <Icon name="users" className="w-5 h-5 text-[#9ca3af]" strokeWidth={1.8} />
        </div>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <p
            className="truncate leading-tight"
            style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif' }}
          >
            {userName}
          </p>
          <p
            className="truncate leading-tight"
            style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}
          >
            {userRole}
          </p>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={onLogout}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer hover:opacity-80 active:scale-95 shrink-0"
          style={{ background: '#fff1f2' }}
          aria-label="Logout"
        >
          <Icon name="logout" className="w-3.5 h-3.5" style={{ color: '#f43f5e' }} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}

/* ── NavItem sub-component ── */
function NavItem({ item, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2.5 w-full transition-all duration-150 cursor-pointer active:scale-[0.98]"
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: isActive ? '#eef2ff' : 'transparent',
        border: 'none',
        outline: 'none',
        marginBottom: 2,
      }}
    >
      {/* Icon */}
      <Icon
        name={item.icon}
        className="w-[17px] h-[17px] shrink-0"
        strokeWidth={isActive ? 2.5 : 2}
        style={{ color: isActive ? '#003ec7' : '#6b7280' }}
      />

      {/* Label */}
      <span
        className="flex-1 text-left leading-none"
        style={{
          fontSize: 14,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? '#003ec7' : '#6b7280',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {item.label}
      </span>

      {/* Active blue dot indicator */}
      {isActive && (
        <span
          className="shrink-0"
          style={{ width: 6, height: 6, borderRadius: 3, background: '#003ec7', display: 'inline-block' }}
        />
      )}
    </button>
  );
}
