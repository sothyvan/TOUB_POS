import { money } from '../utils/format';

const SERVICE_RATE = 0.05;

export default function OrderPanel({
  cart,
  itemCount,
  subtotal,
  total,
  isCartOpen,
  setIsCartOpen,
  clearCart,
  updateQuantity,
  handleCheckout,
  isOnline,
}) {
  const serviceFee = subtotal * SERVICE_RATE;

  return (
    <aside className={`order-panel ${isCartOpen ? 'open' : ''}`} aria-label="Current order">
      <div className="order-header">
        <div>
          <p className="eyebrow">Order</p>
          <h2>Current ticket</h2>
        </div>
        <div className="order-header-actions">
          <span className="item-count">{itemCount} items</span>
          <button
            className="close-cart-button"
            type="button"
            aria-label="Close cart"
            onClick={() => setIsCartOpen(false)}
          >
            x
          </button>
        </div>
      </div>

      <div className="cart-list">
        {cart.length === 0 ? (
          <div className="empty-ticket">
            <strong>No items yet</strong>
            <span>Choose a product from the menu to start the ticket.</span>
          </div>
        ) : (
          cart.map((item) => (
            <div className="cart-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.quantity} x {money(item.price)}
                </span>
              </div>

              <div className="quantity-controls" aria-label={`${item.name} quantity`}>
                <button type="button" onClick={() => updateQuantity(item.id, -1)}>
                  -
                </button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.id, 1)}>
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="payment-panel">
        <div className="totals">
          <div>
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div>
            <span>Service</span>
            <strong>{money(serviceFee)}</strong>
          </div>
          <div className="grand-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
        </div>

        <div className="payment-actions">
          <button className="cash-button" type="button" onClick={() => handleCheckout('CASH')}>
            Cash
          </button>
          <button
            className="khqr-button"
            type="button"
            disabled={!isOnline || cart.length === 0}
            onClick={() => handleCheckout('KHQR')}
          >
            KHQR
          </button>
        </div>

        <button className="clear-button" type="button" onClick={clearCart} disabled={!cart.length}>
          Clear ticket
        </button>
      </div>
    </aside>
  );
}
