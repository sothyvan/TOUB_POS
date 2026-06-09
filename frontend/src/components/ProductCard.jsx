import { money } from '../utils/format';
import QuantityInput from './QuantityInput';

export default function ProductCard({
  product,
  category,
  cartItem,
  addToCart,
  updateQuantity,
  setCartItemQuantity,
}) {
  return (
    <article className="group relative bg-white border border-[#c3c5d9]/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
      {/* Background Tap Target to Add to Cart */}
      <button
        className="absolute inset-0 w-full h-full border-0 bg-transparent z-10 cursor-pointer rounded-2xl"
        onClick={() => addToCart(product)}
        type="button"
        aria-label={`Add ${product.name} to cart`}
      />

      {/* Card Image */}
      <div className="relative aspect-4/3 w-full bg-gray-50 overflow-hidden border-b border-gray-100">
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
}
