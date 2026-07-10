import { useState } from 'react';
import CartItem from './CartItem';
import Alert from './ui/Alert';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';
import EmptyState from './ui/EmptyState';
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
  checkoutLoading,
  checkoutError,
  isOnline,
}) {
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const hasItems = cart.length > 0;
  const paymentDisabled = !hasItems || checkoutLoading;
  const khqrDisabled = !isOnline || !hasItems || checkoutLoading;

  const handleClearCart = () => {
    clearCart();
    setIsClearConfirmOpen(false);
  };

  return (
    <aside
      className={`min-h-0 bg-white text-[#1a1c1e] flex flex-col border-l border-ui-border shadow-sm max-[1180px]:fixed max-[1180px]:top-0 max-[1180px]:right-0 max-[1180px]:bottom-0 max-[1180px]:z-30 max-[1180px]:w-[min(430px,92vw)] max-[1180px]:border-l-0 max-[1180px]:shadow-[-24px_0_52px_rgba(25,23,21,0.34)] max-[1180px]:transition-transform max-[1180px]:duration-200 max-[1180px]:ease-in-out max-sm:top-auto max-sm:w-full max-sm:max-h-[88svh] max-sm:rounded-t-2xl max-sm:shadow-[0_-24px_52px_rgba(25,23,21,0.34)] ${
        isCartOpen
          ? 'max-[1180px]:translate-x-0 max-sm:translate-y-0'
          : 'max-[1180px]:translate-x-[110%] max-sm:translate-y-[110%]'
      }`}
      aria-label="Current order"
    >
      {/* Header */}
      <div className="py-5 px-6 flex items-center justify-between border-b border-gray-100 shrink-0">
        <div>
          <h2 className="m-0 text-2xl font-black text-text-strong tracking-tight">Current Order</h2>
          <p className="m-0 mt-1 text-xs font-semibold text-text-muted">
            {hasItems ? `${cart.length} line item${cart.length === 1 ? '' : 's'} ready for payment` : 'Build the ticket from the menu'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasItems && (
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="flex items-center gap-1 text-state-danger hover:text-state-danger/80 text-sm font-semibold cursor-pointer border-0 bg-transparent p-0 transition-colors"
              type="button"
            >
              <Icon name="delete" className="w-4.5 h-4.5" strokeWidth={2.2} />
              Clear
            </button>
          )}
          <button
            className="hidden max-[1180px]:grid max-[1180px]:place-items-center w-8 h-8 border border-gray-200 rounded-full bg-gray-50 text-gray-500 text-sm font-bold cursor-pointer hover:bg-gray-100 transition-colors"
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
        {!hasItems ? (
          <EmptyState
            iconName="cart"
            title="No items yet"
            message="Tap a product card to start this customer's order."
            className="h-full min-h-55"
          />
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

        {checkoutError ? (
          <Alert variant="danger" title="Checkout error" className="mb-4 text-xs">
            {checkoutError}
          </Alert>
        ) : null}

        {!hasItems ? (
          <p className="m-0 mb-4 rounded-xl bg-ui-muted px-3 py-2 text-xs font-bold text-text-muted">
            Add at least one item to enable payment.
          </p>
        ) : !isOnline ? (
          <p className="m-0 mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            Offline mode: cash is available, KHQR is disabled.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-13 text-base"
            type="button"
            disabled={paymentDisabled}
            loading={checkoutLoading}
            variant="success"
            iconName={checkoutLoading ? undefined : 'cash'}
            onClick={() => handleCheckout('CASH')}
          >
            {checkoutLoading ? 'Processing...' : 'Cash'}
          </Button>
          <Button
            className="h-13 text-base"
            type="button"
            disabled={khqrDisabled}
            loading={checkoutLoading}
            variant="danger"
            iconName={checkoutLoading ? undefined : 'khqr'}
            onClick={() => handleCheckout('KHQR')}
          >
            {checkoutLoading ? 'Processing...' : 'KHQR'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        size="compact"
        title="Clear current order?"
        message="This removes every item from the cart. The customer order has not been saved yet."
        cancelLabel="Keep items"
        confirmLabel="Clear cart"
        cancelTone="secondary"
        confirmTone="danger"
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={handleClearCart}
      />
    </aside>
  );
}
