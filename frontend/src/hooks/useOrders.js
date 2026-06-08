import { useState } from 'react';
import { api } from '../services/api';

/**
 * Manages order history and checkout logic.
 * @param {boolean} isOnline
 * @param {Array}   cart
 * @param {Function} clearCart
 * @param {Object}  currentUser
 * @param {Object}  totals - { subtotal, serviceFee, total }
 */
export function useOrders(isOnline, cart, clearCart, currentUser, { subtotal, serviceFee, estimatedTax, total }) {
  const [orders, setOrders] = useState(() => api.orders.getAll());

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

    const createdOrder = api.orders.create(order);
    setOrders(api.orders.getAll());
    clearCart();
    return createdOrder;
  };

  return { orders, todaysOrders, todaysTotal, handleCheckout };
}
