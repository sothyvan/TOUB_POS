import { useState, useEffect, useCallback, useRef } from 'react';
import { KHQR_ENABLED } from '../config/features';
import { api } from '../services/api';
import {
  clearPendingCheckout,
  createCheckoutSignature,
  createIdempotencyKey,
  readPendingCheckout,
  writePendingCheckout,
} from '../utils/pendingCheckout';
import { useAutoRefresh } from './useAutoRefresh';

/**
 * Manages order history and checkout logic.
 * @param {boolean}  isOnline - whether the TouB POS backend is reachable
 * @param {Array}    cart
 * @param {Function} clearCart
 * @param {Object}   currentUser
 * @param {Object}   options
 */
export function useOrders(isOnline, cart, clearCart, currentUser, options = {}) {
  const { onConnectionFailure } = options;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const pendingCheckoutRef = useRef(null);

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
      if (err.status === 0) {
        onConnectionFailure?.();
      }
      setError(err.message || 'Failed to load orders.');
      return [];
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [currentUser, onConnectionFailure]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      fetchOrders(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchOrders]);

  useAutoRefresh(() => fetchOrders(false), {
    enabled: Boolean(currentUser),
    intervalMs: currentUser?.role === 'cashier' ? 15000 : 20000,
  });

  const todaysOrders = orders.filter(
    (o) => {
       const orderDate = new Date(o.createdAt);
       return !isNaN(orderDate) && orderDate.toDateString() === new Date().toDateString();
    }
  );
  
  const todaysTotal = todaysOrders
    .filter((order) => order.status === 'paid')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const handleCheckout = async (method, options = {}) => {
    setCheckoutError(null);

    if (!cart.length) {
      setCheckoutError('Add at least one item before checkout.');
      return null;
    }
    if (!isOnline) {
      setCheckoutError(
        'Checkout is unavailable because TouB POS cannot reach the server. Your cart is still here; retry after the connection returns.'
      );
      return null;
    }
    const normalizedMethod = String(method || '').toUpperCase();
    if (normalizedMethod === 'KHQR' && !KHQR_ENABLED) {
      setCheckoutError('KHQR payments are temporarily unavailable. Please use cash.');
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
    const userId = currentUser?.id;
    const signature = createCheckoutSignature(orderPayload);
    let pendingCheckout = pendingCheckoutRef.current || readPendingCheckout(userId);
    if (
      !pendingCheckout
      || pendingCheckout.userId !== userId
      || pendingCheckout.signature !== signature
    ) {
      pendingCheckout = {
        userId,
        signature,
        idempotencyKey: createIdempotencyKey(),
        orderId: null,
      };
    }
    pendingCheckoutRef.current = pendingCheckout;
    writePendingCheckout(userId, pendingCheckout);

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      const createdOrder = pendingCheckout.orderId
        ? await api.orders.getById(pendingCheckout.orderId)
        : await api.orders.create(orderPayload, pendingCheckout.idempotencyKey);

      if (!pendingCheckout.orderId) {
        pendingCheckout = { ...pendingCheckout, orderId: createdOrder.id };
        pendingCheckoutRef.current = pendingCheckout;
        writePendingCheckout(userId, pendingCheckout);
      }

      const finalOrder = normalizedMethod === 'CASH'
        ? (
          createdOrder.status === 'paid'
            ? createdOrder
            : await api.orders.confirmCash(createdOrder.id, options.cashReceivedUsd)
        )
        : createdOrder;

      await fetchOrders(false);
      pendingCheckoutRef.current = null;
      clearPendingCheckout(userId);
      clearCart();
      return finalOrder;
    } catch(err) {
      if (err.status === 0) {
        onConnectionFailure?.();
      }
      const message = err.message || 'Failed to checkout.';
      setCheckoutError(message);
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
