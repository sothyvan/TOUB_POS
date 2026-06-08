import { money } from '../utils/format';

export default function CartItem({ item, updateQuantity }) {
  const minusPlusColor = item.tone === 'rose' || item.tone === 'green' ? 'bg-[#00531e]' : 'bg-black';

  return (
    <div className="py-4.5 border-b border-gray-100 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <strong className="block text-[#1a1c1e] text-base font-bold leading-snug truncate">
          {item.name}
        </strong>
        <span className="block mt-1 text-[#434656] text-sm font-medium">
          {money(item.price)}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* Quantity Pill */}
        <div className="flex items-center h-8 px-1 rounded-full bg-[#eeeef0] border border-gray-150">
          <button
            className={`w-6 h-6 rounded-full ${minusPlusColor} text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all border-0`}
            type="button"
            onClick={() => updateQuantity(item.id, -1)}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="w-7 text-center text-sm font-bold text-gray-900 select-none">
            {item.quantity}
          </span>
          <button
            className={`w-6 h-6 rounded-full ${minusPlusColor} text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all border-0`}
            type="button"
            onClick={() => updateQuantity(item.id, 1)}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Line Total */}
        <strong className="w-16 text-right text-[#1a1c1e] text-[17px] font-bold">
          {money(item.price * item.quantity)}
        </strong>

        {/* Remove Button */}
        <button
          className="text-gray-400 hover:text-gray-600 transition-colors border-0 bg-transparent p-1 cursor-pointer flex items-center justify-center"
          type="button"
          onClick={() => updateQuantity(item.id, -item.quantity)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
