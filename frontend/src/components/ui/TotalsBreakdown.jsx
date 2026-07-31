import { money } from '../../utils/format';

export default function TotalsBreakdown({
  subtotal,
  total,
  variant = 'panel',
}) {
  const isReceipt = variant === 'receipt';

  if (isReceipt) {
    return (
      <div className="mt-4 space-y-2 border-t border-ui-border pt-4">
        <div className="flex justify-between text-sm font-semibold text-text-soft">
          <span>Subtotal</span>
          <span className="text-text-strong">{money(subtotal)}</span>
        </div>
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
      <div className="flex justify-between items-baseline pt-4 border-t border-gray-100 mt-2">
        <span className="text-brand-text text-base font-bold">Total Amount</span>
        <strong className="text-4xl text-state-success font-black leading-none tracking-tight">
          {money(total)}
        </strong>
      </div>
    </div>
  );
}
