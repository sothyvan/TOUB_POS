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
  total,
  clearCart,
  handleCheckout,
  isOnline,
}) {
  return (
    <main className="flex-1 grid grid-cols-[minmax(0,1fr)_380px] min-h-0 max-[1100px]:grid-cols-1">
      <section className="p-[clamp(18px,2.4vw,30px)] overflow-auto max-[1100px]:relative max-[1100px]:z-25 max-sm:p-4" aria-label="Product catalog">
        <div className="flex items-center justify-between gap-[18px] mb-[18px] max-sm:flex-col max-sm:items-start">
          <div>
            <p className="m-0 mb-[3px] text-[#776f63] text-[11px] font-extrabold tracking-wider uppercase">Menu</p>
            <h2 className="m-0 text-brand-dark text-xl leading-[1.1] font-extrabold">Quick sale</h2>
          </div>

          <label className="w-[min(320px,46vw)] h-12 px-3.5 border border-[#d9d0c1] rounded-lg bg-[#fffdfa] flex items-center gap-2.5 text-[#776f63] text-xs font-extrabold uppercase max-sm:w-full">
            <span>Search</span>
            <input
              type="search"
              placeholder="Item, code, category"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full border-0 outline-none bg-transparent text-brand-text text-[15px] font-semibold normal-case placeholder:text-[#aaa094]"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="Product categories">
          <button
            className={`min-h-[38px] px-[15px] border border-[#d9d0c1] rounded-full text-sm font-extrabold cursor-pointer transition-[border-color,background-color,transform] duration-140 hover:border-[#968875] active:scale-98 ${
              selectedCategory === 'All'
                ? 'text-[#fffaf0] bg-brand-primary border-brand-primary'
                : 'bg-[#fffdfa]/78 text-[#4f483f]'
            }`}
            onClick={() => setSelectedCategory('All')}
            type="button"
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`min-h-[38px] px-[15px] border border-[#d9d0c1] rounded-full text-sm font-extrabold cursor-pointer transition-[border-color,background-color,transform] duration-140 hover:border-[#968875] active:scale-98 ${
                selectedCategory === category.id
                  ? 'text-[#fffaf0] bg-brand-primary border-brand-primary'
                  : 'bg-[#fffdfa]/78 text-[#4f483f]'
              }`}
              onClick={() => setSelectedCategory(category.id)}
              type="button"
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3.5 max-sm:grid-cols-1">
          {filteredProducts.map((product) => {
            const cartItem = cartById.get(product.id);
            const category = categoryById.get(product.categoryId);

            let toneClass = '';
            if (product.tone === 'gold') toneClass = 'bg-gradient-to-b from-[#fff7dc] to-[#fffdfa] to-62%';
            else if (product.tone === 'green') toneClass = 'bg-gradient-to-b from-[#e8f3e7] to-[#fffdfa] to-62%';
            else if (product.tone === 'blue') toneClass = 'bg-gradient-to-b from-[#e6f0f3] to-[#fffdfa] to-62%';
            else if (product.tone === 'rose') toneClass = 'bg-gradient-to-b from-[#f9e8df] to-[#fffdfa] to-62%';

            return (
              <article
                className={`relative min-h-[156px] p-4 border border-[#d8d0c2] rounded-lg bg-[#fffdfa] text-brand-text text-left flex flex-col justify-between shadow-[0_10px_24px_rgba(52,45,35,0.07)] hover:translate-y-[-2px] hover:border-[#9f917d] hover:shadow-[0_16px_30px_rgba(52,45,35,0.11)] transition-[transform,box-shadow,border-color] duration-140 max-sm:min-h-[142px] has-[button:active]:scale-[0.98] ${toneClass}`}
                key={product.id}
              >
                <button
                  className="absolute inset-0 w-full h-full border-0 bg-transparent z-10 cursor-pointer rounded-lg"
                  onClick={() => addToCart(product)}
                  type="button"
                  aria-label={`Add ${product.name} to cart`}
                />

                <div className="pointer-events-none">
                  <span className="w-fit py-1 px-1.75 rounded bg-[rgba(34,31,31,0.08)] text-[#4f483f] text-[11px] font-black">{product.code}</span>
                  <div className="mt-4 text-[20px] leading-snug font-extrabold">{product.name}</div>
                  <div className="mt-2 text-[#6f665a] text-[13px] font-bold">{category?.name || 'Menu'}</div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2.5 text-[#6f665a] text-[13px] font-bold">
                  <strong className="text-brand-dark text-2xl leading-none pointer-events-none max-sm:text-[22px]">{money(product.price)}</strong>
                  {cartItem ? (
                    <div
                      className="relative z-20 pointer-events-auto h-[34px] rounded-full bg-[#24211f] text-[#fff9ee] inline-flex items-center overflow-hidden shadow-[0_8px_18px_rgba(36,33,31,0.16)] max-sm:h-[38px]"
                      aria-label={`${product.name} quantity`}
                    >
                      <button
                        className="w-[34px] h-[34px] border-0 bg-transparent text-inherit text-lg leading-none font-black cursor-pointer hover:bg-[rgba(255,249,238,0.12)] transition-colors duration-140 max-sm:w-[38px] max-sm:h-[38px]"
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
                        className="w-[34px] h-[34px] border-0 bg-transparent text-inherit text-lg leading-none font-black cursor-pointer hover:bg-[rgba(255,249,238,0.12)] transition-colors duration-140 max-sm:w-[38px] max-sm:h-[38px]"
                        type="button"
                        onClick={() => updateQuantity(product.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
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
    </main>
  );
}
