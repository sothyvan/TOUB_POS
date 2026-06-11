import { useState } from 'react';
import { initials } from '../utils/format';
import ConfirmDialog from './ui/ConfirmDialog';

export default function Topbar({ currentUser, isCashier, itemCount, onCartOpen, onLogout }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <header className="min-h-19 py-3.5 px-[clamp(18px,3vw,34px)] bg-[#fffcf6]/90 border-b border-brand-border flex items-center justify-between gap-4.5 max-sm:flex-col max-sm:items-start">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-[#23211f] text-[#f8d36b] grid place-items-center text-2xl font-extrabold shadow-[inset_0_-4px_0_rgba(255,255,255,0.08)]">
          T
        </div>
        <div>
          <p className="m-0 mb-0.75 text-[#776f63] text-[11px] font-extrabold tracking-wider uppercase">
            {currentUser.role} session
          </p>
          <h1 className="m-0 text-brand-dark text-xl leading-[1.1] font-extrabold">
            Toub POS
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between max-sm:flex-wrap" aria-label="Session status">

        {isCashier ? (
          <button
            className="hidden max-[1100px]:inline-flex relative min-w-11.5 h-10.5 px-2.5 border border-brand-border rounded-full bg-brand-card text-brand-text items-center justify-center gap-1.5 cursor-pointer shadow-[0_10px_24px_rgba(52,45,35,0.08)]"
            type="button"
            aria-label={`Open cart with ${itemCount} items`}
            onClick={onCartOpen}
          >
            <span className="relative w-4.75 h-4 border-2 border-t-0 border-brand-text rounded-b before:content-[''] before:absolute before:left-0.75 before:top-2 before:w-2.5 before:h-2.25 before:border-2 before:border-b-0 before:border-brand-text before:rounded-t-full" aria-hidden="true" />
            <strong className="min-w-4.5 h-4.5 rounded-full bg-[#8f3c28] text-[#fffdf8] grid place-items-center text-[11px] leading-none font-black">
              {itemCount}
            </strong>
          </button>
        ) : null}

        <div className="relative">
          <button
            type="button"
            className="min-h-11 py-1 pr-3.5 pl-1 border border-brand-border rounded-full bg-brand-card flex items-center gap-2 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            aria-label="Profile actions"
          >
            <span className="w-8.5 h-8.5 rounded-full bg-[#f8d36b] text-brand-text grid place-items-center text-xs font-black">
              {initials(currentUser.name)}
            </span>
            <div className="text-left">
              <strong className="block whitespace-nowrap text-brand-text text-[13px] font-bold max-[1280px]:max-w-29 max-[1280px]:overflow-hidden max-[1280px]:text-ellipsis">
                {currentUser.name}
              </strong>
              <small className="block whitespace-nowrap text-[#776f63] text-[11px] font-bold max-[1280px]:max-w-29 max-[1280px]:overflow-hidden max-[1280px]:text-ellipsis">
                {currentUser.station}
              </small>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-[#776f63] transition-transform duration-200 shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isProfileOpen && (
            <>
              {/* Click-outside backdrop */}
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setIsProfileOpen(false)}
              />
              {/* Dropdown Popover */}
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-40 bg-white border border-brand-border rounded-2xl shadow-[0_12px_36px_rgba(25,23,21,0.14)] py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-state-danger hover:bg-red-50/60 transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Are you sure you want to log out?"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
      />
    </header>
  );
}
