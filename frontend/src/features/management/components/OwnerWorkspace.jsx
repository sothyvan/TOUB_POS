import { lazy, Suspense, useState } from 'react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Icon from '../../../components/ui/Icon';
import LoadingState from '../../../components/ui/LoadingState';
import OwnerSidebar from './OwnerSidebar';
import OwnerHeader from './OwnerHeader';
import ThemeToggle from '../../../shared/theme/ThemeToggle';
import useNotifications from '../../../shared/notifications/useNotifications';

const OwnerDashboard = lazy(() => import('./OwnerDashboard'));
const MenuCatalog = lazy(() => import('../../catalog/components/MenuCatalog'));
const StallOwner = lazy(() => import('../../stalls/components/StallOwner'));
const OrderHistory = lazy(() => import('../../reports/components/OrderHistory'));
const UserOwner = lazy(() => import('../../staff/components/UserOwner'));
const FinancialSettings = lazy(() => import('./FinancialSettings'));

const ownerTabIcons = {
  dashboard: 'dashboard',
  products: 'product',
  categories: 'category',
  orders: 'orders',
  users: 'users',
  stalls: 'location',
  settings: 'settings',
};

const ownerTabLabels = {
  dashboard: 'Dashboard',
  products: 'Menu & Catalog',
  stalls: 'Stall Management',
  orders: 'Sales Reports',
  users: 'Staff Management',
  settings: 'Financial Settings',
};

const ownerTabOrder = ['dashboard', 'products', 'stalls', 'users', 'orders', 'settings'];

const navButtonClass = (isActive) =>
  `flex items-center gap-3 w-full min-h-11.5 px-4 rounded-md border text-[14px] font-semibold capitalize transition-all duration-200 cursor-pointer active:scale-[0.98] ${
    isActive
      ? 'border-brand-action/40 bg-brand-action/10 text-brand-action'
      : 'border-transparent text-text-soft hover:border-brand-border hover:bg-ui-muted hover:text-brand-dark'
  }`;

export default function OwnerWorkspace({
  visibleOwnerTab,
  setOwnerTab,
  allowedOwnerTabs,
  products,
  categories,
  orders,
  users,
  categoryForm,
  setCategoryForm,
  productForm,
  setProductForm,
  userForm,
  setUserForm,
  onSaveProduct,
  onEditProduct,
  onToggleProductAvailability,
  onDeleteProduct,
  onMoveProducts,
  onSaveCategory,
  onEditCategory,
  onDeleteCategory,
  onSaveUser,
  onEditUser,
  onToggleUserActive,
  onDeleteUser,
  onCancelProduct,
  onCancelCategory,
  onCancelUser,
  categoryById,
  todaysOrders,
  todaysTotal,
  onRetryTelegramDispatch,
  onLogout,
  currentUser,
  productsLoading,
  productsError,
  usersLoading,
  usersError,
  productsActionError,
  clearProductsActionError,
  usersActionError,
  clearUsersActionError,
  financialSettings,
  financialSettingsLoading,
  financialSettingsError,
  onSaveFinancialSettings,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileLogoutConfirm, setShowMobileLogoutConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const notifications = useNotifications();
  const mobileOwnerTabs = ownerTabOrder.filter((tab) => allowedOwnerTabs.includes(tab));

  const handlePromptDelete = (type, id, onDeleted) => {
    const name = 
      type === 'product' ? products.find((p) => p.id === id)?.name :
      type === 'category' ? categories.find((c) => c.id === id)?.name :
      type === 'user' ? users.find((u) => u.id === id)?.name : '';

    const label = type === 'product' ? 'product' : type === 'category' ? 'category' : 'user';
    setPendingDelete({ type, id, name: name || `this ${label}`, label, onDeleted });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeleting) return;

    const { type, id, label, onDeleted } = pendingDelete;
    setIsDeleting(true);
    try {
      if (type === 'product') await onDeleteProduct(id);
      else if (type === 'category') await onDeleteCategory(id);
      else if (type === 'user') await onDeleteUser(id);

      onDeleted?.();
      setPendingDelete(null);
      notifications.success(`The ${label} was deleted successfully.`, 'Deleted');
    } catch {
      notifications.error(`The ${label} could not be deleted. Review the page message and try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden max-[768px]:flex-col">
      {/* Left Sidebar Navigation (Desktop) — Figma: Owner Dashboard - Computer */}
      <div className="max-[768px]:hidden">
        <OwnerSidebar
          activeTab={visibleOwnerTab}
          allowedTabs={allowedOwnerTabs}
          onTabChange={setOwnerTab}
          userName={currentUser?.name ?? 'Owner Account'}
          userRole={currentUser?.role ?? 'Owner'}
          onLogout={onLogout}
        />
      </div>

      {/* Mobile Hamburger Header Bar (Phone) */}
      <div className="hidden max-[768px]:flex flex-col bg-ui-surface border-b border-brand-border z-30 shrink-0">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-bold text-brand-dark flex items-center gap-2">
            <Icon name={ownerTabIcons[visibleOwnerTab]} className="w-5 h-5 text-brand-action" />
            <span>{ownerTabLabels[visibleOwnerTab] ?? visibleOwnerTab}</span>
          </span>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 rounded-md border border-brand-border bg-ui-surface grid place-items-center text-brand-text hover:border-brand-action/45 hover:bg-ui-muted active:scale-95 transition-all cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <Icon name="close" />
              ) : (
                <Icon name="menu" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Sidebar (Dropdown menu) */}
        {isMobileMenuOpen && (
          <nav className="flex flex-col p-4 pt-0 gap-1 border-t border-brand-border/60 bg-ui-surface animate-in slide-in-from-top duration-150">
            {mobileOwnerTabs.map((tab) => {
              const isActive = visibleOwnerTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setOwnerTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={navButtonClass(isActive)}
                >
                  <Icon name={ownerTabIcons[tab]} className="w-5 h-5 shrink-0" />
                  <span>{ownerTabLabels[tab] ?? tab}</span>
                </button>
              );
            })}
            <div className="mt-2 border-t border-brand-border pt-3">
              <button
                type="button"
                onClick={() => setShowMobileLogoutConfirm(true)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-sm font-bold text-state-danger transition-colors hover:bg-red-50"
              >
                <Icon name="logout" className="h-5 w-5" />
                Log out
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* Right Main Content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-ui-bg">
        {/* Figma-spec owner topbar (desktop only) */}
        <div className="max-[768px]:hidden">
          <OwnerHeader activeTab={visibleOwnerTab} />
        </div>

        <main className="flex-1 p-[clamp(18px,2.4vw,30px)] overflow-y-auto max-[768px]:p-4 flex flex-col gap-6">
        {/* Tab Subcomponents */}
        <Suspense
          fallback={(
            <LoadingState
              className="min-h-64 rounded-lg border border-ui-border bg-ui-surface"
              label="Loading management workspace..."
            />
          )}
        >
        <div className="flex-1">
          {visibleOwnerTab === 'dashboard' && <OwnerDashboard orders={orders} />}

          {visibleOwnerTab === 'products' && (
            <MenuCatalog
              products={products}
              productForm={productForm}
              setProductForm={setProductForm}
              onSaveProduct={onSaveProduct}
              onEditProduct={onEditProduct}
              onToggleProductAvailability={onToggleProductAvailability}
              onDeleteProduct={(id, onDeleted) => handlePromptDelete('product', id, onDeleted)}
              onMoveProducts={onMoveProducts}
              onCancelProduct={onCancelProduct}
              categories={categories}
              categoryForm={categoryForm}
              setCategoryForm={setCategoryForm}
              onSaveCategory={onSaveCategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={(id) => handlePromptDelete('category', id)}
              onCancelCategory={onCancelCategory}
              categoryById={categoryById}
              loading={productsLoading}
              error={productsError}
              actionError={productsActionError}
              clearActionError={clearProductsActionError}
              exchangeRateKhrPerUsd={financialSettings?.exchangeRateKhrPerUsd}
            />
          )}

          {visibleOwnerTab === 'stalls' && (
            <StallOwner users={users} currentUser={currentUser} />
          )}

          {visibleOwnerTab === 'orders' && (
            <OrderHistory
              orders={orders}
              todaysOrders={todaysOrders}
              todaysTotal={todaysTotal}
              onRetryTelegramDispatch={onRetryTelegramDispatch}
            />
          )}

          {visibleOwnerTab === 'users' && (
            <UserOwner
              userForm={userForm}
              setUserForm={setUserForm}
              users={users}
              onSave={onSaveUser}
              onEdit={onEditUser}
              onToggleActive={onToggleUserActive}
              onDelete={(id) => handlePromptDelete('user', id)}
              onCancel={onCancelUser}
              currentUser={currentUser}
              loading={usersLoading}
              error={usersError}
              actionError={usersActionError}
              clearActionError={clearUsersActionError}
            />
          )}

          {visibleOwnerTab === 'settings' && (
            <FinancialSettings
              key={financialSettings?.updatedAt || financialSettings?.exchangeRateKhrPerUsd || 'default'}
              settings={financialSettings}
              loading={financialSettingsLoading}
              error={financialSettingsError}
              onSave={onSaveFinancialSettings}
            />
          )}
        </div>
        </Suspense>
      </main>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        size="compact"
        title={`Delete ${pendingDelete?.label || 'item'}?`}
        message={`You are about to delete "${pendingDelete?.name || ''}". This action cannot be undone.`}
        icon={<Icon name="delete" className="mb-1 h-8 w-8 text-state-danger" strokeWidth={2} />}
        cancelTone="secondary"
        confirmTone="danger"
        confirmLabel="Delete"
        busyLabel="Deleting..."
        isBusy={isDeleting}
        onCancel={() => {
          if (!isDeleting) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        isOpen={showMobileLogoutConfirm}
        size="compact"
        title="Log out?"
        message="You will be returned to the welcome screen and need to sign in again."
        cancelTone="secondary"
        confirmTone="danger"
        confirmLabel="Log out"
        onCancel={() => setShowMobileLogoutConfirm(false)}
        onConfirm={() => {
          setShowMobileLogoutConfirm(false);
          setIsMobileMenuOpen(false);
          onLogout();
        }}
      />
    </div>
  );
}
