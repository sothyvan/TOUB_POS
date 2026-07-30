import { useEffect, useState, useCallback, useRef } from 'react';
import { KHQR_ENABLED } from '../config/features';
import { getPermissions, roleToApiRole } from '../utils/permissions';
import { api } from '../services/api';
import { connectCashierSocket, disconnectCashierSocket } from '../services/socketClient';
import { useAuth } from '../features/auth/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import PageShell from '../shared/layout/PageShell';
import CashierScreen from '../features/cashier/components/CashierScreen';
import ReceiptModal from '../features/payments/components/ReceiptModal';
import CashConfirmationModal from '../features/payments/components/CashConfirmationModal';
import KhqrPaymentModal from '../features/payments/components/KhqrPaymentModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import LoadingState from '../components/ui/LoadingState';

export default function CashierPage() {
  const {
    user: currentUser,
    logout,
    handleDeviceRevoked,
    handleSessionInvalidated,
  } = useAuth();
  const { isCashier } = getPermissions(currentUser);

  // ── Stall assignment (cashiers only) ──────────────────────────────────────
  const [assignedStall, setAssignedStall] = useState(null);
  const [loadingStall, setLoadingStall] = useState(isCashier);

  const loadAssignedStall = useCallback(async (showSpinner = false) => {
    if (!isCashier) {
      setAssignedStall(null);
      setLoadingStall(false);
      return null;
    }

    try {
      if (showSpinner) setLoadingStall(true);
      const stall = await api.auth.getMyStall();
      setAssignedStall(stall);
      return stall;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      if (showSpinner) setLoadingStall(false);
    }
  }, [isCashier]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadAssignedStall(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadAssignedStall]);

  useAutoRefresh(() => loadAssignedStall(false), {
    enabled: isCashier,
    intervalMs: 30000,
  });

  useEffect(() => {
    if (!isCashier) return undefined;

    const validateDevice = () => {
      void api.auth.getDeviceStatus().catch(() => {
        // The shared API interceptor handles revoked/invalid device sessions.
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') validateDevice();
    };

    window.addEventListener('focus', validateDevice);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', validateDevice);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCashier]);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const isOnline = useOnlineStatus();

  const {
    categories, categoryById, filteredProducts,
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery,
    loading: productsLoading,
    error: productsError,
  } = useProducts(false);

  const {
    cart, cartById, itemCount, subtotal, serviceFee, estimatedTax, total,
    addToCart, updateQuantity, setCartItemQuantity, clearCart,
  } = useCart(categoryById);

  const {
    orders,
    handleCheckout,
    fetchOrders,
    loading: ordersLoading,
    error: ordersError,
    checkoutLoading,
    checkoutError,
  } =
    useOrders(isOnline, cart, clearCart, currentUser);

  const [activeReceipt, setActiveReceipt] = useState(null);
  const [cashierNotice, setCashierNotice] = useState(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);
  const [pendingKhqrOrder, setPendingKhqrOrder] = useState(null);
  const [isKhqrConfirmOpen, setIsKhqrConfirmOpen] = useState(false);
  const [khqrPollingError, setKhqrPollingError] = useState(null);
  const pageMountedRef = useRef(false);
  const pendingPaymentMethodRef = useRef(null);
  const pendingKhqrOrderIdRef = useRef(null);

  useEffect(() => {
    pageMountedRef.current = true;
    return () => {
      pageMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    pendingPaymentMethodRef.current = pendingPaymentMethod;
    pendingKhqrOrderIdRef.current = pendingKhqrOrder?.id ?? null;
  }, [pendingPaymentMethod, pendingKhqrOrder?.id]);

  const refreshOrderSnapshot = useCallback(async (orderId) => {
    const parsedOrderId = Number(orderId);
    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      await fetchOrders(false);
      return null;
    }

    try {
      const latestOrder = await api.orders.getById(parsedOrderId);
      if (!pageMountedRef.current) {
        return null;
      }

      setActiveReceipt((current) => (
        Number(current?.id) === parsedOrderId ? latestOrder : current
      ));
      setPendingKhqrOrder((current) => (
        Number(current?.id) === parsedOrderId ? latestOrder : current
      ));
      await fetchOrders(false);
      return latestOrder;
    } catch {
      if (pageMountedRef.current) {
        await fetchOrders(false);
      }
      return null;
    }
  }, [fetchOrders]);

  const scheduleOrderSnapshotRefresh = useCallback((orderId) => {
    window.setTimeout(() => {
      if (pageMountedRef.current) {
        void refreshOrderSnapshot(orderId);
      }
    }, 1200);
  }, [refreshOrderSnapshot]);

  const handleCheckoutWithReceipt = async (method) => {
    setCashierNotice(null);
    if (method === 'KHQR') {
      if (!KHQR_ENABLED) {
        setCashierNotice({
          variant: 'warning',
          title: 'KHQR unavailable',
          message: 'KHQR payments are temporarily unavailable. Please use cash.',
        });
        return;
      }
      setKhqrPollingError(null);
      setIsKhqrConfirmOpen(true);
      return;
    }

    setPendingPaymentMethod(method);
  };

  const handleCreateKhqrPayment = useCallback(async () => {
    const order = await handleCheckout('KHQR');
    if (order) {
      setKhqrPollingError(null);
      setPendingKhqrOrder(order);
      setPendingPaymentMethod('KHQR');
      setIsKhqrConfirmOpen(false);
    }
  }, [handleCheckout]);

  const handleConfirmPayment = useCallback(async (cashReceivedUsd) => {
    if (!pendingPaymentMethod) return;
    
    const method = pendingPaymentMethod;
    const order = await handleCheckout(method, { cashReceivedUsd });
    if (order) {
      setPendingPaymentMethod(null);
      setActiveReceipt(order);
      scheduleOrderSnapshotRefresh(order.id);
    }
  }, [pendingPaymentMethod, handleCheckout, scheduleOrderSnapshotRefresh]);

  const handleRetryTelegramDispatch = useCallback(async (orderId) => {
    const updatedOrder = await api.orders.retryTelegram(orderId);
    await fetchOrders(false);
    return updatedOrder;
  }, [fetchOrders]);

  const handleResumeKhqrPayment = useCallback(async (order) => {
    if (!order?.id) {
      return;
    }

    try {
      setKhqrPollingError(null);
      const latestOrder = await api.orders.getById(order.id);
      await fetchOrders(false);

      if (latestOrder.status === 'paid') {
        setPendingPaymentMethod(null);
        setPendingKhqrOrder(null);
        setActiveReceipt(latestOrder);
        return;
      }

      if (
        latestOrder.paymentMethod !== 'KHQR'
        || latestOrder.status !== 'pending_payment'
        || !latestOrder.qrPayload
      ) {
        setCashierNotice({
          variant: 'warning',
          title: 'QR cannot be resumed',
          message: 'This KHQR order can no longer be resumed.',
        });
        return;
      }

      const expiryTime = latestOrder.paymentExpiresAt
        ? new Date(latestOrder.paymentExpiresAt).getTime()
        : null;
      const isExpired = Number.isFinite(expiryTime) && expiryTime <= Date.now();

      setPendingKhqrOrder(latestOrder);
      setPendingPaymentMethod('KHQR');
      setKhqrPollingError(isExpired
        ? 'This QR has expired. Create a new KHQR checkout if the customer has not paid.'
        : null);
    } catch (err) {
      setCashierNotice({
        variant: 'danger',
        title: 'Unable to resume QR',
        message: err.message || 'Unable to resume KHQR payment.',
      });
    }
  }, [fetchOrders]);

  useEffect(() => {
    if (!KHQR_ENABLED || pendingPaymentMethod !== 'KHQR' || !pendingKhqrOrder?.id) {
      return undefined;
    }

    let stopped = false;
    let isPolling = false;
    let initialTimerId = null;
    let intervalId = null;

    function stopPolling() {
      if (initialTimerId) window.clearTimeout(initialTimerId);
      if (intervalId) window.clearInterval(intervalId);
    }

    async function pollOrderStatus() {
      if (isPolling) {
        return;
      }

      isPolling = true;
      try {
        const statusResult = await api.orders.checkKhqrStatus(pendingKhqrOrder.id);
        if (stopped) {
          return;
        }

        const latestOrder = statusResult.order;
        if (!latestOrder) {
          setKhqrPollingError('Unable to read KHQR payment status.');
          return;
        }

        setPendingKhqrOrder(latestOrder);
        const nonFatalMessage = ['error', 'failed'].includes(statusResult.providerStatus)
          ? statusResult.message
          : null;
        setKhqrPollingError(nonFatalMessage);

        if (statusResult.paymentStatus === 'paid' || latestOrder.status === 'paid') {
          stopPolling();
          setPendingPaymentMethod(null);
          setPendingKhqrOrder(null);
          setActiveReceipt(latestOrder);
          scheduleOrderSnapshotRefresh(latestOrder.id);
          await fetchOrders(false);
        }

        if (statusResult.paymentStatus === 'expired') {
          stopPolling();
          setKhqrPollingError(statusResult.message || 'This QR has expired. Create a new KHQR checkout.');
        }

        if (statusResult.paymentStatus === 'cancelled' || latestOrder.status === 'cancelled') {
          stopPolling();
          setPendingPaymentMethod(null);
          setPendingKhqrOrder(null);
          await fetchOrders(false);
        }
      } catch (err) {
        if (!stopped) {
          setKhqrPollingError(err.message || 'Unable to refresh KHQR payment status.');
        }
      } finally {
        isPolling = false;
      }
    }

    initialTimerId = window.setTimeout(pollOrderStatus, 0);
    intervalId = window.setInterval(pollOrderStatus, 2500);

    return () => {
      stopped = true;
      stopPolling();
    };
  }, [pendingPaymentMethod, pendingKhqrOrder?.id, fetchOrders, scheduleOrderSnapshotRefresh]);

  useEffect(() => {
    if (!currentUser || roleToApiRole(currentUser.role) !== 'cashier') {
      return undefined;
    }

    let mounted = true;

    connectCashierSocket({
      onDeviceRevoked: (payload) => {
        if (mounted) {
          handleDeviceRevoked(payload?.message);
        }
      },
      onSessionInvalidated: (payload) => {
        if (mounted) {
          handleSessionInvalidated(payload?.message);
        }
      },
      onKitchenTicketUpdated: async (payload) => {
        if (mounted) {
          await refreshOrderSnapshot(payload?.orderId);
        }
      },
      onPaymentConfirmed: async (payload) => {
        if (!mounted || !payload?.orderId) {
          return;
        }

        const orderId = Number(payload.orderId);
        const isCurrentKhqrOrder = pendingPaymentMethodRef.current === 'KHQR'
          && Number(pendingKhqrOrderIdRef.current) === orderId;

        try {
          const latestOrder = await api.orders.getById(orderId);
          if (!mounted) {
            return;
          }

          await fetchOrders(false);

          if (isCurrentKhqrOrder) {
            setPendingKhqrOrder(latestOrder);
            setKhqrPollingError(null);

            if (latestOrder.status === 'paid') {
              setPendingPaymentMethod(null);
              setPendingKhqrOrder(null);
              setActiveReceipt(latestOrder);
              scheduleOrderSnapshotRefresh(latestOrder.id);
            }
          }
        } catch (err) {
          if (mounted && isCurrentKhqrOrder) {
            setKhqrPollingError(err.message || 'Payment was confirmed, but the receipt could not be loaded.');
          }
        }
      },
      onConnectError: (err) => {
        if (pendingPaymentMethodRef.current === 'KHQR') {
          setKhqrPollingError(err.message || 'Live payment notification is unavailable. Polling is still active.');
        }
      },
    });

    return () => {
      mounted = false;
      disconnectCashierSocket();
    };
  }, [
    currentUser,
    fetchOrders,
    handleDeviceRevoked,
    handleSessionInvalidated,
    refreshOrderSnapshot,
    scheduleOrderSnapshotRefresh,
  ]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeCashierTab, setActiveCashierTab] = useState('sale');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearCart();
    setIsCartOpen(false);
    logout();
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser || !isCashier) return null;

  // ── Guard: cashier with no stall assigned ─────────────────────────────────
  if (isCashier && !assignedStall) {
    if (loadingStall) {
      return (
        <div className="h-svh flex items-center justify-center bg-[#f8fafc]">
          <LoadingState label="Loading your assigned stall..." />
        </div>
      );
    }

    return (
      <div className="h-svh flex flex-col items-center justify-center gap-4 bg-[#f8fafc] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-[#fff1f2] flex items-center justify-center">
          <Icon name="location" className="w-8 h-8" style={{ color: '#dc2626' }} strokeWidth={1.8} />
        </div>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
            No Stall Assigned
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#9ca3af', fontFamily: 'Inter, sans-serif', maxWidth: 320 }}>
            You haven't been assigned to a stall yet. Ask an owner or manager to assign you in Stall Management.
          </p>
        </div>
        <Button
          onClick={handleLogout}
          className="mt-2"
          variant="danger"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell
      currentUser={currentUser}
      isCashier={isCashier}
      itemCount={itemCount}
      onCartOpen={() => {
        setActiveCashierTab('sale');
        setIsCartOpen(true);
      }}
      onLogout={handleLogout}
      assignedStall={assignedStall}
    >
      <CashierScreen
        activeTab={activeCashierTab}
        setActiveTab={setActiveCashierTab}
        currentUser={currentUser}
        orders={orders}
        onViewReceipt={setActiveReceipt}
        categories={categories}
        categoryById={categoryById}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredProducts={filteredProducts}
        productsLoading={productsLoading}
        productsError={productsError}
        cart={cart}
        cartById={cartById}
        addToCart={addToCart}
        updateQuantity={updateQuantity}
        setCartItemQuantity={setCartItemQuantity}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        itemCount={itemCount}
        subtotal={subtotal}
        serviceFee={serviceFee}
        estimatedTax={estimatedTax}
        total={total}
        clearCart={clearCart}
        handleCheckout={handleCheckoutWithReceipt}
        checkoutLoading={checkoutLoading}
        checkoutError={checkoutError}
        ordersLoading={ordersLoading}
        ordersError={ordersError}
        cashierNotice={cashierNotice}
        onDismissCashierNotice={() => setCashierNotice(null)}
        isOnline={isOnline}
        assignedStall={assignedStall}
        onRetryTelegramDispatch={handleRetryTelegramDispatch}
        onResumeKhqrPayment={KHQR_ENABLED ? handleResumeKhqrPayment : undefined}
        khqrEnabled={KHQR_ENABLED}
      />

      <ReceiptModal
        activeReceipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />

      {pendingPaymentMethod === 'CASH' ? (
        <CashConfirmationModal
          isOpen
          total={total}
          isBusy={checkoutLoading}
          error={checkoutError}
          onCancel={() => {
            if (!checkoutLoading) setPendingPaymentMethod(null);
          }}
          onConfirm={handleConfirmPayment}
        />
      ) : null}

      {KHQR_ENABLED ? (
        <ConfirmDialog
          isOpen={isKhqrConfirmOpen}
          size="compact"
          title="Create KHQR payment?"
          message={(
            <div className="w-full rounded-lg border border-ui-border bg-ui-surface p-4 text-left">
              <div className="flex items-center justify-between gap-4 border-b border-ui-border pb-3 text-sm">
                <span className="text-brand-subtext">Items</span>
                <span className="text-brand-text">{itemCount}</span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-3 text-sm">
                <span className="text-brand-subtext">Total</span>
                <span className="text-state-success">${Number(total || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
          icon={(
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-brand-action mb-4">
              <Icon name="khqr" className="w-7 h-7" />
            </div>
          )}
          cancelLabel="Back to cart"
          confirmLabel="Create KHQR"
          cancelTone="secondary"
          confirmTone="primary"
          isBusy={checkoutLoading}
          onCancel={() => {
            if (!checkoutLoading) setIsKhqrConfirmOpen(false);
          }}
          onConfirm={handleCreateKhqrPayment}
        />
      ) : null}

      {KHQR_ENABLED ? (
        <KhqrPaymentModal
          isOpen={pendingPaymentMethod === 'KHQR'}
          total={pendingKhqrOrder?.total ?? total}
          order={pendingKhqrOrder}
          qrPayload={pendingKhqrOrder?.qrPayload}
          pollingError={khqrPollingError}
          onCancel={() => {
            setPendingPaymentMethod(null);
            setPendingKhqrOrder(null);
            setKhqrPollingError(null);
          }}
        />
      ) : null}
    </PageShell>
  );
}
