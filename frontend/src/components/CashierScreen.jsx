import { useState, useMemo } from 'react';
import { money } from '../utils/format';
import ProductCard from './ProductCard';
import OrderPanel from './OrderPanel';
import Alert from './ui/Alert';
import Badge from './ui/Badge';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import Icon from './ui/Icon';
import LoadingState from './ui/LoadingState';
import TabPills from './ui/TabPills';

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
  serviceFee,
  estimatedTax,
  total,
  clearCart,
  handleCheckout,
  checkoutLoading,
  checkoutError,
  ordersLoading,
  ordersError,
  cashierNotice,
  onDismissCashierNotice,
  isOnline,
  assignedStall,
}) {
  const [retryingKitchenOrderId, setRetryingKitchenOrderId] = useState(null);
  const [kitchenRetryError, setKitchenRetryError] = useState('');

  const handleTabChange = (tabId) => {
    if (tabId !== 'sale') {
      setIsCartOpen(false);
    }
    setActiveTab(tabId);
  };

  const myOrders = useMemo(() => (
    [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  ), [orders]);

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
        ? 'grid grid-cols-[minmax(0,1fr)_400px] max-[1180px]:grid-cols-1 pb-24 md:pb-0'
        : 'flex flex-col'
    }`}>
      <section
        className="min-h-0 overflow-auto p-[clamp(16px,2.2vw,28px)] max-sm:p-4 flex flex-col gap-5"
        aria-label="Main cashier view"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
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
            <label className="flex min-h-11 w-[min(100%,320px)] items-center gap-2.5 rounded-2xl border border-ui-border bg-white px-3.5 text-xs font-extrabold uppercase text-text-soft shadow-sm focus-within:border-brand-action focus-within:ring-4 focus-within:ring-brand-action/10">
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

        {activeTab === 'sale' && !isOnline ? (
          <Alert variant="warning" title="KHQR unavailable offline">
            Cash payments can continue. Reconnect before creating KHQR payments.
          </Alert>
        ) : null}

        {activeTab === 'sale' ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap"
                role="tablist"
                aria-label="Product categories"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                <button
                  className={`min-h-11 px-5 rounded-full text-[13px] font-extrabold cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
                    selectedCategory === 'All'
                      ? 'text-white bg-brand-action border-brand-action shadow-sm'
                      : 'bg-white text-text-soft border-ui-border hover:border-brand-action/30 hover:text-brand-action'
                  }`}
                  onClick={() => setSelectedCategory('All')}
                  type="button"
                >
                  All Items
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`min-h-11 px-5 rounded-full text-[13px] font-extrabold cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
                      selectedCategory === category.id
                        ? 'text-white bg-brand-action border-brand-action shadow-sm'
                        : 'bg-white text-text-soft border-ui-border hover:border-brand-action/30 hover:text-brand-action'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                    type="button"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-text-muted">
                {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} visible
              </span>
            </div>

            {productsError ? (
              <Alert variant="danger" title="Unable to load menu">
                {productsError}
              </Alert>
            ) : null}

            {productsLoading && filteredProducts.length === 0 ? (
              <LoadingState label="Loading stall menu..." className="min-h-[280px] rounded-2xl border border-ui-border bg-white" />
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
              <div className="grid grid-cols-1 gap-3 min-[461px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-4">
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
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-4 flex-1 min-h-0 rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="m-0 text-lg font-extrabold text-text-strong">My Shift Orders</h3>
                <p className="m-0 mt-1 text-sm font-semibold text-text-muted">
                  Review your paid, pending, and kitchen-ticket orders.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-right max-sm:w-full">
                <div className="rounded-2xl border border-ui-border bg-ui-bg px-4 py-3">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-text-muted">Today</span>
                  <strong className="text-lg font-black text-brand-action">{myShiftStats.count}</strong>
                </div>
                <div className="rounded-2xl border border-ui-border bg-ui-bg px-4 py-3">
                  <span className="block text-[11px] font-black uppercase tracking-wide text-text-muted">Sales</span>
                  <strong className="text-lg font-black text-brand-action">{money(myShiftStats.revenue)}</strong>
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

            <div className="flex-1 min-h-0 overflow-y-auto">
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
                <div className="grid gap-3">
                  {myOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-ui-border bg-white p-4 shadow-sm transition-colors hover:border-brand-action/20 hover:bg-blue-50/20"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm font-black text-brand-action">#{order.orderNo}</strong>
                            <span className="text-xs font-semibold text-text-muted">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="m-0 mt-1 max-w-xl truncate text-sm font-semibold text-text-soft">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'No item details'}
                          </p>
                        </div>

                        <strong className="text-lg font-black text-text-strong">{money(order.total)}</strong>
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

                        {canResumeKhqrPayment(order) && onResumeKhqrPayment ? (
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
              )}
            </div>
          </div>
        )}
      </section>

      {activeTab === 'sale' && (
        <OrderPanel
          cart={cart}
          subtotal={subtotal}
          serviceFee={serviceFee}
          estimatedTax={estimatedTax}
          total={total}
          isCartOpen={isCartOpen}
          setIsCartOpen={setIsCartOpen}
          clearCart={clearCart}
          updateQuantity={updateQuantity}
          setCartItemQuantity={setCartItemQuantity}
          handleCheckout={handleCheckout}
          checkoutLoading={checkoutLoading}
          checkoutError={checkoutError}
          isOnline={isOnline}
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
            className="h-15 rounded-2xl justify-between px-5 shadow-lg"
            fullWidth
            type="button"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-white">
                <Icon name="cart" />
              </span>
              <span className="text-[13px] font-extrabold uppercase tracking-wider">
                Review Order ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            </span>
            <span className="text-[17px] font-bold">{money(total)}</span>
          </Button>
        </div>
      )}
    </main>
  );
}
