import { money } from '../utils/format';
import Icon from './ui/Icon';
import QuantityInput from './QuantityInput';

export default function CartItem({ item, updateQuantity, setCartItemQuantity }) {
  return (
    <div className="py-4.5 border-b border-gray-100 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <strong className="block text-[#1a1c1e] text-base font-bold leading-snug truncate">
          {item.name}
        </strong>
        <span className="block mt-1 text-[#434656] text-sm font-medium">
          {money(item.price)}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <QuantityInput
          value={item.quantity}
          onDecrease={() => updateQuantity(item.id, -1)}
          onIncrease={() => updateQuantity(item.id, 1)}
          onChange={(val) => setCartItemQuantity(item.id, val)}
          className="text-gray-900 font-bold"
        />

        {/* Line Total */}
        <strong className="w-16 text-right text-[#1a1c1e] text-[17px] font-bold">
          {money(item.price * item.quantity)}
        </strong>

        {/* Remove Button */}
        <button
          className="text-gray-400 hover:text-gray-600 transition-colors border-0 bg-transparent p-1 cursor-pointer flex items-center justify-center"
          type="button"
          onClick={() => updateQuantity(item.id, -item.quantity)}
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
