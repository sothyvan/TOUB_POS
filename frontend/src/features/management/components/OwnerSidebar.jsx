import { useState } from 'react';
import Icon from '../../../components/ui/Icon';
import Logo from '../../../components/ui/Logo';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const visibleMain = MAIN_MENU.filter((item) => allowedTabs.includes(item.id));

  return (
    <aside className="flex h-full w-64 min-w-64 shrink-0 select-none flex-col border-r border-brand-border bg-ui-surface">
      {/* ── Logo / Brand ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 px-2">
          {/* Logo box — dark blue square with "r" icon feel */}
          <Logo />
          <span
            className="font-mono text-[16px] font-bold leading-none tracking-[0.08em] text-brand-text"
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
            <p className="px-2.5 pt-2 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
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
        className="flex items-center gap-2.5 border-t border-brand-border px-4"
        style={{ paddingTop: 14, paddingBottom: 14 }}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-md border border-brand-border bg-ui-muted flex items-center justify-center shrink-0">
          <Icon name="users" className="w-5 h-5 text-text-muted" strokeWidth={1.8} />
        </div>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-brand-text">
            {userName}
          </p>
          <p className="truncate font-mono text-[11px] font-normal leading-tight text-text-muted">
            {userRole}
          </p>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-8 h-8 rounded-md border border-state-danger/25 bg-state-danger/8 text-state-danger flex items-center justify-center transition-all duration-150 cursor-pointer hover:bg-state-danger/15 active:scale-95 shrink-0"
          aria-label="Logout"
        >
          <Icon name="logout" className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        size="compact"
        title="Log out?"
        message="You will be returned to the welcome screen and need to sign in again."
        icon={<Icon name="logout" className="w-8 h-8 text-state-danger" strokeWidth={2} />}
        cancelTone="secondary"
        confirmTone="danger"
        confirmLabel="Log out"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
      />
    </aside>
  );
}

/* ── NavItem sub-component ── */
function NavItem({ item, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 transition-all duration-150 active:scale-[0.98] ${isActive ? 'border-brand-action/35 bg-brand-action/10' : 'border-transparent bg-transparent hover:border-brand-border hover:bg-ui-muted'}`}
    >
      {/* Icon */}
      <Icon
        name={item.icon}
        strokeWidth={isActive ? 2.5 : 2}
        className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-brand-action' : 'text-text-soft'}`}
      />

      {/* Label */}
      <span
        className={`flex-1 text-left text-[14px] leading-none ${isActive ? 'font-semibold text-brand-action' : 'font-medium text-text-soft'}`}
      >
        {item.label}
      </span>

      {/* Active blue dot indicator */}
      {isActive && (
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-sm bg-brand-action" />
      )}
    </button>
  );
}
