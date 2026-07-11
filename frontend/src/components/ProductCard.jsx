import { useState } from 'react';
import { money } from '../utils/format';
import Badge from './ui/Badge';
import Icon from './ui/Icon';
import QuantityInput from './QuantityInput';

export default function ProductCard({
  product,
  category,
  cartItem,
  addToCart,
  updateQuantity,
  setCartItemQuantity,
}) {
  const [failedImage, setFailedImage] = useState(null);
  const shouldShowImage = Boolean(product.image) && failedImage !== product.image;

  return (
    <article
      className={`group relative bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${
        cartItem ? 'border-state-success ring-4 ring-state-success/10' : 'border-ui-border'
      }`}
      aria-label={`${product.name}, ${money(product.price)}`}
    >
      {/* Background Tap Target to Add to Cart */}
      <button
        className="absolute inset-0 w-full h-full border-0 bg-transparent z-10 cursor-pointer rounded-2xl"
        onClick={() => addToCart(product)}
        type="button"
        aria-label={`Add ${product.name} to cart`}
      />

      {/* Card Image */}
      <div className="relative aspect-4/3 w-full bg-gray-50 overflow-hidden border-b border-gray-100">
        {shouldShowImage ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setFailedImage(product.image)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#eeeef0] text-[#776f63] font-bold text-xs">
            <Icon name="product" className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
            <span>{product.code}</span>
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/65 backdrop-blur-sm text-white text-[10px] font-extrabold tracking-wider uppercase z-10">
          {product.code}
        </span>
        {cartItem ? (
          <span className="absolute top-2.5 right-2.5 z-20 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-state-success px-2 text-xs font-black text-white shadow-sm">
            {cartItem.quantity}
          </span>
        ) : null}
      </div>

      {/* Card Info & Action */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="m-0 text-[15px] font-bold text-gray-900 leading-snug group-hover:text-brand-action transition-colors line-clamp-2">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{category?.name || 'Menu'}</Badge>
            {cartItem ? <Badge variant="success" dot>In cart</Badge> : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <strong className="text-brand-dark text-[17px] font-extrabold leading-none">
            {money(product.price)}
          </strong>

          {cartItem ? (
            <QuantityInput
              value={cartItem.quantity}
              onDecrease={() => updateQuantity(product.id, -1)}
              onIncrease={() => updateQuantity(product.id, 1)}
              onChange={(val) => setCartItemQuantity(product.id, val)}
              className="text-gray-900 font-bold"
            />
          ) : (
            <button
              className="relative z-20 pointer-events-auto min-h-10 px-4 rounded-full bg-brand-action hover:bg-brand-action-hover active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5"
              onClick={() => addToCart(product)}
              type="button"
              aria-label={`Add ${product.name}`}
            >
              <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={3} />
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
