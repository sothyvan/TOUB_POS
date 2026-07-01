import { money } from '../utils/format';
import Icon from './ui/Icon';
import ModalShell from './ui/ModalShell';
import TotalsBreakdown from './ui/TotalsBreakdown';

export default function ReceiptModal({ activeReceipt, onClose }) {
  const isPaid = activeReceipt?.status === 'paid';
  const statusLabel = isPaid ? 'Payment Confirmed' : 'Order Pending Payment';
  const badgeText = isPaid ? `Paid via ${activeReceipt?.paymentMethod}` : `${activeReceipt?.paymentMethod} · ${activeReceipt?.status}`;

  return (
    <ModalShell
      isOpen={Boolean(activeReceipt)}
      labelledBy="receipt-modal-title"
      panelClassName="bg-white rounded-2xl w-full max-w-105 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
    >
      {activeReceipt ? (
        <>
        {/* Header */}
        <div className="bg-[#f8f9fa] border-b border-gray-100 p-5 text-center flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
            isPaid ? 'bg-[#e6f4eb] text-[#126149]' : 'bg-[#fff7ed] text-[#c2410c]'
          }`}>
            <Icon name={isPaid ? 'check' : 'clock'} className="w-6 h-6" strokeWidth={3} />
          </div>
          <h3 id="receipt-modal-title" className="m-0 text-xl font-bold text-gray-900 leading-snug">{statusLabel}</h3>
          <p className="m-0 mt-1 text-gray-500 text-sm font-semibold">
            Receipt: {activeReceipt.orderNo}
          </p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white ${
            isPaid ? 'bg-state-success' : 'bg-brand-action'
          }`}>
            {badgeText}
          </span>
        </div>

        {/* Receipt Details List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Order summary</div>
          <div className="space-y-3.5">
            {activeReceipt.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <strong className="block text-gray-900 text-sm font-bold truncate">{item.name}</strong>
                  <span className="block mt-0.5 text-gray-400 text-xs font-semibold">
                    {item.quantity} x {money(item.price)}
                  </span>
                </div>
                <strong className="text-gray-900 text-sm font-bold shrink-0">
                  {money(item.lineTotal)}
                </strong>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <TotalsBreakdown
            subtotal={activeReceipt.subtotal}
            serviceFee={activeReceipt.serviceFee}
            estimatedTax={activeReceipt.estimatedTax}
            total={activeReceipt.total}
            variant="receipt"
          />

          {/* Metadata */}
          <div className="border-t border-dashed border-gray-200 pt-4 mt-4 text-[11px] text-gray-400 font-bold space-y-1">
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{activeReceipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Station:</span>
              <span>{activeReceipt.station}</span>
            </div>
            <div className="flex justify-between">
              <span>Date/Time:</span>
              <span>{new Date(activeReceipt.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 bg-[#f8f9fa] flex gap-3">
          <button
            className="flex-1 h-12 bg-brand-action hover:bg-brand-action/90 text-white rounded-xl font-bold transition-all cursor-pointer border-0 shadow-sm"
            type="button"
            onClick={onClose}
          >
            New Order
          </button>
        </div>
        </>
      ) : null}
    </ModalShell>
  );
}
