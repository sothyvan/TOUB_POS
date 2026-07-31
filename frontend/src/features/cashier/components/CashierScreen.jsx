import { useEffect, useMemo, useRef, useState } from 'react';
import { money } from '../../../utils/format';
import ProductCard from './ProductCard';
import OrderPanel from './OrderPanel';
import Alert from '../../../components/ui/Alert';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Icon from '../../../components/ui/Icon';
import LoadingState from '../../../components/ui/LoadingState';
import Pagination from '../../../components/ui/Pagination';
import TabPills from '../../../components/ui/TabPills';
import { getStorageItem, setStorageItem } from '../../../utils/storage';

const CASHIER_MENU_VIEW_KEY = 'toub-cashier-menu-view';

const TABS = [
  { id: 'sale', label: 'Quick Sale' },
  { id: 'my-orders', label: 'My Orders' },
];

function hasKitchenDispatchIssue(order) {
  return order.status === 'paid' && ['failed', 'not_sent'].includes(order.kitchenStatus);
}

function isKhqrPendingPayment(order) {
  return order.paymentMethod === 'KHQR' && order.status === 'pending_payment';
}

function isKhqrExpired(order) {
  if (!isKhqrPendingPayment(order) || !order.paymentExpiresAt) {
    return false;
  }

  const expiryTime = new Date(order.paymentExpiresAt).getTime();
  return Number.isFinite(expiryTime) && expiryTime <= Date.now();
}

function canResumeKhqrPayment(order) {
  return isKhqrPendingPayment(order) && Boolean(order.qrPayload) && !isKhqrExpired(order);
}

function formatStatus(status) {
  return String(status || 'unknown').replace(/_/g, ' ');
}

function paymentVariant(method) {
  return method === 'KHQR' ? 'info' : 'warning';
}

function statusVariant(status) {
  if (status === 'paid') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
}

export default function CashierScreen({
  activeTab,
  setActiveTab,
  orders = [],
  onViewReceipt,
  onRetryTelegramDispatch,
  onResumeKhqrPayment,
  khqrEnabled,
  categories,
  categoryById,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  filteredProducts,
  productsLoading,
  productsError,
  cart,
  cartById,
  addToCart,
  updateQuantity,
  setCartItemQuantity,
  isCartOpen,
  setIsCartOpen,
  itemCount,
  subtotal,
  total,
  subtotalKhr,
  totalKhr,
  clearCart,
  handleCheckout,
  checkoutLoading,
  checkoutError,
  ordersLoading,
  ordersError,
  cashierNotice,
  onDismissCashierNotice,
  isOnline,
  isCheckingBackend,
  assignedStall,
}) {
  const [retryingKitchenOrderId, setRetryingKitchenOrderId] = useState(null);
  const [kitchenRetryError, setKitchenRetryError] = useState('');
  const [isMobileMenu, setIsMobileMenu] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const [mobileMenuView, setMobileMenuView] = useState(() => {
    const storedView = getStorageItem(CASHIER_MENU_VIEW_KEY, 'list');
    return storedView === 'grid' ? 'grid' : 'list';
  });
  const contentRef = useRef(null);
  const saleScrollTopRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const handleChange = (event) => setIsMobileMenu(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleMobileMenuViewChange = (nextView) => {
    setMobileMenuView(nextView);
    setStorageItem(CASHIER_MENU_VIEW_KEY, nextView);
  };

  const handleTabChange = (tabId) => {
    if (activeTab === 'sale' && contentRef.current) {
      saleScrollTopRef.current = contentRef.current.scrollTop;
    }
    if (tabId !== 'sale') {
      setIsCartOpen(false);
    }
    setActiveTab(tabId);
    if (tabId === 'sale') {
      window.requestAnimationFrame(() => {
        contentRef.current?.scrollTo({ top: saleScrollTopRef.current });
      });
    }
  };

  const myOrders = useMemo(() => (
    [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  ), [orders]);

  const ORDERS_PAGE_SIZE = 12;
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersTotalPages = Math.ceil(myOrders.length / ORDERS_PAGE_SIZE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ORDERS_PAGE_SIZE;
    return myOrders.slice(start, start + ORDERS_PAGE_SIZE);
  }, [myOrders, ordersPage]);

  const myShiftStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayOrders = myOrders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
    const paidTodayOrders = todayOrders.filter((order) => order.status === 'paid');
    const revenue = paidTodayOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      revenue,
      count: todayOrders.length,
    };
  }, [myOrders]);

  const handleRetryKitchenTicket = async (order) => {
    if (!onRetryTelegramDispatch || !hasKitchenDispatchIssue(order)) {
      return;
    }

    try {
      setKitchenRetryError('');
      setRetryingKitchenOrderId(order.id);
      const updatedOrder = await onRetryTelegramDispatch(order.id);
      if (updatedOrder?.kitchenStatus === 'failed') {
        setKitchenRetryError(`Retry for ${order.orderNo} finished, but the kitchen ticket is still failed.`);
      }
    } catch (error) {
      setKitchenRetryError(error.message || 'Unable to retry kitchen ticket.');
    } finally {
      setRetryingKitchenOrderId(null);
    }
  };

  const hasProductFilters = searchQuery.trim() !== '' || selectedCategory !== 'All';

  return (
    <main className={`flex-1 min-h-0 relative bg-ui-bg ${
      activeTab === 'sale'
        ? `grid grid-cols-[minmax(0,1fr)_400px] max-[1180px]:grid-cols-1 ${
            itemCount > 0 && !isCartOpen ? 'pb-24' : 'pb-0'
          } md:pb-0`
        : 'flex flex-col'
    }`}>
      <section
        ref={contentRef}
        className="min-h-0 overflow-auto p-[clamp(16px,2.2vw,28px)] max-sm:px-4 max-sm:pb-4 max-sm:pt-0 flex flex-col gap-5"
        aria-label="Main cashier view"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 max-sm:pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <TabPills tabs={TABS} activeId={activeTab} onChange={handleTabChange} className="w-fit" />
            {assignedStall ? (
              <Badge variant="brand" size="md" className="normal-case tracking-normal">
                <Icon name="location" className="h-3.5 w-3.5" strokeWidth={2} />
                {assignedStall.name}{assignedStall.location ? ` - ${assignedStall.location}` : ''}
              </Badge>
            ) : null}
          </div>

          {activeTab === 'sale' ? (
            <label className="flex min-h-11 w-[min(100%,320px)] items-center gap-2.5 rounded-lg border border-ui-border bg-ui-surface px-3.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-text-soft focus-within:border-brand-action focus-within:ring-4 focus-within:ring-brand-action/10 max-sm:hidden">
              <Icon name="search" className="h-4 w-4 text-text-muted" />
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full border-0 bg-transparent text-[14px] font-semibold normal-case text-brand-text outline-none placeholder:text-text-muted"
                aria-label="Search products"
              />
            </label>
          ) : null}
        </div>

        {cashierNotice ? (
          <Alert
            variant={cashierNotice.variant || 'info'}
            title={cashierNotice.title}
            actions={(
              <button
                type="button"
                className="rounded-full border-0 bg-transparent px-2 py-1 text-xs font-black text-current hover:bg-white/60"
                onClick={onDismissCashierNotice}
              >
                Dismiss
              </button>
            )}
          >
            {cashierNotice.message}
          </Alert>
        ) : null}

        {activeTab === 'sale' && checkoutError ? (
          <Alert variant="danger" title="Checkout needs attention">
            {checkoutError}
          </Alert>
        ) : null}

        {activeTab === 'sale' && !isOnline && !isCheckingBackend ? (
          <Alert variant="warning" title="Checkout unavailable">
            TouB POS cannot reach the server, so no payment can be completed. Your current cart remains available while the terminal reconnects.
          </Alert>
        ) : null}

        {activeTab === 'sale' ? (
          <>
            <div className="sticky top-0 z-20 isolate -mx-4 flex shrink-0 flex-col gap-2.5 border-b border-ui-border bg-ui-bg px-4 pb-3 pt-0 sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:p-0">
              <label className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-ui-border bg-ui-surface px-3.5 text-text-soft focus-within:border-brand-action focus-within:ring-4 focus-within:ring-brand-action/10 sm:hidden">
                <Icon name="search" className="h-4 w-4 text-text-muted" />
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full border-0 bg-transparent text-sm font-semibold text-brand-text outline-none placeholder:text-text-muted"
                  aria-label="Search products"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <div
                  className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-none"
                  role="tablist"
                  aria-label="Product categories"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                <button
                  className={`min-h-10 px-3 sm:min-h-11 sm:px-5 rounded-md font-mono text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.06em] cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
                    selectedCategory === 'All'
                      ? 'text-[#090807] bg-brand-action border-brand-action'
                      : 'bg-ui-surface text-text-soft border-ui-border hover:border-brand-action/40 hover:text-brand-action'
                  }`}
                  onClick={() => setSelectedCategory('All')}
                  type="button"
                >
                  All Items
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`min-h-10 px-3 sm:min-h-11 sm:px-5 rounded-md font-mono text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.06em] cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
                      selectedCategory === category.id
                        ? 'text-[#090807] bg-brand-action border-brand-action'
                        : 'bg-ui-surface text-text-soft border-ui-border hover:border-brand-action/40 hover:text-brand-action'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                    type="button"
                  >
                    {category.name}
                  </button>
                ))}
                </div>

                <div className="flex shrink-0 items-center rounded-lg border border-ui-border bg-ui-surface p-1 sm:hidden" aria-label="Menu view">
                  {['list', 'grid'].map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => handleMobileMenuViewChange(view)}
                      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-md border transition-colors ${
                        mobileMenuView === view
                          ? 'border-brand-action/50 bg-brand-action/12 text-brand-action'
                          : 'border-transparent text-text-muted hover:bg-ui-muted hover:text-text-strong'
                      }`}
                      aria-label={`${view === 'list' ? 'List' : 'Grid'} menu view`}
                      title={`${view === 'list' ? 'List' : 'Grid'} view`}
                    >
                      <Icon name={view} className="h-4 w-4" strokeWidth={2} />
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-[11px] font-bold text-text-muted sm:self-end sm:text-xs">
                {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} visible
              </span>
            </div>

            {productsError ? (
              <Alert variant="danger" title="Unable to load menu">
                {productsError}
              </Alert>
            ) : null}

            {productsLoading && filteredProducts.length === 0 ? (
              <LoadingState label="Loading stall menu..." className="min-h-[280px] rounded-lg border border-ui-border bg-ui-surface" />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                iconName="product"
                title={hasProductFilters ? 'No matching products' : 'No products available'}
                message={hasProductFilters
                  ? 'Try another category or search term.'
                  : 'Ask an owner or manager to add visible products for this stall.'}
                className="min-h-[280px]"
              />
            ) : (
              <div className={isMobileMenu && mobileMenuView === 'list'
                ? 'flex flex-col gap-2'
                : 'grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-4'}>
                {filteredProducts.map((product) => {
                  const cartItem = cartById.get(product.id);
                  const category = categoryById.get(product.categoryId);

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      category={category}
                      cartItem={cartItem}
                      addToCart={addToCart}
                      updateQuantity={updateQuantity}
                      setCartItemQuantity={setCartItemQuantity}
                      compact={isMobileMenu && mobileMenuView === 'list'}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-4 flex-1 min-h-0 rounded-lg border border-ui-border bg-ui-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="m-0 text-lg font-extrabold text-text-strong">My Shift Orders</h3>
                <p className="m-0 mt-1 text-sm font-semibold text-text-muted">
                  Review your paid, pending, and kitchen-ticket orders.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-right max-sm:w-full">
                <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-text-muted">Today</span>
                  <strong className="text-lg font-black text-brand-action">{myShiftStats.count}</strong>
                </div>
                <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-text-muted">Sales</span>
                  <strong className="text-lg font-black text-state-success">{money(myShiftStats.revenue)}</strong>
                </div>
              </div>
            </div>

            {kitchenRetryError ? (
              <Alert variant="danger" title="Kitchen ticket retry failed">
                {kitchenRetryError}
              </Alert>
            ) : null}

            {ordersError ? (
              <Alert variant="danger" title="Unable to load orders">
                {ordersError}
              </Alert>
            ) : null}

            <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
              {ordersLoading && myOrders.length === 0 ? (
                <LoadingState label="Loading your orders..." className="min-h-[260px]" />
              ) : myOrders.length === 0 ? (
                <EmptyState
                  iconName="orders"
                  title="No orders yet"
                  message="Orders you create during this shift will appear here."
                  className="min-h-[260px]"
                />
              ) : (
                <>
                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {paginatedOrders.map((order) => (
                    <article
                      key={order.id}
                      className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface p-3.5 transition-colors hover:border-brand-action/35 hover:bg-brand-action/5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm font-black text-brand-action">#{order.orderNo}</strong>
                            <span className="text-xs font-semibold text-text-muted">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="m-0 mt-1 max-w-full truncate text-sm font-semibold text-text-soft">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'No item details'}
                          </p>
                        </div>

                        <strong className="text-lg font-black text-state-success">{money(order.total)}</strong>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant={paymentVariant(order.paymentMethod)}>{order.paymentMethod}</Badge>
                        <Badge variant={statusVariant(order.status)} dot>{formatStatus(order.status)}</Badge>

                        {hasKitchenDispatchIssue(order) ? (
                          <Badge variant="danger" dot>Kitchen issue</Badge>
                        ) : null}

                        {isKhqrPendingPayment(order) && !isKhqrExpired(order) ? (
                          <Badge variant="warning" dot>Waiting payment</Badge>
                        ) : null}

                        {isKhqrPendingPayment(order) && isKhqrExpired(order) ? (
                          <Badge variant="danger" dot>QR expired</Badge>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {hasKitchenDispatchIssue(order) && onRetryTelegramDispatch ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            loading={retryingKitchenOrderId === order.id}
                            onClick={() => handleRetryKitchenTicket(order)}
                          >
                            Retry ticket
                          </Button>
                        ) : null}

                        {khqrEnabled && canResumeKhqrPayment(order) && onResumeKhqrPayment ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            iconName="khqr"
                            onClick={() => onResumeKhqrPayment(order)}
                          >
                            Resume QR
                          </Button>
                        ) : null}

                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onViewReceipt(order)}
                        >
                          View Receipt
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>

                {ordersTotalPages > 1 && (
                  <div className="mt-4 px-1">
                    <div className="text-center text-xs text-text-muted mb-2">
                      Page {ordersPage} of {ordersTotalPages}
                    </div>
                    <Pagination currentPage={ordersPage} totalPages={ordersTotalPages} onPageChange={setOrdersPage} />
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {activeTab === 'sale' && (
        <OrderPanel
          cart={cart}
          subtotal={subtotal}
          total={total}
          subtotalKhr={subtotalKhr}
          totalKhr={totalKhr}
          isCartOpen={isCartOpen}
          setIsCartOpen={setIsCartOpen}
          clearCart={clearCart}
          updateQuantity={updateQuantity}
          setCartItemQuantity={setCartItemQuantity}
          handleCheckout={handleCheckout}
          checkoutLoading={checkoutLoading}
          checkoutError={checkoutError}
          isOnline={isOnline}
          isCheckingBackend={isCheckingBackend}
          khqrEnabled={khqrEnabled}
        />
      )}

      {isCartOpen && activeTab === 'sale' ? (
        <button
          className="hidden max-[1180px]:block max-[1180px]:fixed max-[1180px]:inset-0 max-[1180px]:z-20 max-[1180px]:border-0 max-[1180px]:bg-black/40 max-[1180px]:cursor-pointer"
          aria-label="Close cart"
          type="button"
          onClick={() => setIsCartOpen(false)}
        />
      ) : null}

      {itemCount > 0 && !isCartOpen && activeTab === 'sale' && (
        <div className="hidden max-[1180px]:block fixed bottom-4 left-4 right-4 z-40">
          <Button
            onClick={() => setIsCartOpen(true)}
            className="h-15 rounded-lg justify-between px-5 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
            fullWidth
            type="button"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-black/15 text-[#090807]">
                <Icon name="cart" />
              </span>
              <span className="text-[13px] font-extrabold uppercase tracking-wider">
                Review Order ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            </span>
            <span className="rounded-md bg-ui-surface px-2.5 py-2 text-[17px] font-black text-state-success">
              {money(total)}
            </span>
          </Button>
        </div>
      )}
    </main>
  );
}
