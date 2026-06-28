import { useState } from 'react';
import { getPermissions } from '../utils/permissions';
import { useAuth } from '../auth/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useProducts } from '../hooks/useProducts';
import { useUsers } from '../hooks/useUsers';
import { useOrders } from '../hooks/useOrders';
import PageShell from '../components/PageShell';
import AdminWorkspace from '../components/AdminWorkspace';

export default function AdminPortalPage() {
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
  } = useProducts(canManageMenu);

  const {
    users, userForm, setUserForm,
    saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser
  } = useUsers(canManageUsers, currentUser);

  const { orders, todaysOrders, todaysTotal } =
    useOrders(isOnline, [], () => {}, currentUser, null, {
      subtotal: 0, serviceFee: 0, estimatedTax: 0, total: 0
    });

  const [adminTab, setAdminTab] = useState('dashboard');

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
  };

  // ── Admin tab visibility ──────────────────────────────────────────────────
  const allowedAdminTabs = [
    'dashboard',
    canManageMenu  ? 'products' : null,  // includes Categories sub-tab
    canManageMenu  ? 'stalls'   : null,
    canViewOrders  ? 'orders'   : null,
    canManageUsers ? 'users'    : null,
  ].filter(Boolean);

  const visibleAdminTab = allowedAdminTabs.includes(adminTab) ? adminTab : allowedAdminTabs[0];

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser) return null;

  return (
    <PageShell
      currentUser={currentUser}
      isCashier={false}
      onLogout={handleLogout}
    >
      <AdminWorkspace
        currentUser={currentUser}
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
        todaysOrders={todaysOrders}
        todaysTotal={todaysTotal}
        onLogout={handleLogout}
      />
    </PageShell>
  );
}
