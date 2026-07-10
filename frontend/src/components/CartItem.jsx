import { money } from '../utils/format';
import Icon from './ui/Icon';
import QuantityInput from './QuantityInput';

export default function CartItem({ item, updateQuantity, setCartItemQuantity }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-white p-3.5 shadow-sm flex flex-col items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <strong className="block text-text-strong text-base font-extrabold leading-snug truncate">
          {item.name}
        </strong>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <QuantityInput
          value={item.quantity}
          onDecrease={() => updateQuantity(item.id, -1)}
          onIncrease={() => updateQuantity(item.id, 1)}
          onChange={(val) => setCartItemQuantity(item.id, val)}
          className="text-gray-900 font-bold"
        />
        {/* Line Total */}
        <strong className="w-16 text-right text-text-strong text-[17px] font-black">
          {money(item.price * item.quantity)}
        </strong>
        {/* Remove Button */}
        <button
          className="text-gray-400 hover:text-state-danger transition-colors border border-transparent hover:border-red-100 hover:bg-red-50 rounded-full p-2 cursor-pointer flex items-center justify-center"
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
