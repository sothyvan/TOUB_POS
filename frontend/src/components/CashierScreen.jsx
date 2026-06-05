import { money } from '../utils/format';
import QuantityInput from './QuantityInput';
import OrderPanel from './OrderPanel';

export default function CashierScreen({
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
  isOnline,
}) {
  return (
    <main className="flex-1 grid grid-cols-[minmax(0,1fr)_380px] min-h-0 max-[1100px]:grid-cols-1 relative pb-[80px] max-[1100px]:pb-[100px] md:pb-0">
      <section className="p-[clamp(18px,2.4vw,30px)] overflow-auto max-[1100px]:relative max-[1100px]:z-25 max-sm:p-4" aria-label="Product catalog">
        <div className="flex items-center justify-between gap-[18px] mb-[18px] max-sm:flex-col max-sm:items-start">
          <div>
            <p className="m-0 mb-[3px] text-[#776f63] text-[11px] font-extrabold tracking-wider uppercase">Menu</p>
            <h2 className="m-0 text-brand-dark text-xl leading-[1.1] font-extrabold">Quick sale</h2>
          </div>

          <label className="w-[min(320px,46vw)] h-12 px-3.5 border border-[#d9d0c1] rounded-full bg-[#fffdfa] flex items-center gap-2.5 text-[#776f63] text-xs font-extrabold uppercase max-sm:w-full">
            <svg className="w-[18px] h-[18px] text-[#434656]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full border-0 outline-none bg-transparent text-brand-text text-[15px] font-semibold normal-case placeholder:text-[#aaa094]"
            />
          </label>
        </div>

        {/* Horizontal Scroll Categories */}
        <div 
          className="flex gap-2.5 mb-5 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none flex-nowrap" 
          role="tablist" 
          aria-label="Product categories"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <button
            className={`min-h-[38px] px-[20px] rounded-full text-sm font-extrabold cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
              selectedCategory === 'All'
                ? 'text-white bg-[#003ec7] border-[#003ec7] shadow-sm'
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
              className={`min-h-[38px] px-[20px] rounded-full text-sm font-extrabold cursor-pointer transition-all duration-150 active:scale-95 shrink-0 border ${
                selectedCategory === category.id
                  ? 'text-white bg-[#003ec7] border-[#003ec7] shadow-sm'
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
              <article
                className="group relative bg-white border border-[#c3c5d9]/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 flex flex-col justify-between"
                key={product.id}
              >
                {/* Background Tap Target to Add to Cart */}
                <button
                  className="absolute inset-0 w-full h-full border-0 bg-transparent z-10 cursor-pointer rounded-2xl"
                  onClick={() => addToCart(product)}
                  type="button"
                  aria-label={`Add ${product.name} to cart`}
                />

                {/* Card Image */}
                <div className="relative aspect-[4/3] w-full bg-gray-50 overflow-hidden border-b border-gray-100">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#eeeef0] text-[#776f63] font-bold text-xs">
                      {product.code}
                    </div>
                  )}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-extrabold tracking-wider uppercase z-10">
                    {product.code}
                  </span>
                </div>

                {/* Card Info & Action */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3 className="m-0 text-[15px] font-bold text-gray-900 leading-snug group-hover:text-[#003ec7] transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    <span className="block mt-1 text-gray-400 text-xs font-semibold">
                      {category?.name || 'Menu'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <strong className="text-brand-dark text-[17px] font-extrabold leading-none">
                      {money(product.price)}
                    </strong>

                    {cartItem ? (
                      <div
                        className="relative z-20 pointer-events-auto h-8 rounded-full bg-[#1a1a1a] text-[#fff9ee] inline-flex items-center overflow-hidden shadow-sm"
                        aria-label={`${product.name} quantity`}
                      >
                        <button
                          className="w-8 h-8 border-0 bg-transparent text-inherit text-md leading-none font-bold cursor-pointer hover:bg-white/10 active:scale-75 transition-all"
                          type="button"
                          onClick={() => updateQuantity(product.id, -1)}
                        >
                          -
                        </button>
                        <QuantityInput
                          value={cartItem.quantity}
                          onChange={(val) => setCartItemQuantity(product.id, val)}
                        />
                        <button
                          className="w-8 h-8 border-0 bg-transparent text-inherit text-md leading-none font-bold cursor-pointer hover:bg-white/10 active:scale-75 transition-all"
                          type="button"
                          onClick={() => updateQuantity(product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        className="relative z-20 pointer-events-auto h-8 px-4 rounded-full bg-[#003ec7] hover:bg-[#003ec7]/90 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                        onClick={() => addToCart(product)}
                        type="button"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <OrderPanel
        cart={cart}
        itemCount={itemCount}
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
        isOnline={isOnline}
      />

      {isCartOpen ? (
        <button
          className="hidden max-[1100px]:block max-[1100px]:fixed max-[1100px]:inset-0 max-[1100px]:z-20 max-[1100px]:border-0 max-[1100px]:bg-[rgba(22,20,18,0.42)] max-[1100px]:cursor-pointer"
          aria-label="Close cart"
          type="button"
          onClick={() => setIsCartOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsCartOpen(false)}
        />
      ) : null}

      {/* Floating Bottom Bar for Mobile Checkout Preview */}
      {itemCount > 0 && !isCartOpen && (
        <div className="hidden max-[1100px]:block fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#003ec7] text-white h-[60px] px-5 rounded-2xl flex items-center justify-between shadow-lg hover:bg-[#003ec7]/95 transition-all cursor-pointer active:scale-[0.99] border-0"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
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
