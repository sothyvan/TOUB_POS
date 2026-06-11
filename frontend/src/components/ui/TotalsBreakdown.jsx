import { money } from '../../utils/format';

export default function TotalsBreakdown({ subtotal, serviceFee, estimatedTax, total, variant = 'panel' }) {
  const isReceipt = variant === 'receipt';

  if (isReceipt) {
    return (
      <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
        <div className="flex justify-between text-gray-500 text-sm font-semibold">
          <span>Subtotal</span>
          <span className="text-gray-950">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500 text-sm font-semibold">
          <span>Service Fee (3%)</span>
          <span className="text-gray-950">{money(serviceFee)}</span>
        </div>
        <div className="flex justify-between text-gray-500 text-sm font-semibold">
          <span>Estimated Tax (8%)</span>
          <span className="text-gray-950">{money(estimatedTax)}</span>
        </div>
        <div className="flex justify-between text-gray-900 text-base font-bold pt-3 mt-1.5 border-t border-gray-100 items-baseline">
          <span>Total Amount</span>
          <span className="text-2xl text-brand-action font-black">{money(total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 mb-6">
      <div className="flex justify-between text-gray-500 text-[15px] font-semibold">
        <span>Subtotal</span>
        <strong className="text-gray-900 font-bold">{money(subtotal)}</strong>
      </div>
      <div className="flex justify-between text-gray-500 text-[15px] font-semibold">
        <span>Service Fee (3%)</span>
        <strong className="text-gray-900 font-bold">{money(serviceFee)}</strong>
      </div>
      <div className="flex justify-between text-gray-500 text-[15px] font-semibold">
        <span>Estimated Tax (8%)</span>
        <strong className="text-gray-900 font-bold">{money(estimatedTax)}</strong>
      </div>
      <div className="flex justify-between items-baseline pt-4 border-t border-gray-100 mt-2">
        <span className="text-[#1a1c1e] text-base font-bold">Total Amount</span>
        <strong className="text-5xl text-brand-action font-black leading-none tracking-tight">
          {money(total)}
        </strong>
      </div>
    </div>
  );
}
