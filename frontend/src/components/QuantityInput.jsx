import { useState } from 'react';
import Icon from './ui/Icon';

export default function QuantityInput({
  value,
  onDecrease,
  onIncrease,
  onChange,
  className = 'text-gray-900 font-bold',
  compact = false,
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
    <div className={`relative z-20 pointer-events-auto flex items-center rounded-md bg-ui-muted border border-ui-border ${compact ? 'min-h-9 px-0.5' : 'min-h-10 px-1'}`}>
      <button
        className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} rounded-sm bg-state-success/15 text-state-success flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-state-success/25 active:scale-95 transition-all border border-state-success/25 shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-state-success/20`}
        type="button"
        onClick={onDecrease}
        aria-label="Decrease quantity"
      >
        <Icon name="minus" className="w-4 h-4" strokeWidth={3.5} />
      </button>
      <input
        type="number"
        min="1"
        value={localVal}
        onChange={handleQuantityChange}
        onBlur={handleQuantityBlur}
        onFocus={(e) => e.target.select()}
        aria-label="Quantity"
        className={`${compact ? 'w-7' : 'w-10'} m-0 border-0 bg-transparent text-center text-sm outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      />
      <button
        className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} rounded-sm bg-state-success/15 text-state-success flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-state-success/25 active:scale-95 transition-all border border-state-success/25 shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-state-success/20`}
        type="button"
        onClick={onIncrease}
        aria-label="Increase quantity"
      >
        <Icon name="plus" className="w-4 h-4" strokeWidth={3.5} />
      </button>
    </div>
  );
}


