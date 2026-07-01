import { useState } from 'react';
import OwnerDashboard from './OwnerDashboard';
import MenuCatalog from './MenuCatalog';
import StallOwner from './StallOwner';
import OrderHistory from './OrderHistory';
import UserOwner from './UserOwner';
import ConfirmDialog from './ui/ConfirmDialog';
import Icon from './ui/Icon';
import OwnerSidebar from './OwnerSidebar';
import OwnerHeader from './OwnerHeader';

const ownerTabIcons = {
  dashboard: 'dashboard',
  products: 'product',
  categories: 'category',
  orders: 'orders',
  users: 'users',
};

const navButtonClass = (isActive) =>
  `flex items-center gap-3 w-full min-h-11.5 px-4 rounded-xl text-[14px] font-bold capitalize transition-all duration-200 cursor-pointer active:scale-[0.98] ${
    isActive
      ? 'bg-brand-action text-white shadow-sm'
      : 'text-[#776f63] hover:bg-gray-50 hover:text-brand-dark'
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
  onLogout,
  currentUser,
  productsLoading,
  productsError,
  usersLoading,
  usersError,
}) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handlePromptDelete = (type, id) => {
    const name = 
      type === 'product' ? products.find((p) => p.id === id)?.name :
      type === 'category' ? categories.find((c) => c.id === id)?.name :
      type === 'user' ? users.find((u) => u.id === id)?.name : '';
    setPendingDelete({ type, id, name });
    setDeleteConfirmationText('');
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (deleteConfirmationText.trim() !== 'DELETE') return;
    const { type, id } = pendingDelete;
    if (type === 'product') onDeleteProduct(id);
    else if (type === 'category') onDeleteCategory(id);
    else if (type === 'user') onDeleteUser(id);
    setPendingDelete(null);
    setDeleteConfirmationText('');
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
      <div className="hidden max-[768px]:flex flex-col bg-brand-card border-b border-brand-border z-30 shrink-0">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-bold text-brand-dark flex items-center gap-2">
            <Icon name={ownerTabIcons[visibleOwnerTab]} className="w-5 h-5 text-brand-action" />
            <span className="capitalize">{visibleOwnerTab} Management</span>
          </span>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 rounded-xl border border-brand-border bg-brand-card grid place-items-center text-brand-text hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <Icon name="close" />
            ) : (
              <Icon name="menu" />
            )}
          </button>
        </div>

        {/* Collapsible Mobile Sidebar (Dropdown menu) */}
        {isMobileMenuOpen && (
          <nav className="flex flex-col p-4 pt-0 gap-1 border-t border-brand-border/60 bg-brand-card animate-in slide-in-from-top duration-150">
            {allowedOwnerTabs.map((tab) => {
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
                  <span>{tab}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right Main Content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
        {/* Figma-spec owner topbar (desktop only) */}
        <div className="max-[768px]:hidden">
          <OwnerHeader activeTab={visibleOwnerTab} />
        </div>

        <main className="flex-1 p-[clamp(18px,2.4vw,30px)] overflow-y-auto max-[768px]:p-4 flex flex-col gap-6">
        {/* Tab Subcomponents */}
        <div className="flex-1">
          {visibleOwnerTab === 'dashboard' && <OwnerDashboard />}

          {visibleOwnerTab === 'products' && (
            <MenuCatalog
              products={products}
              productForm={productForm}
              setProductForm={setProductForm}
              onSaveProduct={onSaveProduct}
              onEditProduct={onEditProduct}
              onToggleProductAvailability={onToggleProductAvailability}
              onDeleteProduct={(id) => handlePromptDelete('product', id)}
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
            />
          )}

          {visibleOwnerTab === 'stalls' && (
            <StallOwner users={users} />
          )}

          {visibleOwnerTab === 'orders' && (
            <OrderHistory
              orders={orders}
              todaysOrders={todaysOrders}
              todaysTotal={todaysTotal}
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
            />
          )}
        </div>
      </main>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        size="compact"
        title="Are you sure?"
        message={pendingDelete ? (
          <div className="flex flex-col gap-3">
            <span>
            You are about to delete the {pendingDelete.type}{' '}
            <strong className="text-brand-dark">"{pendingDelete.name}"</strong>.
            This action cannot be undone.
            </span>
            <label className="text-left text-xs font-bold text-brand-subtext">
              Type DELETE to confirm
              <input
                className="mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-bold text-brand-dark outline-none focus:border-brand-action"
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
        ) : null}
        icon={(
          <div className="w-16 h-16 rounded-full bg-[#fdf5d6] flex items-center justify-center text-brand-yellow mb-4">
            <Icon name="warning" className="w-8 h-8" />
          </div>
        )}
        cancelTone="secondary"
        confirmTone="danger"
        confirmLabel="Delete"
        overlayClassName="bg-brand-dark/40"
        panelClassName="border-brand-yellow bg-[#fffcf0]"
        isConfirmDisabled={deleteConfirmationText.trim() !== 'DELETE'}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteConfirmationText('');
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
