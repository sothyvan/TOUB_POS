import CartItem from './CartItem';
import Icon from './ui/Icon';
import TotalsBreakdown from './ui/TotalsBreakdown';

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
  setCartItemQuantity,
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
              className="flex items-center gap-1 text-state-danger hover:text-state-danger/80 text-sm font-semibold cursor-pointer border-0 bg-transparent p-0 transition-colors"
              type="button"
            >
              <Icon name="delete" className="w-4.5 h-4.5" strokeWidth={2.2} />
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
          <div className="h-full min-h-55 border border-dashed border-gray-200 rounded-xl grid place-content-center gap-1.5 text-center text-gray-400 p-6">
            <strong className="text-gray-900 font-bold">No items yet</strong>
            <span className="max-w-57.5 text-xs font-semibold leading-relaxed">
              Choose a product from the menu to start the ticket.
            </span>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              updateQuantity={updateQuantity}
              setCartItemQuantity={setCartItemQuantity}
            />
          ))
        )}

        {/* Discount Button */}
        {cart.length > 0 && (
          <button
            className="w-full mt-5 py-3.5 px-4 border border-dashed border-[#c3c5d9] rounded-xl flex items-center justify-center gap-2 text-[#1a1c1e] bg-transparent hover:bg-gray-50 active:scale-[0.99] font-bold text-base transition-all cursor-pointer"
            type="button"
          >
            <Icon name="discount" className="w-5 h-5 text-gray-800" />
            Add Discount or Promo
          </button>
        )}
      </div>

      {/* Footer Section */}
      <div className="p-6 border-t border-gray-100 bg-white shrink-0">
        <TotalsBreakdown
          subtotal={subtotal}
          serviceFee={serviceFee}
          estimatedTax={estimatedTax}
          total={total}
          variant="panel"
        />

        <div className="flex items-center gap-3">
          <button
            className="flex-1 h-13 border-0 rounded-xl text-white text-base font-bold cursor-pointer bg-state-success hover:bg-state-success/90 disabled:cursor-not-allowed disabled:opacity-45 flex items-center justify-center gap-2 shadow-sm transition-all"
            type="button"
            disabled={cart.length === 0}
            onClick={() => handleCheckout('CASH')}
          >
            <Icon name="cash" />
            Cash
          </button>
          <button
            className="flex-1 h-13 border-0 rounded-xl text-white text-base font-bold cursor-pointer bg-state-danger hover:bg-state-danger/90 disabled:cursor-not-allowed disabled:opacity-45 flex items-center justify-center gap-2 shadow-sm transition-all"
            type="button"
            disabled={!isOnline || cart.length === 0}
            onClick={() => handleCheckout('KHQR')}
          >
            <Icon name="khqr" />
            KHQR
          </button>
        </div>
      </div>
    </aside>
  );
}
