import { useState } from 'react';
import { getPermissions } from '../utils/permissions';
import { useAuth } from '../auth/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useProducts } from '../hooks/useProducts';
import { useUsers } from '../hooks/useUsers';
import { useOrders } from '../hooks/useOrders';
import PageShell from '../components/PageShell';
import OwnerWorkspace from '../components/OwnerWorkspace';

export default function OwnerPortalPage() {
  const { user: currentUser, logout } = useAuth();

  // ── Permissions ───────────────────────────────────────────────────────────
  const { canManageMenu, canManageUsers, canViewOrders } = getPermissions(currentUser);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const isOnline = useOnlineStatus();

  const {
    categories, products, categoryById,
    productForm, setProductForm, categoryForm, setCategoryForm,
    saveCategory, editCategory, deleteCategory, cancelCategoryEdit,
    saveProduct, editProduct, toggleProductAvailability, deleteProduct, cancelProductEdit,
    loading: productsLoading, error: productsError,
  } = useProducts(canManageMenu);

  const {
    users, userForm, setUserForm,
    saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser,
    loading: usersLoading, error: usersError
  } = useUsers(canManageUsers, currentUser);

  const { orders, todaysOrders, todaysTotal } =
    useOrders(isOnline, [], () => {}, currentUser);

  const [ownerTab, setOwnerTab] = useState('dashboard');

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
  };

  // ── Owner tab visibility ──────────────────────────────────────────────────
  const allowedOwnerTabs = [
    'dashboard',
    canManageMenu  ? 'products' : null,  // includes Categories sub-tab
    canManageMenu  ? 'stalls'   : null,
    canViewOrders  ? 'orders'   : null,
    canManageUsers ? 'users'    : null,
  ].filter(Boolean);

  const visibleOwnerTab = allowedOwnerTabs.includes(ownerTab) ? ownerTab : allowedOwnerTabs[0];

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser) return null;

  return (
    <PageShell
      currentUser={currentUser}
      isCashier={false}
      onLogout={handleLogout}
    >
      <OwnerWorkspace
        currentUser={currentUser}
        visibleOwnerTab={visibleOwnerTab}
        setOwnerTab={setOwnerTab}
        allowedOwnerTabs={allowedOwnerTabs}
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
        onSaveProduct={saveProduct}
        onEditProduct={editProduct}
        onToggleProductAvailability={toggleProductAvailability}
        onDeleteProduct={deleteProduct}
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
        productsLoading={productsLoading}
        productsError={productsError}
        usersLoading={usersLoading}
        usersError={usersError}
        todaysOrders={todaysOrders}
        todaysTotal={todaysTotal}
        onLogout={handleLogout}
      />
    </PageShell>
  );
}
