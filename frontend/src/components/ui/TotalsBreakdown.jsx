import { money } from '../../utils/format';

export default function TotalsBreakdown({
  estimatedTax = 0,
  serviceFee = 0,
  subtotal,
  total,
  variant = 'panel',
}) {
  const isReceipt = variant === 'receipt';
  const hasServiceFee = Number(serviceFee || 0) > 0;
  const hasEstimatedTax = Number(estimatedTax || 0) > 0;

  if (isReceipt) {
    return (
      <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
        <div className="flex justify-between text-gray-500 text-sm font-semibold">
          <span>Subtotal</span>
          <span className="text-gray-950">{money(subtotal)}</span>
        </div>
        {hasServiceFee ? (
          <div className="flex justify-between text-gray-500 text-sm font-semibold">
            <span>Service fee</span>
            <span className="text-gray-950">{money(serviceFee)}</span>
          </div>
        ) : null}
        {hasEstimatedTax ? (
          <div className="flex justify-between text-gray-500 text-sm font-semibold">
            <span>Estimated tax</span>
            <span className="text-gray-950">{money(estimatedTax)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-gray-900 text-base font-bold pt-3 mt-1.5 border-t border-gray-100 items-baseline">
          <span>Total Amount</span>
          <span className="text-2xl text-brand-action font-black">{money(total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 mb-5">
      <div className="flex justify-between text-gray-500 text-[15px] font-semibold">
        <span>Subtotal</span>
        <strong className="text-gray-900 font-bold">{money(subtotal)}</strong>
      </div>
      {hasServiceFee ? (
        <div className="flex justify-between text-gray-500 text-[13px] font-semibold">
          <span>Service fee</span>
          <strong className="text-gray-900 font-bold">{money(serviceFee)}</strong>
        </div>
      ) : null}
      {hasEstimatedTax ? (
        <div className="flex justify-between text-gray-500 text-[13px] font-semibold">
          <span>Estimated tax</span>
          <strong className="text-gray-900 font-bold">{money(estimatedTax)}</strong>
        </div>
      ) : null}
      <div className="flex justify-between items-baseline pt-4 border-t border-gray-100 mt-2">
        <span className="text-brand-text text-base font-bold">Total Amount</span>
        <strong className="text-4xl text-brand-action font-black leading-none tracking-tight">
          {money(total)}
        </strong>
      </div>
    </div>
  );
}
