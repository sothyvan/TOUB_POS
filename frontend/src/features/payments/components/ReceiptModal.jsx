import { khrMoney, money } from '../../../utils/format';
import Icon from '../../../components/ui/Icon';
import ModalShell from '../../../components/ui/ModalShell';
import TotalsBreakdown from '../../../components/ui/TotalsBreakdown';

export default function ReceiptModal({ activeReceipt, onClose }) {
  const isPaid = activeReceipt?.status === 'paid';
  const statusLabel = isPaid ? 'Payment Confirmed' : 'Order Pending Payment';
  const badgeText = isPaid ? `Paid via ${activeReceipt?.paymentMethod}` : `${activeReceipt?.paymentMethod} · ${activeReceipt?.status}`;

  return (
    <ModalShell
      isOpen={Boolean(activeReceipt)}
      onClose={onClose}
      labelledBy="receipt-modal-title"
      panelClassName="w-full max-w-105 max-h-[90vh] overflow-hidden rounded-lg border border-ui-border bg-ui-elevated text-text-strong shadow-[0_24px_70px_rgba(0,0,0,0.45)] flex flex-col"
    >
      {activeReceipt ? (
        <>
        {/* Header */}
        <div className="border-b border-ui-border bg-ui-muted p-5 text-center flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
            isPaid ? 'bg-state-success/15 text-state-success' : 'bg-state-warning/15 text-state-warning'
          }`}>
            <Icon name={isPaid ? 'check' : 'clock'} className="w-6 h-6" strokeWidth={3} />
          </div>
          <h3 id="receipt-modal-title" className="m-0 text-xl font-bold text-text-strong leading-snug">{statusLabel}</h3>
          <p className="m-0 mt-1 text-text-soft text-sm font-semibold">
            Receipt: {activeReceipt.orderNo}
          </p>
          <span className={`inline-block mt-2 rounded-full border px-3 py-1 text-xs font-bold ${
            isPaid
              ? 'border-state-success/40 bg-state-success/15 text-state-success'
              : 'border-state-warning/40 bg-state-warning/15 text-state-warning'
          }`}>
            {badgeText}
          </span>
        </div>

        {/* Receipt Details List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-text-soft">Order summary</div>
          <div className="space-y-3.5">
            {activeReceipt.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-bold text-text-strong">{item.name}</strong>
                  <span className="block mt-0.5 text-xs font-semibold text-text-soft">
                    {item.quantity} × {money(item.price)} · {khrMoney(item.priceKhr)}
                  </span>
                </div>
                <strong className="shrink-0 text-sm font-bold text-text-strong">
                  {activeReceipt.pricingCurrency === 'khr' ? khrMoney(item.lineTotalKhr) : money(item.lineTotal)}
                </strong>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <TotalsBreakdown
            subtotal={activeReceipt.subtotal}
            total={activeReceipt.total}
            variant="receipt"
          />
          <div className="flex justify-between text-sm font-bold text-text-soft">
            <span>KHR total</span>
            <span className="text-text-strong">{khrMoney(activeReceipt.totalKhr)}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-text-muted">
            <span>Pricing currency</span>
            <span>{String(activeReceipt.pricingCurrency || 'usd').toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-text-muted">
            <span>Saved exchange rate</span>
            <span>1 USD = {Number(activeReceipt.exchangeRateKhrPerUsd).toLocaleString()} KHR</span>
          </div>

          {activeReceipt.paymentMethod === 'CASH' && (activeReceipt.cashReceived !== null || activeReceipt.cashReceivedKhr !== null) ? (
            <div className="mt-4 space-y-2 border-t border-dashed border-ui-border pt-4 text-sm font-bold">
              <div className="flex justify-between text-text-soft">
                <span>Cash received (USD)</span>
                <span className="text-text-strong">{money(activeReceipt.cashReceived || 0)}</span>
              </div>
              <div className="flex justify-between text-text-soft">
                <span>Cash received (KHR)</span>
                <span className="text-text-strong">{khrMoney(activeReceipt.cashReceivedKhr || 0)}</span>
              </div>
              <div className="flex justify-between text-text-soft">
                <span>Change due</span>
                <span className="text-right text-state-success">
                  <span className="block">{money(activeReceipt.changeDue || 0)}</span>
                  <span className="block text-xs">{khrMoney(activeReceipt.changeDueKhr || 0)}</span>
                </span>
              </div>
            </div>
          ) : null}

          {/* Metadata */}
          <div className="mt-4 space-y-1 border-t border-dashed border-ui-border pt-4 text-xs font-semibold text-text-soft">
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{activeReceipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Stall:</span>
              <span>{activeReceipt.stallName}</span>
            </div>
            <div className="flex justify-between">
              <span>Date/Time:</span>
              <span>{new Date(activeReceipt.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-ui-border bg-ui-muted p-5">
          <button
            className="flex-1 h-12 bg-brand-action hover:bg-brand-action/90 text-white rounded-xl font-bold transition-all cursor-pointer border-0 shadow-sm"
            type="button"
            onClick={onClose}
          >
            Close Receipt
          </button>
        </div>
        </>
      ) : null}
    </ModalShell>
  );
}
