import { useState } from 'react';
import { khrMoney, money } from '../../../utils/format';
import Icon from '../../../components/ui/Icon';
import QuantityInput from './QuantityInput';

export default function CartItem({ item, updateQuantity, setCartItemQuantity }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.image) && !imageFailed;

  return (
    <div className="rounded-lg border border-ui-border bg-ui-surface p-3 flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-ui-border bg-ui-muted">
          {showImage ? (
            <img
              src={item.image}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-text-muted" aria-hidden="true">
              <Icon name="product" className="h-5 w-5" strokeWidth={1.6} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-extrabold leading-snug text-text-strong">
            {item.name}
          </strong>
          <span className="mt-0.5 block text-xs font-semibold text-text-muted">
            {money(item.price)} each
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <QuantityInput
          value={item.quantity}
          onDecrease={() => updateQuantity(item.id, -1)}
          onIncrease={() => updateQuantity(item.id, 1)}
          onChange={(val) => setCartItemQuantity(item.id, val)}
          className="text-gray-900 font-bold"
        />
        {/* Line Total */}
        <div className="ml-auto min-w-16 text-right">
          <strong className="block text-[15px] font-black leading-none text-text-strong">
            {money(item.price * item.quantity)}
          </strong>
          <span className="mt-1 block text-[11px] font-bold leading-none text-text-muted">
            {khrMoney(Number(item.priceKhr || 0) * item.quantity)}
          </span>
        </div>
        {/* Remove Button */}
        <button
          className="text-text-muted hover:text-state-danger transition-colors border border-transparent hover:border-state-danger/30 hover:bg-state-danger/10 rounded-md p-2 cursor-pointer flex items-center justify-center"
          type="button"
          onClick={() => updateQuantity(item.id, -item.quantity)}
          aria-label={`Remove ${item.name} from cart`}
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
