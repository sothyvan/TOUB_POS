import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { money } from '../utils/format';
import { getPermissions } from '../utils/permissions';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useCart } from '../hooks/useCart';
import { useProducts } from '../hooks/useProducts';
import { useUsers } from '../hooks/useUsers';
import { useOrders } from '../hooks/useOrders';
import PageShell from '../components/PageShell';
import CashierScreen from '../components/CashierScreen';
import AdminWorkspace from '../components/AdminWorkspace';

export default function CashierPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Auth guard ────────────────────────────────────────────────────────────
  const currentUser = location.state?.currentUser || null;

  useEffect(() => {
    if (!currentUser) navigate('/login', { replace: true });
  }, [currentUser, navigate]);

  // ── Permissions ───────────────────────────────────────────────────────────
  const { isCashier, canManageMenu, canManageUsers, canViewOrders } = getPermissions(currentUser);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const isOnline = useOnlineStatus();

  const {
    categories, products, categoryById, filteredProducts,
    productForm, setProductForm, categoryForm, setCategoryForm,
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery,
    saveCategory, editCategory, deleteCategory, cancelCategoryEdit,
    saveProduct, editProduct, toggleProductAvailability, deleteProduct, cancelProductEdit,
  } = useProducts(canManageMenu);

  const {
    cart, cartById, itemCount, subtotal, serviceFee, estimatedTax, total,
    addToCart, updateQuantity, setCartItemQuantity, clearCart, removeItemFromCart,
  } = useCart(categoryById);

  const { users, userForm, setUserForm, saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser } =
    useUsers(canManageUsers, currentUser?.id);

  const { orders, todaysOrders, todaysTotal, handleCheckout } =
    useOrders(isOnline, cart, clearCart, currentUser, { subtotal, serviceFee, estimatedTax, total });

  const [activeReceipt, setActiveReceipt] = useState(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);

  const handleCheckoutWithReceipt = (method) => {
    setPendingPaymentMethod(method);
  };

  const handleConfirmPayment = () => {
    if (!pendingPaymentMethod) return;
    const order = handleCheckout(pendingPaymentMethod);
    setPendingPaymentMethod(null);
    if (order) {
      setActiveReceipt(order);
    }
  };

  useEffect(() => {
    if (pendingPaymentMethod === 'KHQR') {
      const timer = setTimeout(() => {
        handleConfirmPayment();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [pendingPaymentMethod]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('products');

  // ── Cart-sync wrappers ────────────────────────────────────────────────────
  const handleSaveProduct = () => {
    const removedId = saveProduct();
    if (removedId) removeItemFromCart(removedId);
  };

  const handleToggleProductAvailability = (productId) => {
    const removedId = toggleProductAvailability(productId);
    if (removedId) removeItemFromCart(removedId);
  };

  const handleDeleteProduct = (productId) => {
    const removedId = deleteProduct(productId);
    if (removedId) removeItemFromCart(removedId);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearCart();
    setIsCartOpen(false);
    navigate('/login', { replace: true });
  };

  // ── Admin tab visibility ──────────────────────────────────────────────────
  const allowedAdminTabs = [
    canManageMenu    ? 'products'   : null,
    canManageMenu    ? 'categories' : null,
    canViewOrders    ? 'orders'     : null,
    canManageUsers   ? 'users'      : null,
  ].filter(Boolean);

  const visibleAdminTab = allowedAdminTabs.includes(adminTab) ? adminTab : allowedAdminTabs[0];

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell
      currentUser={currentUser}
      isCashier={isCashier}
      isOnline={isOnline}
      itemCount={itemCount}
      onCartOpen={() => setIsCartOpen(true)}
      onLogout={handleLogout}
    >
      {isCashier ? (
        <CashierScreen
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
        />
      ) : (
        <AdminWorkspace
          visibleAdminTab={visibleAdminTab}
          setAdminTab={setAdminTab}
          allowedAdminTabs={allowedAdminTabs}
          products={products}
          categories={categories}
          orders={orders}
          users={users}
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          productForm={productForm}
          setProductForm={setProductForm}
          userForm={userForm}
          setUserForm={setUserForm}
          onSaveProduct={handleSaveProduct}
          onEditProduct={editProduct}
          onToggleProductAvailability={handleToggleProductAvailability}
          onDeleteProduct={handleDeleteProduct}
          onSaveCategory={saveCategory}
          onEditCategory={editCategory}
          onDeleteCategory={deleteCategory}
          onSaveUser={saveUser}
          onEditUser={editUser}
          onToggleUserActive={toggleUserActive}
          onDeleteUser={deleteUser}
          onCancelProduct={cancelProductEdit}
          onCancelCategory={cancelCategoryEdit}
          onCancelUser={cancelUserEdit}
          categoryById={categoryById}
          todaysOrders={todaysOrders}
          todaysTotal={todaysTotal}
        />
      )}

      {/* Receipt Modal Overlay */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#f8f9fa] border-b border-gray-100 p-5 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#e6f4eb] text-[#126149] flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="m-0 text-xl font-bold text-gray-900 leading-snug">Payment Confirmed</h3>
              <p className="m-0 mt-1 text-gray-500 text-sm font-semibold">
                Receipt: {activeReceipt.orderNo}
              </p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white ${
                activeReceipt.paymentMethod === 'KHQR' ? 'bg-[#c70000]' : 'bg-[#157811]'
              }`}>
                Paid via {activeReceipt.paymentMethod}
              </span>
            </div>

            {/* Receipt Details List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Order summary</div>
              <div className="space-y-3.5">
                {activeReceipt.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <strong className="block text-gray-900 text-sm font-bold truncate">{item.name}</strong>
                      <span className="block mt-0.5 text-gray-400 text-xs font-semibold">
                        {item.quantity} x {money(item.price)}
                      </span>
                    </div>
                    <strong className="text-gray-900 text-sm font-bold shrink-0">
                      {money(item.lineTotal)}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-gray-500 text-sm font-semibold">
                  <span>Subtotal</span>
                  <span className="text-gray-950">{money(activeReceipt.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-sm font-semibold">
                  <span>Service Fee (3%)</span>
                  <span className="text-gray-950">{money(activeReceipt.serviceFee)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-sm font-semibold">
                  <span>Estimated Tax (8%)</span>
                  <span className="text-gray-950">{money(activeReceipt.estimatedTax)}</span>
                </div>
                <div className="flex justify-between text-gray-955 text-base font-bold pt-3 mt-1.5 border-t border-gray-100 items-baseline">
                  <span>Total Amount</span>
                  <span className="text-2xl text-[#003ec7] font-black">{money(activeReceipt.total)}</span>
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t border-dashed border-gray-200 pt-4 mt-4 text-[11px] text-gray-400 font-bold space-y-1">
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{activeReceipt.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Station:</span>
                  <span>{activeReceipt.station}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span>{new Date(activeReceipt.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-gray-100 bg-[#f8f9fa] flex gap-3">
              <button
                className="flex-1 h-12 bg-[#003ec7] hover:bg-[#003ec7]/90 text-white rounded-xl font-bold transition-all cursor-pointer border-0 shadow-sm"
                type="button"
                onClick={() => setActiveReceipt(null)}
              >
                New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay by Cash Confirmation Toast/Modal */}
      {pendingPaymentMethod === 'CASH' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ebc02b] rounded-[32px] w-[540px] max-w-full p-8 flex flex-col items-center text-center shadow-[0_24px_64px_rgba(0,0,0,0.24)] animate-in fade-in zoom-in-95 duration-200 border-0">
            <h3 className="m-0 text-3xl font-extrabold text-[#1a1c1e] mb-8 mt-2 tracking-tight">
              Did you received the cash?
            </h3>
            <div className="flex items-center justify-center gap-6 w-full mb-2">
              <button
                className="flex-1 h-15 bg-[#c70000] hover:brightness-105 active:scale-[0.98] text-white text-2xl font-black rounded-2xl transition-all cursor-pointer border-0 shadow-md flex items-center justify-center"
                type="button"
                onClick={() => setPendingPaymentMethod(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 h-15 bg-[#157811] hover:brightness-105 active:scale-[0.98] text-white text-2xl font-black rounded-2xl transition-all cursor-pointer border-0 shadow-md flex items-center justify-center"
                type="button"
                onClick={handleConfirmPayment}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay by QR Code Confirmation Toast/Modal */}
      {pendingPaymentMethod === 'KHQR' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#ebc02b] rounded-[32px] w-[460px] max-w-full p-7 flex flex-col items-center text-center shadow-[0_24px_64px_rgba(0,0,0,0.24)] animate-in fade-in zoom-in-95 duration-200 border-0">
            <h3 className="m-0 text-[26px] font-extrabold text-[#1a1c1e] mb-5 mt-1 tracking-tight">
              Scan QR Code to Pay!
            </h3>
            
            {/* KHQR Poster Slip */}
            <div 
              className="bg-white rounded-[24px] p-6 w-full shadow-lg flex flex-col items-center border border-gray-150 relative overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform active:scale-[0.99]"
              title="Click to simulate scan / payment success"
              onClick={handleConfirmPayment}
            >
              <span className="text-[28px] font-black tracking-tight text-[#d32f2f] uppercase leading-none mt-1">
                BANK LOGO
              </span>
              <span className="text-[11px] font-bold text-gray-400 tracking-wide uppercase mt-1">
                Scan. Pay. Done.
              </span>
              
              {/* QR Code Graphic */}
              <div className="border border-gray-150 rounded-2xl p-4 my-5 bg-white relative shadow-sm">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=pay-to-toub-pos-amount-${total}`}
                  alt="KHQR Code" 
                  className="w-[180px] h-[180px] block"
                />
                {/* Simulated center badge icon */}
                <div className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold text-red-600 text-xs">
                  T
                </div>
              </div>
              
              <span className="text-lg font-black text-[#0f2c59] tracking-tight uppercase leading-none">
                TOUB POS MERCHANT
              </span>
              <span className="text-[11px] font-bold text-gray-400 mt-1">
                merchant@toubpos
              </span>
              
              {/* Member of KHQR footer */}
              <div className="w-full flex justify-between items-center mt-5 pt-3 border-t border-gray-100 text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Member of</span>
                <span className="text-base font-black text-[#d32f2f] tracking-tighter leading-none">KHQR</span>
              </div>
            </div>
            
            <button
              className="w-4/5 h-14 bg-[#c70000] hover:brightness-105 active:scale-[0.98] text-white text-xl font-bold rounded-2xl transition-all cursor-pointer border-0 shadow-md flex items-center justify-center mt-6"
              type="button"
              onClick={() => setPendingPaymentMethod(null)}
            >
              Cancel
            </button>
            <span className="text-xs font-semibold text-gray-700 mt-3 animate-pulse">
              Waiting for payment detection...
            </span>
          </div>
        </div>
      )}
    </PageShell>
  );
}
