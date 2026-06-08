import { money } from '../utils/format';
import CartItem from './CartItem';

export default function OrderPanel({
  cart,
  subtotal,
  serviceFee,
  estimatedTax,
  total,
  isCartOpen,
  setIsCartOpen,
  clearCart,
  updateQuantity,
  handleCheckout,
  isOnline,
}) {
  return (
    <aside
      className={`min-h-0 bg-white text-[#1a1c1e] flex flex-col border-l border-gray-200 max-[1100px]:fixed max-[1100px]:top-0 max-[1100px]:right-0 max-[1100px]:bottom-0 max-[1100px]:z-30 max-[1100px]:w-[min(430px,92vw)] max-[1100px]:border-l-0 max-[1100px]:shadow-[-24px_0_52px_rgba(25,23,21,0.34)] max-[1100px]:transition-transform max-[1100px]:duration-220 max-[1100px]:ease-in-out max-sm:top-auto max-sm:w-full max-sm:max-h-[88svh] max-sm:rounded-t-2xl max-sm:shadow-[0_-24px_52px_rgba(25,23,21,0.34)] ${
        isCartOpen
          ? 'max-[1100px]:translate-x-0 max-sm:translate-y-0'
          : 'max-[1100px]:translate-x-[110%] max-sm:translate-y-[110%]'
      }`}
      aria-label="Current order"
    >
      {/* Header */}
      <div className="py-5 px-6 flex items-center justify-between border-b border-gray-100 shrink-0">
        <h2 className="m-0 text-2xl font-bold text-[#1a1c1e] tracking-tight">Current Order</h2>
        <div className="flex items-center gap-3">
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1 text-[#c70000] hover:text-[#aa0000] text-sm font-semibold cursor-pointer border-0 bg-transparent p-0 transition-colors"
              type="button"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          )}
          <button
            className="hidden max-[1100px]:grid max-[1100px]:place-items-center w-8 h-8 border border-gray-200 rounded-full bg-gray-50 text-gray-500 text-sm font-bold cursor-pointer hover:bg-gray-100 transition-colors"
            type="button"
            aria-label="Close cart"
            onClick={() => setIsCartOpen(false)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 min-h-0 overflow-auto py-3 px-6 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full min-h-[220px] border border-dashed border-gray-200 rounded-xl grid place-content-center gap-1.5 text-center text-gray-400 p-6">
            <strong className="text-gray-900 font-bold">No items yet</strong>
            <span className="max-w-[230px] text-xs font-semibold leading-relaxed">
              Choose a product from the menu to start the ticket.
            </span>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              updateQuantity={updateQuantity}
            />
          ))
        )}

        {/* Discount Button */}
        {cart.length > 0 && (
          <button
            className="w-full mt-5 py-3.5 px-4 border border-dashed border-[#c3c5d9] rounded-xl flex items-center justify-center gap-2 text-[#1a1c1e] bg-transparent hover:bg-gray-50 active:scale-[0.99] font-bold text-base transition-all cursor-pointer"
            type="button"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            Add Discount or Promo
          </button>
        )}
      </div>

      {/* Footer Section */}
      <div className="p-6 border-t border-gray-100 bg-white shrink-0">
        <div className="grid gap-2.5 mb-6">
          <div className="flex justify-between text-gray-500 text-[15px] font-semibold">
            <span>Subtotal</span>
            <strong className="text-gray-900 font-bold">{money(subtotal)}</strong>
          </div>
          <div className="flex justify-between text-gray-500 text-[15px] font-semibold">
            <span>Service Fee (3%)</span>
            <strong className="text-gray-900 font-bold">{money(serviceFee)}</strong>
          </div>
          <div className="flex justify-between text-gray-500 text-[15px] font-semibold">
            <span>Estimated Tax (8%)</span>
            <strong className="text-gray-900 font-bold">{money(estimatedTax)}</strong>
          </div>
          <div className="flex justify-between items-baseline pt-4 border-t border-gray-100 mt-2">
            <span className="text-[#1a1c1e] text-base font-bold">Total Amount</span>
            <strong className="text-5xl text-[#003ec7] font-black leading-none tracking-tight">
              {money(total)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex-1 h-13 border-0 rounded-xl text-white text-base font-bold cursor-pointer bg-[#157811] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 flex items-center justify-center gap-2 shadow-sm transition-all"
            type="button"
            disabled={cart.length === 0}
            onClick={() => handleCheckout('CASH')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h.01M18 9h.01M6 15h.01M18 15h.01" />
            </svg>
            Cash
          </button>
          <button
            className="flex-1 h-13 border-0 rounded-xl text-white text-base font-bold cursor-pointer bg-[#c70000] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 flex items-center justify-center gap-2 shadow-sm transition-all"
            type="button"
            disabled={!isOnline || cart.length === 0}
            onClick={() => handleCheckout('KHQR')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M17 7h.01M7 17h.01" />
            </svg>
            KHQR
          </button>
        </div>
      </div>
    </aside>
  );
}
