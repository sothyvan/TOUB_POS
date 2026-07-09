import { useState, useMemo } from 'react';
import { money } from '../utils/format';
import ProductCard from './ProductCard';
import OrderPanel from './OrderPanel';
import Icon from './ui/Icon';

function hasKitchenDispatchIssue(order) {
  return order.status === 'paid' && ['failed', 'not_sent'].includes(order.kitchenStatus);
}

export default function CashierScreen({
  orders = [],
  onViewReceipt,
  onRetryTelegramDispatch,
  categories,
  categoryById,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  filteredProducts,
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
  isOnline,
  assignedStall,
}) {
  const [activeTab, setActiveTab] = useState('sale'); // 'sale' | 'my-orders'
  const [retryingKitchenOrderId, setRetryingKitchenOrderId] = useState(null);
  const [kitchenRetryError, setKitchenRetryError] = useState('');

  // Backend /orders/mine already scopes to this cashier only.
  // We still sort newest-first for display.
  const myOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders]);

  // Compute shift stats for this cashier
  const myShiftStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayOrders = myOrders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
    const paidTodayOrders = todayOrders.filter((order) => order.status === 'paid');
    const revenue = paidTodayOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      revenue,
      count: todayOrders.length
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

  return (
    <main className={`flex-1 min-h-0 relative pb-20 max-[1100px]:pb-25 md:pb-0 ${
      activeTab === 'sale' ? 'grid grid-cols-[minmax(0,1fr)_380px] max-[1100px]:grid-cols-1' : 'flex flex-col'
    }`}>
      
      {/* Left Area (Catalog or My Orders) */}
      <section className="p-[clamp(18px,2.4vw,30px)] overflow-auto max-[1100px]:relative max-[1100px]:z-25 max-sm:p-4 flex flex-col gap-4.5" aria-label="Main cashier view">
        
        {/* Top bar with Tab Switcher & Search/Stall details */}
        <div className="flex items-center justify-between gap-4.5 max-sm:flex-col max-sm:items-start shrink-0">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('sale')}
              className={`cursor-pointer px-4 py-1.5 rounded-lg border-none text-[13px] font-bold fontFamily-['Inter'] transition-all ${
                activeTab === 'sale' ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
              }`}
            >
              Quick Sale
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my-orders')}
              className={`cursor-pointer px-4 py-1.5 rounded-lg border-none text-[13px] font-bold fontFamily-['Inter'] transition-all ${
                activeTab === 'my-orders' ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
              }`}
            >
              My Orders
            </button>
          </div>

          <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
            {/* Stall badge */}
            {assignedStall && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#dbeafe] bg-[#eff6ff]">
                <Icon name="location" className="w-3.5 h-3.5" style={{ color: '#2563eb' }} strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                  {assignedStall.name}{assignedStall.location ? ` — ${assignedStall.location}` : ''}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: assignedStall.online ? '#22c55e' : '#d1d5db' }} />
              </div>
            )}

            {activeTab === 'sale' && (
              <label className="w-[240px] h-10 px-3.5 border border-brand-border rounded-full bg-brand-card flex items-center gap-2.5 text-[#776f63] text-xs font-extrabold uppercase max-sm:w-full">
                <Icon name="search" className="w-4 h-4 text-[#434656]" />
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full border-0 outline-none bg-transparent text-brand-text text-[14px] font-semibold normal-case placeholder:text-[#aaa094]"
                />
              </label>
            )}
          </div>
        </div>

        {activeTab === 'sale' ? (
          <>
            {/* Horizontal Scroll Categories */}
            <div 
              className="flex gap-2.5 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none flex-nowrap shrink-0" 
              role="tablist" 
              aria-label="Product categories"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              <button
                className={`min-h-9 px-5 rounded-full text-[13px] font-extrabold cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
                  selectedCategory === 'All'
                    ? 'text-white bg-brand-action border-brand-action shadow-sm'
                    : 'bg-[#e8e8ea] text-[#434656] border-transparent hover:bg-[#dbdbdd]'
                }`}
                onClick={() => setSelectedCategory('All')}
                type="button"
              >
                All Items
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`min-h-9 px-5 rounded-full text-[13px] font-extrabold cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
                    selectedCategory === category.id
                      ? 'text-white bg-brand-action border-brand-action shadow-sm'
                      : 'bg-[#e8e8ea] text-[#434656] border-transparent hover:bg-[#dbdbdd]'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(182px,1fr))] gap-4 max-sm:grid-cols-2 max-sm:gap-3">
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
          </>
        ) : (
          /* My Orders tab */
          <div className="flex flex-col gap-4 flex-1 min-h-0 bg-white rounded-2xl border border-[#f3f4f6] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5">
            <div className="flex justify-between items-center pb-3 border-b border-[#f3f4f6]">
              <div>
                <h3 className="m-0 text-[16px] font-bold text-[#111827] fontFamily-['Inter']">My Shift Orders</h3>
                <p className="m-0 mt-0.5 text-[12px] text-[#9ca3af] fontFamily-['Inter']">Review sales completed during your current shift session</p>
              </div>

              <div className="flex gap-4 text-[12px] font-bold text-[#374151]">
                <span>Today's Orders: <span className="text-[#003ec7] font-black">{myShiftStats.count}</span></span>
                <span>Today's Total: <span className="text-[#003ec7] font-black">{money(myShiftStats.revenue)}</span></span>
              </div>
            </div>

            {kitchenRetryError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
                {kitchenRetryError}
              </div>
            )}

            {/* Orders Table list */}
            <div className="flex-1 overflow-y-auto">
              {myOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#9ca3af]">
                  <Icon name="orders" className="w-8 h-8 mb-2" />
                  <span className="text-[13px] font-medium">You haven't created any orders yet</span>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[#f9fafb]">
                  {myOrders.map((order) => (
                    <div key={order.id} className="py-3.5 flex items-center justify-between hover:bg-[#fafbff] px-2 rounded-xl transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-[#003ec7]">#{order.orderNo}</span>
                          <span className="text-[11px] text-[#9ca3af] font-medium">{new Date(order.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <span className="text-[12px] text-[#6b7280] font-medium max-w-[320px] truncate">
                          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                          order.paymentMethod === 'KHQR' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {order.paymentMethod}
                        </span>

                        <span className="text-[14px] font-extrabold text-[#111827] min-w-[70px] text-right">
                          {money(order.total)}
                        </span>

                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                          order.status === 'paid'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {order.status}
                        </span>

                        {hasKitchenDispatchIssue(order) && (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border bg-red-50 text-red-700 border-red-200">
                            Kitchen issue
                          </span>
                        )}

                        {hasKitchenDispatchIssue(order) && onRetryTelegramDispatch && (
                          <button
                            type="button"
                            onClick={() => handleRetryKitchenTicket(order)}
                            disabled={retryingKitchenOrderId === order.id}
                            className="cursor-pointer px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-[11px] font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
                          >
                            {retryingKitchenOrderId === order.id ? 'Retrying...' : 'Retry ticket'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onViewReceipt(order)}
                          className="cursor-pointer px-3.5 py-1.5 rounded-lg border border-[#e5e7eb] bg-white text-[11px] font-bold text-[#6b7280] hover:bg-gray-50 active:scale-95 transition-all"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Right Order Panel (Quick Sale tab only) */}
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
          className="hidden max-[1100px]:block max-[1100px]:fixed max-[1100px]:inset-0 max-[1100px]:z-20 max-[1100px]:border-0 max-[1100px]:bg-[rgba(22,20,18,0.42)] max-[1100px]:cursor-pointer"
          aria-label="Close cart"
          type="button"
          onClick={() => setIsCartOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsCartOpen(false)}
        />
      ) : null}

      {/* Floating Bottom Bar for Mobile Checkout Preview (Quick Sale tab only) */}
      {itemCount > 0 && !isCartOpen && activeTab === 'sale' && (
        <div className="hidden max-[1100px]:block fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-brand-action text-white h-15 px-5 rounded-2xl flex items-center justify-between shadow-lg hover:bg-brand-action/95 transition-all cursor-pointer active:scale-[0.99] border-0"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <Icon name="cart" />
              </div>
              <span className="text-[13px] font-extrabold tracking-wider uppercase">
                Review Order ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            </div>
            <span className="text-[17px] font-bold">{money(total)}</span>
          </button>
        </div>
      )}
    </main>
  );
}
