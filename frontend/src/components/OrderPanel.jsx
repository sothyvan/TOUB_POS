import { money } from '../utils/format';
import QuantityInput from './QuantityInput';

export default function OrderPanel({
  cart,
  itemCount,
  subtotal,
  serviceFee,
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
      className={`min-h-0 bg-[#24211f] text-[#fff9ee] flex flex-col border-l border-[rgba(25,23,21,0.16)] max-[1100px]:fixed max-[1100px]:top-0 max-[1100px]:right-0 max-[1100px]:bottom-0 max-[1100px]:z-30 max-[1100px]:w-[min(430px,92vw)] max-[1100px]:border-l-0 max-[1100px]:shadow-[-24px_0_52px_rgba(25,23,21,0.34)] max-[1100px]:transition-transform max-[1100px]:duration-220 max-[1100px]:ease-in-out max-sm:top-auto max-sm:w-full max-sm:max-h-[88svh] max-sm:rounded-t-2xl max-sm:shadow-[0_-24px_52px_rgba(25,23,21,0.34)] ${
        isCartOpen
          ? 'max-[1100px]:translate-x-0 max-sm:translate-y-0'
          : 'max-[1100px]:translate-x-[110%] max-sm:translate-y-[110%]'
      }`}
      aria-label="Current order"
    >
      <div className="min-h-[80px] py-4.5 px-5 flex items-center justify-between gap-3 border-b border-[rgba(255,249,238,0.12)]">
        <div>
          <p className="m-0 mb-[3px] text-[#bdb3a4] text-[11px] font-extrabold tracking-wider uppercase">Order</p>
          <h2 className="m-0 text-[#fff9ee] text-xl leading-[1.1] font-extrabold">Current ticket</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="py-1.5 px-2.5 rounded-full bg-[#f8d36b]/16 text-[#f8d36b] text-[13px] font-extrabold">{itemCount} items</span>
          <button
            className="hidden max-[1100px]:grid max-[1100px]:place-items-center w-9 h-9 border border-[rgba(255,249,238,0.14)] rounded-full bg-[rgba(255,249,238,0.08)] text-[#fff9ee] text-lg font-black cursor-pointer"
            type="button"
            aria-label="Close cart"
            onClick={() => setIsCartOpen(false)}
          >
            x
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3.5">
        {cart.length === 0 ? (
          <div className="h-full min-h-[220px] border border-dashed border-[rgba(255,249,238,0.22)] rounded-lg grid place-content-center gap-1.5 text-center text-[#bdb3a4] p-5.5">
            <strong className="text-[#fff9ee]">No items yet</strong>
            <span className="max-w-[230px] text-sm">Choose a product from the menu to start the ticket.</span>
          </div>
        ) : (
          cart.map((item) => (
            <div className="py-3.5 px-0 border-b border-[rgba(255,249,238,0.1)] grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center" key={item.id}>
              <div>
                <strong className="block text-[#fff9ee] text-[15px] leading-snug">{item.name}</strong>
                <span className="block mt-1 text-[#bdb3a4] text-[13px] font-bold">
                  {item.quantity} x {money(item.price)}
                </span>
              </div>

              <div className="flex items-center h-9 rounded-lg bg-[rgba(255,249,238,0.08)] border border-[rgba(255,249,238,0.12)] overflow-hidden" aria-label={`${item.name} quantity`}>
                <button
                  className="w-[34px] h-[34px] border-0 bg-transparent text-[#fff9ee] text-lg font-extrabold cursor-pointer hover:bg-[rgba(255,249,238,0.1)] transition-colors duration-140"
                  type="button"
                  onClick={() => updateQuantity(item.id, -1)}
                >
                  -
                </button>
                <QuantityInput
                  value={item.quantity}
                  onChange={(val) => setCartItemQuantity(item.id, val)}
                />
                <button
                  className="w-[34px] h-[34px] border-0 bg-transparent text-[#fff9ee] text-lg font-extrabold cursor-pointer hover:bg-[rgba(255,249,238,0.1)] transition-colors duration-140"
                  type="button"
                  onClick={() => updateQuantity(item.id, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4.5 bg-[#fff9ee] text-brand-text">
        <div className="grid gap-2.5 mb-4">
          <div className="flex justify-between gap-3.5 text-brand-subtext text-sm font-bold">
            <span>Subtotal</span>
            <strong className="text-brand-text">{money(subtotal)}</strong>
          </div>
          <div className="flex justify-between gap-3.5 text-brand-subtext text-sm font-bold">
            <span>Service</span>
            <strong className="text-brand-text">{money(serviceFee)}</strong>
          </div>
          <div className="flex justify-between gap-3.5 text-brand-text text-base items-end pt-3 mt-0.5 border-t border-brand-border">
            <span>Total</span>
            <strong className="text-3xl leading-none">{money(total)}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="flex-1 min-h-[50px] border-0 rounded-lg text-[#fffdf8] text-base font-black cursor-pointer bg-brand-primary hover:enabled:brightness-104 disabled:cursor-not-allowed disabled:opacity-45 transition-[filter,opacity] duration-140"
            type="button"
            onClick={() => handleCheckout('CASH')}
          >
            Cash
          </button>
          <button
            className="flex-1 min-h-[50px] border-0 rounded-lg text-[#fffdf8] text-base font-black cursor-pointer bg-[#8f3c28] hover:enabled:brightness-104 disabled:cursor-not-allowed disabled:opacity-45 transition-[filter,opacity] duration-140"
            type="button"
            disabled={!isOnline || cart.length === 0}
            onClick={() => handleCheckout('KHQR')}
          >
            KHQR
          </button>
        </div>

        <button
          className="w-full mt-2.5 min-h-[50px] border border-[#d9d0c1] bg-[#fffdfa]/78 text-[#4f483f] rounded-full text-sm font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-[border-color,background-color] duration-140"
          type="button"
          onClick={clearCart}
          disabled={!cart.length}
        >
          Clear ticket
        </button>
      </div>
    </aside>
  );
}
