import { useEffect, useMemo, useState } from 'react';
import './styles/CashierWorkspace.css';
import { useSavedState } from './hooks/useSavedState';
import {
  SERVICE_RATE,
  ROLES,
  TONES,
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_USERS,
} from './data/seedData';
import { money, suggestedCode, initials } from './utils/format';
import { makeId } from './utils/ids';
import { defaultPinForRole, getPermissions } from './utils/permissions';
import LoginScreen from './components/LoginScreen';
import Topbar from './components/Topbar';
import CashierScreen from './components/CashierScreen';
import OrderPanel from './components/OrderPanel';
import AdminWorkspace from './components/AdminWorkspace';

function blankProductForm(categoryId = DEFAULT_CATEGORIES[0].id) {
  return {
    id: null,
    name: '',
    code: '',
    price: '',
    categoryId,
    tone: 'gold',
    available: true,
  };
}

function blankUserForm() {
  return {
    id: null,
    name: '',
    role: 'Cashier',
    station: 'Station 01',
    pin: '',
    active: true,
  };
}

export default function CashierWorkspace() {
  const [categories, setCategories] = useSavedState('sabay-pos-categories', DEFAULT_CATEGORIES);
  const [products, setProducts] = useSavedState('sabay-pos-products', DEFAULT_PRODUCTS);
  const [rawUsers, setUsers] = useSavedState('sabay-pos-users', DEFAULT_USERS);
  const [orders, setOrders] = useSavedState('sabay-pos-orders', []);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [loginUserId, setLoginUserId] = useState(() => rawUsers.find((user) => user.active)?.id || '');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('products');
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', tone: 'gold' });
  const [productForm, setProductForm] = useState(() => blankProductForm());
  const [userForm, setUserForm] = useState(() => blankUserForm());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const users = useMemo(
    () => rawUsers.map((user) => ({ ...user, pin: user.pin || defaultPinForRole(user.role) })),
    [rawUsers],
  );

  const activeUsers = users.filter((user) => user.active);
  const effectiveLoginUserId =
    users.some((user) => user.id === loginUserId && user.active) ? loginUserId : activeUsers[0]?.id || '';
  const currentUser = users.find((user) => user.id === sessionUserId) || null;

  const permissions = getPermissions(currentUser);
  const { isAdmin, isManager, isCashier, canManageMenu, canManageUsers, canViewOrders } = permissions;

  const allowedAdminTabs = [
    canManageMenu ? 'products' : null,
    canManageMenu ? 'categories' : null,
    canViewOrders ? 'orders' : null,
    canManageUsers ? 'users' : null,
  ].filter(Boolean);

  const visibleAdminTab = allowedAdminTabs.includes(adminTab) ? adminTab : allowedAdminTabs[0];

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const visibleProducts = products.filter((product) => product.available);
  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return visibleProducts.filter((product) => {
      const category = categoryById.get(product.categoryId);
      const inCategory = selectedCategory === 'All' || product.categoryId === selectedCategory;
      const inSearch =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.code.toLowerCase().includes(normalizedQuery) ||
        category?.name.toLowerCase().includes(normalizedQuery);

      return inCategory && inSearch;
    });
  }, [categoryById, searchQuery, selectedCategory, visibleProducts]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = subtotal * SERVICE_RATE;
  const total = subtotal + serviceFee;
  const cartById = useMemo(() => new Map(cart.map((item) => [item.id, item])), [cart]);

  const todaysOrders = orders.filter(
    (order) => new Date(order.createdAt).toDateString() === new Date().toDateString(),
  );
  const todaysTotal = todaysOrders.reduce((sum, order) => sum + order.total, 0);

  const handleLogin = (event) => {
    event.preventDefault();
    const user = users.find((candidate) => candidate.id === effectiveLoginUserId && candidate.active);

    if (!user || user.pin !== loginPin.trim()) {
      setLoginError('Invalid user or PIN.');
      return;
    }

    setSessionUserId(user.id);
    setLoginPin('');
    setLoginError('');
  };

  const handleLogout = () => {
    setSessionUserId(null);
    setCart([]);
    setIsCartOpen(false);
    setSearchQuery('');
    setSelectedCategory('All');
  };

  const addToCart = (product) => {
    const category = categoryById.get(product.categoryId);

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);

      if (!existingItem) {
        return [...currentCart, { ...product, categoryName: category?.name || 'Menu', quantity: 1 }];
      }

      return currentCart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  };

  const updateQuantity = (id, change) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + change } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => {
    setCart([]);
    setIsCartOpen(false);
  };

  const handleCheckout = (method) => {
    if (!cart.length) {
      alert('Add at least one item before checkout.');
      return;
    }

    if (method === 'KHQR' && !isOnline) {
      alert('KHQR needs an internet connection. Take cash or reconnect the terminal.');
      return;
    }

    const order = {
      id: makeId('order'),
      orderNo: `ORD-${String(orders.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      station: currentUser.station,
      paymentMethod: method,
      status: 'Paid',
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        quantity: item.quantity,
        price: item.price,
        lineTotal: item.price * item.quantity,
      })),
      subtotal,
      serviceFee,
      total,
    };

    setOrders((current) => [order, ...current]);
    clearCart();
    alert(`Receipt ${order.orderNo}\n${method} payment confirmed\nTotal: ${money(total)}`);
  };

  const saveCategory = (event) => {
    event.preventDefault();
    const name = categoryForm.name.trim();

    if (!canManageMenu || !name) return;
    if (
      categories.some(
        (category) =>
          category.id !== categoryForm.id && category.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      alert('That category already exists.');
      return;
    }

    if (categoryForm.id) {
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryForm.id ? { ...category, name, tone: categoryForm.tone } : category,
        ),
      );
      setProducts((current) =>
        current.map((product) =>
          product.categoryId === categoryForm.id ? { ...product, tone: categoryForm.tone } : product,
        ),
      );
    } else {
      const category = { id: makeId('cat'), name, tone: categoryForm.tone };
      setCategories((current) => [...current, category]);
      setProductForm((current) => ({ ...current, categoryId: category.id, tone: category.tone }));
    }

    setCategoryForm({ id: null, name: '', tone: 'gold' });
  };

  const editCategory = (category) => {
    setCategoryForm(category);
  };

  const deleteCategory = (categoryId) => {
    if (!canManageMenu) return;
    if (products.some((product) => product.categoryId === categoryId)) {
      alert('Move or delete products in this category first.');
      return;
    }

    setCategories((current) => current.filter((category) => category.id !== categoryId));
    if (selectedCategory === categoryId) setSelectedCategory('All');
  };

  const saveProduct = (event) => {
    event.preventDefault();
    const name = productForm.name.trim();
    const price = Number(productForm.price);

    if (!canManageMenu || !name || !productForm.categoryId || Number.isNaN(price) || price <= 0) {
      alert('Add a name, category, and valid price.');
      return;
    }

    const product = {
      id: productForm.id || makeId('prod'),
      name,
      code: (productForm.code.trim() || suggestedCode(name)).toUpperCase(),
      price,
      categoryId: productForm.categoryId,
      tone: productForm.tone,
      available: productForm.available,
    };

    if (productForm.id) {
      setProducts((current) =>
        current.map((currentProduct) => (currentProduct.id === product.id ? product : currentProduct)),
      );
      setCart((current) => current.filter((item) => item.id !== product.id));
    } else {
      setProducts((current) => [...current, product]);
    }

    setProductForm(blankProductForm(productForm.categoryId));
  };

  const editProduct = (product) => {
    setProductForm({ ...product, price: String(product.price) });
  };

  const toggleProductAvailability = (productId) => {
    if (!canManageMenu) return;
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, available: !product.available } : product,
      ),
    );
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const deleteProduct = (productId) => {
    if (!canManageMenu) return;
    setProducts((current) => current.filter((product) => product.id !== productId));
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const saveUser = (event) => {
    event.preventDefault();
    const name = userForm.name.trim();

    if (!canManageUsers || !name || !userForm.pin.trim()) {
      alert('Add a name and PIN.');
      return;
    }

    const user = {
      ...userForm,
      id: userForm.id || makeId('user'),
      name,
      pin: userForm.pin.trim(),
    };

    if (userForm.id) {
      setUsers((current) => current.map((currentUser) => (currentUser.id === user.id ? user : currentUser)));
    } else {
      setUsers((current) => [...current, user]);
    }

    setUserForm(blankUserForm());
  };

  const editUser = (user) => {
    setUserForm(user);
  };

  const toggleUserActive = (userId) => {
    if (!canManageUsers) return;
    if (userId === currentUser?.id) {
      alert('You cannot disable the account currently logged in.');
      return;
    }

    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, active: !user.active } : user)),
    );
  };

  const deleteUser = (userId) => {
    if (!canManageUsers) return;
    const activeCount = users.filter((user) => user.active).length;
    const target = users.find((user) => user.id === userId);

    if (userId === currentUser?.id || (target?.active && activeCount <= 1)) {
      alert('Keep at least one active user, and do not delete the account currently logged in.');
      return;
    }

    setUsers((current) => current.filter((user) => user.id !== userId));
  };

  if (!currentUser) {
    return (
      <LoginScreen
        activeUsers={activeUsers}
        effectiveLoginUserId={effectiveLoginUserId}
        loginPin={loginPin}
        loginError={loginError}
        onLogin={handleLogin}
        onPinChange={setLoginPin}
        onUserChange={setLoginUserId}
      />
    );
  }

  return (
    <div className="pos-shell">
      <Topbar
        currentUser={currentUser}
        isCashier={isCashier}
        isOnline={isOnline}
        itemCount={itemCount}
        onCartOpen={() => setIsCartOpen(true)}
        onLogout={handleLogout}
      />

      {isCashier ? (
        <>
          <CashierScreen
            products={products}
            categories={categories}
            categoryById={categoryById}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredProducts={filteredProducts}
            cart={cart}
            cartById={cartById}
            addToCart={addToCart}
            updateQuantity={updateQuantity}
            isCartOpen={isCartOpen}
            setIsCartOpen={setIsCartOpen}
            itemCount={itemCount}
          />

          <OrderPanel
            cart={cart}
            itemCount={itemCount}
            subtotal={subtotal}
            total={total}
            isCartOpen={isCartOpen}
            setIsCartOpen={setIsCartOpen}
            clearCart={clearCart}
            updateQuantity={updateQuantity}
            handleCheckout={handleCheckout}
            isOnline={isOnline}
          />
        </>
      ) : (
        <AdminWorkspace
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
          categoryById={categoryById}
          todaysOrders={todaysOrders}
          todaysTotal={todaysTotal}
        />
      )}
    </div>
  );
}
