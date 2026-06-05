import { useSavedState } from './useSavedState';
import { makeId } from '../utils/ids';
import { money } from '../utils/format';

/**
 * Manages order history and checkout logic.
 * @param {boolean} isOnline
 * @param {Array}   cart
 * @param {Function} clearCart
 * @param {Object}  currentUser
 * @param {Object}  totals - { subtotal, serviceFee, total }
 */
export function useOrders(isOnline, cart, clearCart, currentUser, { subtotal, serviceFee, estimatedTax, total }) {
  const [orders, setOrders] = useSavedState('sabay-pos-orders', []);

  const todaysOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  );
  const todaysTotal = todaysOrders.reduce((sum, o) => sum + o.total, 0);

  const handleCheckout = (method) => {
    if (!cart.length) {
      alert('Add at least one item before checkout.');
      return;
    }
    if (method === 'KHQR' && !isOnline) {
      alert('KHQR needs an internet connection. Take cash or reconnect the terminal.');
      return;
    }

    const order = {
      id: makeId('order'),
      orderNo: `ORD-${String(orders.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      station: currentUser.station,
      paymentMethod: method,
      status: 'Paid',
      items: cart.map(({ id, name, code, quantity, price }) => ({
        id, name, code, quantity, price, lineTotal: price * quantity,
      })),
      subtotal,
      serviceFee,
      estimatedTax,
      total,
    };

    setOrders((cur) => [order, ...cur]);
    clearCart();
    return order;
  };

  return { orders, todaysOrders, todaysTotal, handleCheckout };
}
