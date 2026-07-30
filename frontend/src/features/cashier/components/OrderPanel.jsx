import { useState } from 'react';
import CartItem from './CartItem';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import Icon from '../../../components/ui/Icon';
import TotalsBreakdown from '../../../components/ui/TotalsBreakdown';

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
  isCheckingBackend,
  khqrEnabled,
}) {
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const hasItems = cart.length > 0;
  const paymentDisabled = !isOnline || !hasItems || checkoutLoading;
  const khqrDisabled = !isOnline || !hasItems || checkoutLoading;

  const handleClearCart = () => {
    clearCart();
    setIsClearConfirmOpen(false);
  };

  return (
    <aside
      className={`min-h-0 bg-ui-elevated text-brand-text flex flex-col border-l border-ui-border max-[1180px]:fixed max-[1180px]:top-0 max-[1180px]:right-0 max-[1180px]:bottom-0 max-[1180px]:z-30 max-[1180px]:w-[min(430px,92vw)] max-[1180px]:border-l-0 max-[1180px]:shadow-[-24px_0_52px_rgba(0,0,0,0.45)] max-[1180px]:transition-transform max-[1180px]:duration-200 max-[1180px]:ease-in-out max-sm:top-auto max-sm:w-full max-sm:max-h-[88svh] max-sm:rounded-t-lg max-sm:shadow-[0_-24px_52px_rgba(0,0,0,0.45)] ${
        isCartOpen
          ? 'max-[1180px]:translate-x-0 max-sm:translate-y-0 max-[1180px]:visible'
          : 'max-[1180px]:translate-x-[110%] max-sm:translate-y-[110%] max-[1180px]:invisible'
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
            className="hidden max-[1180px]:grid max-[1180px]:place-items-center w-8 h-8 border border-ui-border rounded-md bg-ui-surface text-text-soft text-sm font-bold cursor-pointer hover:border-brand-action/45 hover:bg-ui-muted transition-colors"
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
      <div className="p-6 border-t border-ui-border bg-ui-elevated shrink-0">
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
          <p className="m-0 mb-4 rounded-md border border-ui-border bg-ui-muted px-3 py-2 text-xs font-bold text-text-muted">
            Add at least one item to enable payment.
          </p>
        ) : isCheckingBackend ? (
          <p className="m-0 mb-4 rounded-md border border-ui-border bg-ui-muted px-3 py-2 text-xs font-bold text-text-muted">
            Checking the TouB POS server before enabling payment.
          </p>
        ) : !isOnline ? (
          <p className="m-0 mb-4 rounded-md border border-state-warning/30 bg-state-warning/10 px-3 py-2 text-xs font-bold text-state-warning">
            Checkout is unavailable. Keep this cart open and retry when the server reconnects.
          </p>
        ) : null}

        <div className={`grid gap-3 ${khqrEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Button
            className="h-13 text-base"
            type="button"
            disabled={paymentDisabled}
            title={!isOnline ? 'Checkout requires a connection to the TouB POS server.' : undefined}
            loading={checkoutLoading}
            variant="success"
            iconName={checkoutLoading ? undefined : 'cash'}
            onClick={() => handleCheckout('CASH')}
          >
            {checkoutLoading ? 'Processing...' : 'Cash'}
          </Button>
          {khqrEnabled ? (
            <Button
              className="h-13 text-base"
              type="button"
              disabled={khqrDisabled}
              title={!isOnline ? 'Checkout requires a connection to the TouB POS server.' : undefined}
              loading={checkoutLoading}
              variant="danger"
              iconName={checkoutLoading ? undefined : 'khqr'}
              onClick={() => handleCheckout('KHQR')}
            >
              {checkoutLoading ? 'Processing...' : 'KHQR'}
            </Button>
          ) : null}
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
