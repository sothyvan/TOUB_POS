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
      <div className="mt-4 space-y-2 border-t border-ui-border pt-4">
        <div className="flex justify-between text-sm font-semibold text-text-soft">
          <span>Subtotal</span>
          <span className="text-text-strong">{money(subtotal)}</span>
        </div>
        {hasServiceFee ? (
          <div className="flex justify-between text-sm font-semibold text-text-soft">
            <span>Service fee</span>
            <span className="text-text-strong">{money(serviceFee)}</span>
          </div>
        ) : null}
        {hasEstimatedTax ? (
          <div className="flex justify-between text-sm font-semibold text-text-soft">
            <span>Estimated tax</span>
            <span className="text-text-strong">{money(estimatedTax)}</span>
          </div>
        ) : null}
        <div className="mt-1.5 flex items-baseline justify-between border-t border-ui-border pt-3 text-base font-bold text-text-strong">
          <span>Total Amount</span>
          <span className="text-2xl text-state-success font-black">{money(total)}</span>
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
        <strong className="text-4xl text-state-success font-black leading-none tracking-tight">
          {money(total)}
        </strong>
      </div>
    </div>
  );
}
