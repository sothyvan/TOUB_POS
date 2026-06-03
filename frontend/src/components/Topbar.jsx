import { initials } from '../utils/format';

export default function Topbar({ currentUser, isCashier, isOnline, itemCount, onCartOpen, onLogout }) {
  return (
    <header className="min-h-[76px] py-3.5 px-[clamp(18px,3vw,34px)] bg-[#fffcf6]/90 border-b border-brand-border flex items-center justify-between gap-[18px] max-sm:flex-col max-sm:items-start">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-[#23211f] text-[#f8d36b] grid place-items-center text-2xl font-extrabold shadow-[inset_0_-4px_0_rgba(255,255,255,0.08)]">
          T
        </div>
        <div>
          <p className="m-0 mb-[3px] text-[#776f63] text-[11px] font-extrabold tracking-wider uppercase">
            {currentUser.role} session
          </p>
          <h1 className="m-0 text-brand-dark text-xl leading-[1.1] font-extrabold">
            Toub POS
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between max-sm:flex-wrap" aria-label="Session status">
        <span className={`h-[34px] px-3 rounded-full inline-flex items-center gap-2 text-[13px] font-extrabold border ${
          isOnline
            ? 'text-[#126149] bg-[#e6f4eb] border-[#b9dec9]'
            : 'text-[#8a4c10] bg-[#fff1d7] border-[#edc77a]'
        }`}>
          <span
            className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#19a86f]' : 'bg-[#c77013]'}`}
            aria-hidden="true"
          />
          {isOnline ? 'Online' : 'Offline'}
        </span>

        {isCashier ? (
          <button
            className="hidden max-[1100px]:inline-flex relative min-w-[46px] h-[42px] px-2.5 border border-[#d9d0c1] rounded-full bg-[#fffdfa] text-brand-text items-center justify-center gap-1.5 cursor-pointer shadow-[0_10px_24px_rgba(52,45,35,0.08)]"
            type="button"
            aria-label={`Open cart with ${itemCount} items`}
            onClick={onCartOpen}
          >
            <span className="relative w-[19px] h-4 border-2 border-t-0 border-brand-text rounded-b before:content-[''] before:absolute before:left-[3px] before:top-[-8px] before:w-2.5 before:h-[9px] before:border-2 before:border-b-0 before:border-brand-text before:rounded-t-full" aria-hidden="true" />
            <strong className="min-w-[18px] h-[18px] rounded-full bg-[#8f3c28] text-[#fffdf8] grid place-items-center text-[11px] leading-none font-black">
              {itemCount}
            </strong>
          </button>
        ) : null}

        <div className="min-h-[44px] py-1 pr-2.5 pl-1 border border-[#d9d0c1] rounded-full bg-[#fffdfa] flex items-center gap-2 max-[1280px]:min-w-0 max-[1280px]:flex-1">
          <span className="w-8.5 h-8.5 rounded-full bg-[#f8d36b] text-brand-text grid place-items-center text-xs font-black">
            {initials(currentUser.name)}
          </span>
          <div>
            <strong className="block whitespace-nowrap text-brand-text text-[13px] font-bold max-[1280px]:max-w-[116px] max-[1280px]:overflow-hidden max-[1280px]:text-ellipsis">
              {currentUser.name}
            </strong>
            <small className="block whitespace-nowrap text-[#776f63] text-[11px] font-bold max-[1280px]:max-w-[116px] max-[1280px]:overflow-hidden max-[1280px]:text-ellipsis">
              {currentUser.station}
            </small>
          </div>
        </div>

        <button
          className="min-h-[42px] px-3.5 border border-[#d9d0c1] rounded-full bg-[#fffdfa] text-[#4f483f] text-[13px] font-black cursor-pointer max-[1280px]:flex-initial"
          type="button"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
