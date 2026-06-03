import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    cart, cartById, itemCount, subtotal, serviceFee, total,
    addToCart, updateQuantity, setCartItemQuantity, clearCart, removeItemFromCart,
  } = useCart(categoryById);

  const { users, userForm, setUserForm, saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser } =
    useUsers(canManageUsers, currentUser?.id);

  const { orders, todaysOrders, todaysTotal, handleCheckout } =
    useOrders(isOnline, cart, clearCart, currentUser, { subtotal, serviceFee, total });

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
          total={total}
          clearCart={clearCart}
          handleCheckout={handleCheckout}
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
    </PageShell>
  );
}
