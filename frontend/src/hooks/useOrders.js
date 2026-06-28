import { useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * Manages order history and checkout logic.
 * @param {boolean}  isOnline
 * @param {Array}    cart
 * @param {Function} clearCart
 * @param {Object}   currentUser
 * @param {Object|null} assignedStall — stall the cashier is working at (null for management users)
 * @param {Object}   financials
 */
export function useOrders(isOnline, cart, clearCart, currentUser, assignedStall, financials) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (currentUser) {
        try {
          if (!ignore) setLoading(true);
          const data = await api.orders.getAll(currentUser?.role);
          if (!ignore) setOrders(data);
        } catch (err) {
          if (!ignore) setError(err.message || 'Failed to load orders.');
        } finally {
          if (!ignore) setLoading(false);
        }
      } else {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => { ignore = true; };
  }, [currentUser]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.orders.getAll(currentUser?.role);
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const todaysOrders = orders.filter(
    (o) => {
       const orderDate = new Date(o.createdAt);
       return !isNaN(orderDate) && orderDate.toDateString() === new Date().toDateString();
    }
  );
  
  const todaysTotal = todaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const handleCheckout = async (method) => {
    if (!cart.length) {
      alert('Add at least one item before checkout.');
      return;
    }
    if (method === 'KHQR' && !isOnline) {
      alert('KHQR needs an internet connection. Take cash or reconnect the terminal.');
      return;
    }

    const orderPayload = {
      paymentMethod: method,
      items: cart.map(({ id, quantity }) => ({
        id, quantity
      })),
    };

    try {
      const createdOrder = await api.orders.create(orderPayload);
      
      const receipt = {
        id: createdOrder.orderId || Date.now(),
        orderNo: `ORD-${String(createdOrder.orderId || 0).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        cashierId: currentUser?.id,
        cashierName: currentUser?.name || 'Cashier',
        station: assignedStall ? (assignedStall.location ? `${assignedStall.name} — ${assignedStall.location}` : assignedStall.name) : 'Station 01',
        paymentMethod: method,
        status: createdOrder.status || 'pending',
        items: cart.map(i => ({ ...i, lineTotal: i.price * i.quantity })),
        subtotal: financials?.subtotal || 0,
        serviceFee: 0,
        estimatedTax: 0,
        total: createdOrder.totalUsd || financials?.total || 0,
      };

      // fetchOrders updates the list in the background
      fetchOrders(false);
      clearCart();
      return receipt;
    } catch(err) {
      alert(err.message || 'Failed to checkout');
    }
  };

  return { orders, todaysOrders, todaysTotal, handleCheckout, loading, error };
}
