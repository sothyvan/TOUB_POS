import { useState } from 'react';
import ProductAdmin from './ProductAdmin';
import CategoryAdmin from './CategoryAdmin';
import OrderHistory from './OrderHistory';
import UserAdmin from './UserAdmin';
import ConfirmDialog from './ui/ConfirmDialog';

export default function AdminWorkspace({
  visibleAdminTab,
  setAdminTab,
  allowedAdminTabs,
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
}) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handlePromptDelete = (type, id) => {
    const name = 
      type === 'product' ? products.find((p) => p.id === id)?.name :
      type === 'category' ? categories.find((c) => c.id === id)?.name :
      type === 'user' ? users.find((u) => u.id === id)?.name : '';
    setPendingDelete({ type, id, name });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    if (type === 'product') onDeleteProduct(id);
    else if (type === 'category') onDeleteCategory(id);
    else if (type === 'user') onDeleteUser(id);
    setPendingDelete(null);
  };

  return (
    <div className="flex-1 flex overflow-hidden max-[768px]:flex-col">
      {/* Left Sidebar Navigation (Desktop) */}
      <aside className="w-60 border-r border-brand-border bg-brand-card flex flex-col p-6 gap-5 shrink-0 max-[768px]:hidden">
        <div className="text-[11px] font-extrabold tracking-wider text-gray-400 uppercase select-none">
          Back Office Menu
        </div>
        <nav className="flex flex-col gap-1.5">
          {allowedAdminTabs.map((tab) => {
            const isActive = visibleAdminTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setAdminTab(tab)}
                className={`flex items-center gap-3 w-full min-h-11.5 px-4 rounded-xl text-[14px] font-bold capitalize transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'bg-brand-action text-white shadow-sm'
                    : 'text-[#776f63] hover:bg-gray-50 hover:text-brand-dark'
                }`}
              >
                {tab === 'products' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                )}
                {tab === 'categories' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                )}
                {tab === 'orders' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                )}
                {tab === 'users' && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
                <span>{tab}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Hamburger Header Bar (Phone) */}
      <div className="hidden max-[768px]:flex flex-col bg-brand-card border-b border-brand-border z-30 shrink-0">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-bold text-brand-dark flex items-center gap-2">
            {visibleAdminTab === 'products' && (
                <svg className="w-5 h-5 text-brand-action" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )}
            {visibleAdminTab === 'categories' && (
                <svg className="w-5 h-5 text-brand-action" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}
            {visibleAdminTab === 'orders' && (
                <svg className="w-5 h-5 text-brand-action" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            )}
            {visibleAdminTab === 'users' && (
                <svg className="w-5 h-5 text-brand-action" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
            <span className="capitalize">{visibleAdminTab} Management</span>
          </span>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 rounded-xl border border-brand-border bg-brand-card grid place-items-center text-brand-text hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Collapsible Mobile Sidebar (Dropdown menu) */}
        {isMobileMenuOpen && (
          <nav className="flex flex-col p-4 pt-0 gap-1 border-t border-brand-border/60 bg-brand-card animate-in slide-in-from-top duration-150">
            {allowedAdminTabs.map((tab) => {
              const isActive = visibleAdminTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setAdminTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full min-h-11.5 px-4 rounded-xl text-[14px] font-bold capitalize transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? 'bg-brand-action text-white shadow-sm'
                      : 'text-[#776f63] hover:bg-gray-50 hover:text-brand-dark'
                  }`}
                >
                  {tab === 'products' && (
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                  {tab === 'categories' && (
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )}
                  {tab === 'orders' && (
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  )}
                  {tab === 'users' && (
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  <span>{tab}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right Main Content area */}
      <main className="flex-1 p-[clamp(18px,2.4vw,30px)] overflow-y-auto max-[768px]:p-4 bg-brand-bg flex flex-col gap-6">
        {/* Dashboard Title & Quick Stats Info Banner */}
        <section className="p-6 border border-brand-border rounded-3xl bg-brand-card flex items-center justify-between gap-4.5 shadow-[0_10px_24px_rgba(52,45,35,0.04)] max-[768px]:flex-col max-[768px]:items-start shrink-0">
          <div>
            <p className="m-0 mb-0.75 text-[#776f63] text-[11px] font-extrabold tracking-wider uppercase">Back office</p>
            <h2 className="m-0 text-brand-dark text-[26px] leading-[1.1] font-black tracking-tight">
              {users.some((u) => u.role === 'Admin') ? 'Admin management' : 'Manager workspace'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 justify-end max-[768px]:justify-start">
            <span className="min-h-8.5 py-1.75 px-3.5 rounded-full bg-[#f5f2eb] border border-[#e6e0d4] text-[#23211f] text-[13px] font-bold flex items-center">{products.length} items</span>
            <span className="min-h-8.5 py-1.75 px-3.5 rounded-full bg-[#f5f2eb] border border-[#e6e0d4] text-[#23211f] text-[13px] font-bold flex items-center">{categories.length} categories</span>
            <span className="min-h-8.5 py-1.75 px-3.5 rounded-full bg-[#f5f2eb] border border-[#e6e0d4] text-[#23211f] text-[13px] font-bold flex items-center">{orders.length} orders</span>
            {users.some((u) => u.role === 'Admin') ? (
              <span className="min-h-8.5 py-1.75 px-3.5 rounded-full bg-[#f5f2eb] border border-[#e6e0d4] text-[#23211f] text-[13px] font-bold flex items-center">{users.length} users</span>
            ) : null}
          </div>
        </section>

        {/* Tab Subcomponents */}
        <div className="flex-1">
          {visibleAdminTab === 'products' ? (
            <ProductAdmin
              productForm={productForm}
              setProductForm={setProductForm}
              categories={categories}
              categoryById={categoryById}
              products={products}
              onSave={onSaveProduct}
              onEdit={onEditProduct}
              onToggleAvailability={onToggleProductAvailability}
              onDelete={(id) => handlePromptDelete('product', id)}
              onCancel={onCancelProduct}
            />
          ) : null}

          {visibleAdminTab === 'categories' ? (
            <CategoryAdmin
              categoryForm={categoryForm}
              setCategoryForm={setCategoryForm}
              categories={categories}
              products={products}
              onSave={onSaveCategory}
              onEdit={onEditCategory}
              onDelete={(id) => handlePromptDelete('category', id)}
              onCancel={onCancelCategory}
            />
          ) : null}

          {visibleAdminTab === 'orders' ? (
            <OrderHistory
              orders={orders}
              todaysOrders={todaysOrders}
              todaysTotal={todaysTotal}
            />
          ) : null}

          {visibleAdminTab === 'users' ? (
            <UserAdmin
              userForm={userForm}
              setUserForm={setUserForm}
              users={users}
              onSave={onSaveUser}
              onEdit={onEditUser}
              onToggleActive={onToggleUserActive}
              onDelete={(id) => handlePromptDelete('user', id)}
              onCancel={onCancelUser}
            />
          ) : null}
        </div>
      </main>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        size="compact"
        title="Are you sure?"
        message={pendingDelete ? (
          <>
            You are about to delete the {pendingDelete.type}{' '}
            <strong className="text-brand-dark">"{pendingDelete.name}"</strong>.
            This action cannot be undone.
          </>
        ) : null}
        icon={(
          <div className="w-16 h-16 rounded-full bg-[#fdf5d6] flex items-center justify-center text-brand-yellow mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}
        cancelTone="secondary"
        confirmTone="danger"
        confirmLabel="Delete"
        overlayClassName="bg-brand-dark/40"
        panelClassName="border-brand-yellow bg-[#fffcf0]"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
