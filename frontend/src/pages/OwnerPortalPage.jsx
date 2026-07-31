import { useEffect, useState } from 'react';
import { getPermissions } from '../utils/permissions';
import { useAuth } from '../features/auth/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useProducts } from '../hooks/useProducts';
import { useUsers } from '../hooks/useUsers';
import { useOrders } from '../hooks/useOrders';
import { api } from '../services/api';
import { connectManagementSocket, disconnectManagementSocket } from '../services/socketClient';
import PageShell from '../shared/layout/PageShell';
import OwnerWorkspace from '../features/management/components/OwnerWorkspace';

export default function OwnerPortalPage() {
  const { user: currentUser, logout, handleSessionInvalidated } = useAuth();

  // ── Permissions ───────────────────────────────────────────────────────────
  const { canManageMenu, canManageUsers, canManageOwnerActions, canViewOrders } = getPermissions(currentUser);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const isOnline = useOnlineStatus();

  const {
    categories, products, categoryById,
    productForm, setProductForm, categoryForm, setCategoryForm,
    saveCategory, editCategory, deleteCategory, cancelCategoryEdit,
    saveProduct, editProduct, toggleProductAvailability, deleteProduct, moveProductsToCategory, cancelProductEdit,
    loading: productsLoading, error: productsError,
    actionError: productsActionError, clearActionError: clearProductsActionError,
  } = useProducts(canManageMenu);

  const {
    users, userForm, setUserForm,
    saveUser, editUser, cancelUserEdit, toggleUserActive, deleteUser,
    loading: usersLoading, error: usersError,
    actionError: usersActionError, clearActionError: clearUsersActionError,
  } = useUsers(canManageUsers, currentUser);

  const { orders, todaysOrders, todaysTotal, fetchOrders } =
    useOrders(isOnline, [], () => {}, currentUser);

  const [ownerTab, setOwnerTab] = useState('dashboard');
  const [financialSettings, setFinancialSettings] = useState(null);
  const [financialSettingsLoading, setFinancialSettingsLoading] = useState(true);
  const [financialSettingsError, setFinancialSettingsError] = useState('');

  useEffect(() => {
    let active = true;
    api.financialSettings.get()
      .then((settings) => {
        if (active) setFinancialSettings(settings);
      })
      .catch((error) => {
        if (active) setFinancialSettingsError(error.message || 'Unable to load financial settings.');
      })
      .finally(() => {
        if (active) setFinancialSettingsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSaveFinancialSettings = async (rate) => {
    const updated = await api.financialSettings.update(rate);
    setFinancialSettings(updated);
    setFinancialSettingsError('');
    return updated;
  };

  useEffect(() => {
    if (!currentUser || !canViewOrders) {
      return undefined;
    }

    let mounted = true;
    const refreshOrders = async () => {
      if (mounted) {
        await fetchOrders(false);
      }
    };

    connectManagementSocket({
      onKitchenTicketUpdated: refreshOrders,
      onOrderUpdated: refreshOrders,
      onSessionInvalidated: (payload) => handleSessionInvalidated(payload?.message),
    });

    return () => {
      mounted = false;
      disconnectManagementSocket();
    };
  }, [currentUser, canViewOrders, fetchOrders, handleSessionInvalidated]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
  };

  const handleRetryTelegramDispatch = async (orderId) => {
    const updatedOrder = await api.orders.retryTelegram(orderId);
    await fetchOrders(false);
    return updatedOrder;
  };

  // ── Owner tab visibility ──────────────────────────────────────────────────
  const allowedOwnerTabs = [
    'dashboard',
    canManageMenu  ? 'products' : null,  // includes Categories sub-tab
    canManageMenu  ? 'stalls'   : null,
    canManageUsers ? 'users'    : null,
    canViewOrders  ? 'orders'   : null,
    canManageOwnerActions ? 'settings' : null,
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
        onMoveProducts={moveProductsToCategory}
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
        productsActionError={productsActionError}
        clearProductsActionError={clearProductsActionError}
        usersLoading={usersLoading}
        usersError={usersError}
        usersActionError={usersActionError}
        clearUsersActionError={clearUsersActionError}
        financialSettings={financialSettings}
        financialSettingsLoading={financialSettingsLoading}
        financialSettingsError={financialSettingsError}
        onSaveFinancialSettings={handleSaveFinancialSettings}
        todaysOrders={todaysOrders}
        todaysTotal={todaysTotal}
        onRetryTelegramDispatch={handleRetryTelegramDispatch}
        onLogout={handleLogout}
      />
    </PageShell>
  );
}
