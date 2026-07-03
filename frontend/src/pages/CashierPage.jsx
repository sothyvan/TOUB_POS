import { useEffect, useState, useCallback } from 'react';
import { getPermissions } from '../utils/permissions';
import { api } from '../services/api';
import { useAuth } from '../auth/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import PageShell from '../components/PageShell';
import CashierScreen from '../components/CashierScreen';
import ReceiptModal from '../components/ReceiptModal';
import CashConfirmationModal from '../components/CashConfirmationModal';
import KhqrPaymentModal from '../components/KhqrPaymentModal';
import Icon from '../components/ui/Icon';

export default function CashierPage() {
  const { user: currentUser, logout } = useAuth();
  const { isCashier } = getPermissions(currentUser);

  // ── Stall assignment (cashiers only) ──────────────────────────────────────
  const [assignedStall, setAssignedStall] = useState(null);
  const [loadingStall, setLoadingStall] = useState(isCashier);

  useEffect(() => {
    if (!isCashier) {
      return;
    }
    let mounted = true;
    api.auth.getMyStall()
      .then(stall => {
        if (mounted) setAssignedStall(stall);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoadingStall(false);
      });
    return () => { mounted = false; };
  }, [isCashier]);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const isOnline = useOnlineStatus();

  const {
    categories, categoryById, filteredProducts,
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery,
  } = useProducts(false);

  const {
    cart, cartById, itemCount, subtotal, serviceFee, estimatedTax, total,
    addToCart, updateQuantity, setCartItemQuantity, clearCart,
  } = useCart(categoryById);

  const { orders, handleCheckout, checkoutLoading, checkoutError } =
    useOrders(isOnline, cart, clearCart, currentUser);

  const [activeReceipt, setActiveReceipt] = useState(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);
  const [pendingKhqrOrder, setPendingKhqrOrder] = useState(null);

  const handleCheckoutWithReceipt = async (method) => {
    if (method === 'KHQR') {
      const order = await handleCheckout(method);
      if (order) {
        setPendingKhqrOrder(order);
        setPendingPaymentMethod(method);
      }
      return;
    }

    setPendingPaymentMethod(method);
  };

  const handleConfirmPayment = useCallback(async () => {
    if (!pendingPaymentMethod) return;
    
    const method = pendingPaymentMethod;
    const order = await handleCheckout(method);
    if (order) {
      setPendingPaymentMethod(null);
      setActiveReceipt(order);
    }
  }, [pendingPaymentMethod, handleCheckout, setActiveReceipt]);

  // ── UI state ──────────────────────────────────────────────────────────────
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
          <div className="w-8 h-8 border-4 border-[#003ec7] border-t-transparent rounded-full animate-spin"></div>
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
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 px-6 py-2.5 rounded-xl border-0 cursor-pointer hover:opacity-80 transition-all"
          style={{ background: '#fff1f2', fontSize: 13, fontWeight: 600, color: '#dc2626', fontFamily: 'Inter, sans-serif' }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell
      currentUser={currentUser}
      isCashier={isCashier}
      itemCount={itemCount}
      onCartOpen={() => setIsCartOpen(true)}
      onLogout={handleLogout}
      assignedStall={assignedStall}
    >
      <CashierScreen
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
        isOnline={isOnline}
        assignedStall={assignedStall}
      />

      <ReceiptModal
        activeReceipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />

      <CashConfirmationModal
        isOpen={pendingPaymentMethod === 'CASH'}
        isBusy={checkoutLoading}
        error={checkoutError}
        onCancel={() => {
          if (!checkoutLoading) setPendingPaymentMethod(null);
        }}
        onConfirm={handleConfirmPayment}
      />

      <KhqrPaymentModal
        isOpen={pendingPaymentMethod === 'KHQR'}
        total={pendingKhqrOrder?.total ?? total}
        order={pendingKhqrOrder}
        qrPayload={pendingKhqrOrder?.qrPayload}
        onCancel={() => {
          setPendingPaymentMethod(null);
          setPendingKhqrOrder(null);
        }}
      />
    </PageShell>
  );
}
