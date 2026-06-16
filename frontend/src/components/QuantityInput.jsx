import { useState } from 'react';
import Icon from './ui/Icon';

export default function QuantityInput({
  value,
  onDecrease,
  onIncrease,
  onChange,
  className = 'text-gray-900 font-bold'
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [localVal, setLocalVal] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setLocalVal(value);
  }

  const handleQuantityChange = (e) => {
    setLocalVal(e.target.value);
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num > 0) {
      onChange(num);
    }
  };

  const handleQuantityBlur = () => {
    const num = parseInt(localVal, 10);
    if (isNaN(num) || num <= 0) {
      setLocalVal(value);
      onChange(value);
    }
  };

  return (
    <div className="relative z-20 pointer-events-auto flex items-center h-8 px-1 rounded-full bg-[#eeeef0] border border-gray-150 shadow-sm">
      <button
        className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all border-0 shrink-0"
        type="button"
        onClick={onDecrease}
      >
        <Icon name="minus" className="w-3.5 h-3.5" strokeWidth={3.5} />
      </button>
      <input
        type="number"
        min="1"
        value={localVal}
        onChange={handleQuantityChange}
        onBlur={handleQuantityBlur}
        onFocus={(e) => e.target.select()}
        aria-label="Quantity"
        className={`w-8 m-0 border-0 bg-transparent text-center text-sm outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      />
      <button
        className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all border-0 shrink-0"
        type="button"
        onClick={onIncrease}
      >
        <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={3.5} />
      </button>
    </div>
  );
}


