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
import useNotifications from '../shared/notifications/useNotifications';

export default function OwnerPortalPage() {
  const { user: currentUser, logout, handleSessionInvalidated } = useAuth();

  // ── Permissions ───────────────────────────────────────────────────────────
  const { canManageMenu, canManageUsers, canManageOwnerActions, canViewOrders } = getPermissions(currentUser);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const isOnline = useOnlineStatus();
  const notifications = useNotifications();

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

  const handleSaveProduct = async (form) => {
    const saved = await saveProduct(form);
    if (saved) {
      notifications.success(
        `${form.name.trim()} was ${form.id ? 'updated' : 'added'} successfully.`,
        form.id ? 'Product updated' : 'Product added',
      );
    }
    return saved;
  };

  const handleSaveCategory = async () => {
    const wasEditing = Boolean(categoryForm.id);
    const name = categoryForm.name.trim();
    const saved = await saveCategory();
    if (saved) {
      notifications.success(
        `${name} was ${wasEditing ? 'updated' : 'added'} successfully.`,
        wasEditing ? 'Category updated' : 'Category added',
      );
    }
    return saved;
  };

  const handleToggleProductAvailability = async (productId) => {
    const product = products.find((item) => Number(item.id) === Number(productId));
    const updated = await toggleProductAvailability(productId);
    if (updated && product) {
      notifications.success(
        `${product.name} is now ${product.available ? 'hidden from' : 'visible on'} the cashier menu.`,
        product.available ? 'Product hidden' : 'Product available',
      );
    }
    return updated;
  };

  const handleMoveProducts = async (productIds, categoryId) => {
    const moved = await moveProductsToCategory(productIds, categoryId);
    if (moved) {
      const categoryName = categories.find((item) => Number(item.id) === Number(categoryId))?.name || 'the category';
      notifications.success(
        `${productIds.length} product${productIds.length === 1 ? '' : 's'} moved to ${categoryName}.`,
        'Products moved',
      );
    }
    return moved;
  };

  const handleSaveUser = async () => {
    const wasEditing = Boolean(userForm.id);
    const name = userForm.name.trim();
    const saved = await saveUser();
    if (saved) {
      notifications.success(
        `${name} was ${wasEditing ? 'updated' : 'added'} successfully.`,
        wasEditing ? 'Employee updated' : 'Employee added',
      );
    }
    return saved;
  };

  const handleToggleUserActive = async (userId) => {
    const target = users.find((item) => Number(item.id) === Number(userId));
    const updated = await toggleUserActive(userId);
    if (updated && target) {
      notifications.success(
        `${target.name}'s account is now ${target.active ? 'disabled' : 'active'}.`,
        target.active ? 'Employee disabled' : 'Employee enabled',
      );
    }
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
        onSaveProduct={handleSaveProduct}
        onEditProduct={editProduct}
        onToggleProductAvailability={handleToggleProductAvailability}
        onDeleteProduct={deleteProduct}
        onMoveProducts={handleMoveProducts}
        onSaveCategory={handleSaveCategory}
        onEditCategory={editCategory}
        onDeleteCategory={deleteCategory}
        onSaveUser={handleSaveUser}
        onEditUser={editUser}
        onToggleUserActive={handleToggleUserActive}
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
