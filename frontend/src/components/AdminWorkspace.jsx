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
  categoryById,
  todaysOrders,
  todaysTotal,
}) {
  return (
    <main className="admin-workspace">
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Back office</p>
          <h2>{users.some((u) => u.role === 'Admin') ? 'Admin management' : 'Manager workspace'}</h2>
        </div>
        <div className="admin-stats">
          <span>{products.length} items</span>
          <span>{categories.length} categories</span>
          <span>{orders.length} orders</span>
          {users.some((u) => u.role === 'Admin') ? <span>{users.length} users</span> : null}
        </div>
      </section>

      <div className="admin-tabs" role="tablist" aria-label="Admin areas">
        {allowedAdminTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={visibleAdminTab === tab ? 'active' : ''}
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
        />
      ) : null}
    </main>
  );
}
