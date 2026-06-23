import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPermissions } from '../utils/permissions';
import { getAssignedStall } from '../utils/stallUtils';
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
  const location = useLocation();
  const navigate = useNavigate();

  // ── Auth guard ────────────────────────────────────────────────────────────
  const currentUser = location.state?.currentUser || null;
  const { isCashier } = getPermissions(currentUser);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
    } else if (!isCashier) {
      navigate('/admin-portal', { state: { currentUser }, replace: true });
    }
  }, [currentUser, isCashier, navigate]);

  // ── Stall assignment (cashiers only) ──────────────────────────────────────
  const assignedStall = isCashier ? getAssignedStall(currentUser?.id) : null;

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

  const { orders, handleCheckout } =
    useOrders(isOnline, cart, clearCart, currentUser, assignedStall, { subtotal, serviceFee, estimatedTax, total });

  const [activeReceipt, setActiveReceipt] = useState(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);

  const handleCheckoutWithReceipt = (method) => {
    setPendingPaymentMethod(method);
  };

  const handleConfirmPayment = useCallback(() => {
    if (!pendingPaymentMethod) return;
    const order = handleCheckout(pendingPaymentMethod);
    setPendingPaymentMethod(null);
    if (order) {
      setActiveReceipt(order);
    }
  }, [pendingPaymentMethod, handleCheckout, setActiveReceipt]);

  useEffect(() => {
    if (pendingPaymentMethod === 'KHQR') {
      const timer = setTimeout(() => {
        handleConfirmPayment();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [pendingPaymentMethod, handleConfirmPayment]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearCart();
    setIsCartOpen(false);
    navigate('/login', { replace: true });
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser || !isCashier) return null;

  // ── Guard: cashier with no stall assigned ─────────────────────────────────
  if (isCashier && !assignedStall) {
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
            You haven't been assigned to a stall yet. Ask your admin to assign you in Stall Management.
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
        isOnline={isOnline}
        assignedStall={assignedStall}
      />

      <ReceiptModal
        activeReceipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />

      <CashConfirmationModal
        isOpen={pendingPaymentMethod === 'CASH'}
        onCancel={() => setPendingPaymentMethod(null)}
        onConfirm={handleConfirmPayment}
      />

      <KhqrPaymentModal
        isOpen={pendingPaymentMethod === 'KHQR'}
        total={total}
        onCancel={() => setPendingPaymentMethod(null)}
        onConfirm={handleConfirmPayment}
      />
    </PageShell>
  );
}
