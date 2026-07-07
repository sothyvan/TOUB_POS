import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/**
 * Manages order history and checkout logic.
 * @param {boolean}  isOnline
 * @param {Array}    cart
 * @param {Function} clearCart
 * @param {Object}   currentUser
 */
export function useOrders(isOnline, cart, clearCart, currentUser) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const fetchOrders = useCallback(async (showSpinner = true) => {
    if (!currentUser) {
      setOrders([]);
      setLoading(false);
      return [];
    }

    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data = await api.orders.getAll(currentUser?.role);
      setOrders(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
      return [];
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      fetchOrders(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchOrders]);

  const todaysOrders = orders.filter(
    (o) => {
       const orderDate = new Date(o.createdAt);
       return !isNaN(orderDate) && orderDate.toDateString() === new Date().toDateString();
    }
  );
  
  const todaysTotal = todaysOrders
    .filter((order) => order.status === 'paid')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const handleCheckout = async (method) => {
    if (!cart.length) {
      alert('Add at least one item before checkout.');
      return null;
    }
    const normalizedMethod = String(method || '').toUpperCase();
    if (normalizedMethod === 'KHQR' && !isOnline) {
      alert('KHQR needs an internet connection. Take cash or reconnect the terminal.');
      return null;
    }

    const orderPayload = {
      paymentMethod: normalizedMethod,
      items: cart.map(({ id, quantity, notes }) => ({
        id,
        quantity,
        ...(notes ? { notes } : {}),
      })),
    };

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      const createdOrder = await api.orders.create(orderPayload);

      const finalOrder = normalizedMethod === 'CASH'
        ? await api.orders.confirmCash(createdOrder.id)
        : createdOrder;

      await fetchOrders(false);
      clearCart();
      return finalOrder;
    } catch(err) {
      const message = err.message || 'Failed to checkout.';
      setCheckoutError(message);
      alert(message);
      return null;
    } finally {
      setCheckoutLoading(false);
    }
  };

  return {
    orders,
    todaysOrders,
    todaysTotal,
    handleCheckout,
    fetchOrders,
    loading,
    error,
    checkoutLoading,
    checkoutError,
  };
}
