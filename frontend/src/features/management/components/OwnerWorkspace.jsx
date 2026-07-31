import { useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import OwnerDashboard from './OwnerDashboard';
import MenuCatalog from '../../catalog/components/MenuCatalog';
import StallOwner from '../../stalls/components/StallOwner';
import OrderHistory from '../../reports/components/OrderHistory';
import UserOwner from '../../staff/components/UserOwner';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Icon from '../../../components/ui/Icon';
import OwnerSidebar from './OwnerSidebar';
import OwnerHeader from './OwnerHeader';
import ThemeToggle from '../../../shared/theme/ThemeToggle';
import FinancialSettings from './FinancialSettings';

const notificationToast = Swal.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: 'var(--color-ui-elevated, #ffffff)',
  color: 'var(--color-text-strong, #1b1917)',
  customClass: {
    popup: 'border border-brand-border font-sans shadow-[0_18px_48px_rgba(0,0,0,0.35)]',
  },
});

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
  const mobileOwnerTabs = ownerTabOrder.filter((tab) => allowedOwnerTabs.includes(tab));

  const handlePromptDelete = async (type, id) => {
    const name = 
      type === 'product' ? products.find((p) => p.id === id)?.name :
      type === 'category' ? categories.find((c) => c.id === id)?.name :
      type === 'user' ? users.find((u) => u.id === id)?.name : '';

    const label = type === 'product' ? 'product' : type === 'category' ? 'category' : 'user';

    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `You are about to delete the ${label} <strong style="color: var(--color-brand-action, #c9571d)">"${name}"</strong>.<br/><br/>This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Delete',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonColor: '#b53f3f', // matching state-danger
      cancelButtonColor: '#827c74',  // matching text-muted
      background: 'var(--color-ui-elevated, #ffffff)',
      color: 'var(--color-text-strong, #1b1917)',
      customClass: {
        popup: 'rounded-lg shadow-[0_18px_48px_rgba(0,0,0,0.4)] border border-brand-border font-sans'
      }
    });

    if (result.isConfirmed) {
      try {
        // Show loading state
        Swal.fire({
          title: 'Deleting...',
          html: `Please wait while the ${label} is being deleted.`,
          allowOutsideClick: false,
          background: 'var(--color-ui-elevated, #ffffff)',
          color: 'var(--color-text-strong, #1b1917)',
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Perform deletion
        if (type === 'product') await onDeleteProduct(id);
        else if (type === 'category') await onDeleteCategory(id);
        else if (type === 'user') await onDeleteUser(id);

        // Success notification
        await notificationToast.fire({
          title: 'Deleted!',
          text: `The ${label} has been deleted successfully.`,
          icon: 'success',
        });
      } catch (err) {
        // Error notification
        await notificationToast.fire({
          title: 'Failed to delete!',
          text: err.message || `An error occurred while deleting the ${label}.`,
          icon: 'error',
        });
      }
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
              onDeleteProduct={(id) => handlePromptDelete('product', id)}
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
      </main>
      </div>

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
