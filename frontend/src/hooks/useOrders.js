import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { KHQR_ENABLED } from '../config/features';
import { api } from '../services/api';
import {
  clearPendingCheckout,
  createCheckoutSignature,
  createIdempotencyKey,
  readPendingCheckout,
  writePendingCheckout,
} from '../utils/pendingCheckout';
import { createCashierRecoveryScope } from '../utils/cartRecovery';
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
  const [recoveredCheckout, setRecoveredCheckout] = useState(null);
  const pendingCheckoutRef = useRef(null);
  const clearCartRef = useRef(clearCart);
  const recoveryScope = useMemo(
    () => createCashierRecoveryScope(currentUser),
    [currentUser],
  );

  useEffect(() => {
    clearCartRef.current = clearCart;
  }, [clearCart]);

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

  useEffect(() => {
    let active = true;

    if (!recoveryScope) {
      pendingCheckoutRef.current = null;
      return () => {
        active = false;
      };
    }

    const pendingCheckout = readPendingCheckout(recoveryScope);
    pendingCheckoutRef.current = pendingCheckout;
    if (!pendingCheckout?.orderId) {
      return () => {
        active = false;
      };
    }

    api.orders.getById(pendingCheckout.orderId)
      .then(async (order) => {
        if (!active) return;

        if (order.status === 'paid') {
          pendingCheckoutRef.current = null;
          clearPendingCheckout(recoveryScope);
          clearCartRef.current();
          setRecoveredCheckout({ state: 'paid', order });
          await fetchOrders(false);
          return;
        }

        if (order.status === 'cancelled') {
          pendingCheckoutRef.current = null;
          clearPendingCheckout(recoveryScope);
          setRecoveredCheckout({ state: 'cancelled', order });
          return;
        }

        setRecoveredCheckout({ state: 'pending', order });
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) {
          pendingCheckoutRef.current = null;
          clearPendingCheckout(recoveryScope);
          setRecoveredCheckout({ state: 'missing', order: null });
        }
      });

    return () => {
      active = false;
    };
  }, [fetchOrders, recoveryScope]);

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
    setRecoveredCheckout(null);

    const normalizedMethod = String(method || '').toUpperCase();
    const storedPendingCheckout = pendingCheckoutRef.current
      || readPendingCheckout(recoveryScope);
    const canResumeCreatedOrder = Boolean(
      storedPendingCheckout?.orderId
      && storedPendingCheckout?.paymentMethod === normalizedMethod,
    );

    if (!cart.length && !canResumeCreatedOrder) {
      setCheckoutError('Add at least one item before checkout.');
      return null;
    }
    if (!isOnline) {
      setCheckoutError(
        'Checkout is unavailable because TouB POS cannot reach the server. Your cart is still here; retry after the connection returns.'
      );
      return null;
    }
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
    const userId = recoveryScope?.userId;
    const signature = cart.length
      ? createCheckoutSignature(orderPayload)
      : storedPendingCheckout.signature;
    let pendingCheckout = storedPendingCheckout;
    if (
      !pendingCheckout
      || pendingCheckout.userId !== userId
      || (
        pendingCheckout.signature !== signature
        && !canResumeCreatedOrder
      )
    ) {
      pendingCheckout = {
        userId,
        paymentMethod: normalizedMethod,
        signature,
        idempotencyKey: createIdempotencyKey(),
        orderId: null,
      };
    }
    pendingCheckoutRef.current = pendingCheckout;
    writePendingCheckout(recoveryScope, pendingCheckout);

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      const createdOrder = pendingCheckout.orderId
        ? await api.orders.getById(pendingCheckout.orderId)
        : await api.orders.create(orderPayload, pendingCheckout.idempotencyKey);

      if (!pendingCheckout.orderId) {
        pendingCheckout = { ...pendingCheckout, orderId: createdOrder.id };
        pendingCheckoutRef.current = pendingCheckout;
        writePendingCheckout(recoveryScope, pendingCheckout);
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
      clearPendingCheckout(recoveryScope);
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
    recoveredCheckout,
  };
}
