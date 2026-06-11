import { money } from '../utils/format';
import Icon from './ui/Icon';

export default function CartItem({ item, updateQuantity }) {
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
        {/* Quantity Pill */}
        <div className="flex items-center h-8 px-1 rounded-full bg-[#eeeef0] border border-gray-150">
          <button
            className={`w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all border-0`}
            type="button"
            onClick={() => updateQuantity(item.id, -1)}
          >
            <Icon name="minus" className="w-3.5 h-3.5" strokeWidth={3.5} />
          </button>
          <span className="w-7 text-center text-sm font-bold text-gray-900 select-none">
            {item.quantity}
          </span>
          <button
            className={`w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all border-0`}
            type="button"
            onClick={() => updateQuantity(item.id, 1)}
          >
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={3.5} />
          </button>
        </div>

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
