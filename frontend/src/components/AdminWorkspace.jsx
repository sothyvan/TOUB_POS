import ProductAdmin from './ProductAdmin';
import CategoryAdmin from './CategoryAdmin';
import OrderHistory from './OrderHistory';
import UserAdmin from './UserAdmin';

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
  return (
    <main className="flex-1 p-[clamp(18px,2.4vw,30px)] overflow-auto max-[768px]:p-4">
      <section className="p-5.5 border border-[#ded8ca] rounded-lg bg-[#fffdfa]/78 flex items-center justify-between gap-4.5 shadow-[0_10px_24px_rgba(52,45,35,0.07)] max-[768px]:flex-col max-[768px]:items-start">
        <div>
          <p className="m-0 mb-[3px] text-[#776f63] text-[11px] font-extrabold tracking-wider uppercase">Back office</p>
          <h2 className="m-0 text-brand-dark text-[26px] leading-[1.1] font-bold">{users.some((u) => u.role === 'Admin') ? 'Admin management' : 'Manager workspace'}</h2>
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-[768px]:justify-start">
          <span className="min-h-[34px] py-2 px-2.75 rounded-full bg-[#24211f] text-[#fff9ee] text-[13px] font-black">{products.length} items</span>
          <span className="min-h-[34px] py-2 px-2.75 rounded-full bg-[#24211f] text-[#fff9ee] text-[13px] font-black">{categories.length} categories</span>
          <span className="min-h-[34px] py-2 px-2.75 rounded-full bg-[#24211f] text-[#fff9ee] text-[13px] font-black">{orders.length} orders</span>
          {users.some((u) => u.role === 'Admin') ? <span className="min-h-[34px] py-2 px-2.75 rounded-full bg-[#24211f] text-[#fff9ee] text-[13px] font-black">{users.length} users</span> : null}
        </div>
      </section>

      <div className="my-4.5 mx-0 flex flex-wrap gap-2" role="tablist" aria-label="Admin areas">
        {allowedAdminTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`min-h-[40px] px-4 border border-[#d9d0c1] rounded-full bg-[#fffdfa] text-[#4f483f] text-sm font-black capitalize cursor-pointer ${
              visibleAdminTab === tab ? 'bg-brand-primary border-brand-primary text-[#fffaf0]' : ''
            }`}
            onClick={() => setAdminTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

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
          onDelete={onDeleteProduct}
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
          onDelete={onDeleteCategory}
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
          onDelete={onDeleteUser}
          onCancel={onCancelUser}
        />
      ) : null}
    </main>
  );
}
