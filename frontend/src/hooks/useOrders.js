import { useState } from 'react';
import { api } from '../services/api';

/**
 * Manages order history and checkout logic.
 * @param {boolean}  isOnline
 * @param {Array}    cart
 * @param {Function} clearCart
 * @param {Object}   currentUser
 * @param {Object|null} assignedStall — stall the cashier is working at (null for management users)
 * @param {Object}   totals - { subtotal, serviceFee, estimatedTax, total }
 */
export function useOrders(isOnline, cart, clearCart, currentUser, assignedStall, { subtotal, serviceFee, estimatedTax, total }) {
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
      cashierId:    currentUser.id,
      cashierName:  currentUser.name,
      station:      currentUser.station,
      // Stall context — present for cashier sessions
      stallId:      assignedStall?.id   ?? null,
      stallName:    assignedStall ? `${assignedStall.name} — ${assignedStall.location}` : null,
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

