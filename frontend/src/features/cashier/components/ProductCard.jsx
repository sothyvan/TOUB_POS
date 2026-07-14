import { useState } from 'react';
import { money } from '../../../utils/format';
import Badge from '../../../components/ui/Badge';
import Icon from '../../../components/ui/Icon';
import QuantityInput from './QuantityInput';

export default function ProductCard({
  product,
  category,
  cartItem,
  addToCart,
  updateQuantity,
  setCartItemQuantity,
  compact = false,
}) {
  const [failedImage, setFailedImage] = useState(null);
  const shouldShowImage = Boolean(product.image) && failedImage !== product.image;

  if (compact) {
    return (
      <article
        className={`group relative flex min-h-18 min-w-0 items-center gap-3 overflow-hidden rounded-lg border bg-ui-surface p-2.5 transition-colors hover:border-brand-action/45 ${
          cartItem ? 'border-state-success ring-2 ring-state-success/12' : 'border-ui-border'
        }`}
        aria-label={`${product.name}, ${money(product.price)}`}
      >
        <button
          className="absolute inset-0 z-10 h-full w-full cursor-pointer border-0 bg-transparent"
          onClick={() => addToCart(product)}
          type="button"
          aria-label={`Add ${product.name} to cart`}
        />

        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-ui-border bg-ui-muted">
          {shouldShowImage ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setFailedImage(product.image)}
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-text-muted" aria-hidden="true">
              <Icon name="product" className="h-5 w-5" strokeWidth={1.6} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-sm font-bold text-text-strong">{product.name}</h3>
          <p className="m-0 mt-0.5 truncate text-[11px] font-semibold text-text-muted">
            {category?.name || 'Menu'}
          </p>
          <strong className="mt-1 block text-sm font-extrabold text-state-success">
            {money(product.price)}
          </strong>
        </div>

        <div className="relative z-20 shrink-0">
          {cartItem ? (
            <QuantityInput
              value={cartItem.quantity}
              onDecrease={() => updateQuantity(product.id, -1)}
              onIncrease={() => updateQuantity(product.id, 1)}
              onChange={(value) => setCartItemQuantity(product.id, value)}
              className="font-bold text-text-strong"
              compact
            />
          ) : (
            <button
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-md border border-brand-action bg-brand-action text-[#090807] transition-all hover:bg-brand-action-hover active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-action/25"
              onClick={() => addToCart(product)}
              type="button"
              aria-label={`Add ${product.name}`}
              title={`Add ${product.name}`}
            >
              <Icon name="plus" className="h-4 w-4" strokeWidth={3} />
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group relative bg-ui-surface border rounded-lg overflow-hidden hover:border-brand-action/45 transition-all duration-200 flex flex-col justify-between ${
        cartItem ? 'border-state-success ring-2 ring-state-success/12' : 'border-ui-border'
      }`}
      aria-label={`${product.name}, ${money(product.price)}`}
    >
      {/* Background Tap Target to Add to Cart */}
      <button
        className="absolute inset-0 w-full h-full border-0 bg-transparent z-10 cursor-pointer rounded-lg"
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
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-ui-muted text-text-soft font-mono font-bold text-xs">
            <Icon name="product" className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
            <span>{product.code}</span>
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/65 backdrop-blur-sm text-white text-[10px] font-extrabold tracking-wider uppercase z-10">
          {product.code}
        </span>
        {cartItem ? (
          <span className="absolute top-2.5 right-2.5 z-20 inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-state-success px-2 text-xs font-black text-white">
            {cartItem.quantity}
          </span>
        ) : null}
      </div>

      {/* Card Info & Action */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="m-0 text-[13px] sm:text-[15px] font-bold text-gray-900 leading-snug group-hover:text-brand-action transition-colors line-clamp-2">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{category?.name || 'Menu'}</Badge>
            {cartItem ? <Badge variant="success" dot>In cart</Badge> : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <strong className="text-brand-dark text-[15px] sm:text-[17px] font-extrabold leading-none">
            {money(product.price)}
          </strong>

          {cartItem ? (
            <QuantityInput
              value={cartItem.quantity}
              onDecrease={() => updateQuantity(product.id, -1)}
              onIncrease={() => updateQuantity(product.id, 1)}
              onChange={(val) => setCartItemQuantity(product.id, val)}
              className="text-gray-900 font-bold"
              compact
            />
          ) : (
            <button
              className="relative z-20 pointer-events-auto min-h-9 px-2.5 sm:min-h-10 sm:px-4 rounded-md border border-brand-action bg-brand-action hover:bg-brand-action-hover active:scale-95 text-[#090807] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
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
