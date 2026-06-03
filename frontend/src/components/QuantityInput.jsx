import { useState } from 'react';

export default function QuantityInput({ value, onChange }) {
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
    <input
      type="number"
      min="1"
      value={localVal}
      onChange={handleQuantityChange}
      onBlur={handleQuantityBlur}
      onFocus={(e) => e.target.select()}
      aria-label="Quantity"
      className="w-8 m-0 border-0 bg-transparent text-[#f8d36b] text-center text-sm font-black outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
