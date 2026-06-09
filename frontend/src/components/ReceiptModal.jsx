import { money } from '../utils/format';

export default function ReceiptModal({ activeReceipt, onClose }) {
  if (!activeReceipt) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-105 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#f8f9fa] border-b border-gray-100 p-5 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#e6f4eb] text-[#126149] flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="m-0 text-xl font-bold text-gray-900 leading-snug">Payment Confirmed</h3>
          <p className="m-0 mt-1 text-gray-500 text-sm font-semibold">
            Receipt: {activeReceipt.orderNo}
          </p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white ${
            activeReceipt.paymentMethod === 'KHQR' ? 'bg-[#c70000]' : 'bg-[#157811]'
          }`}>
            Paid via {activeReceipt.paymentMethod}
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
          <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-gray-500 text-sm font-semibold">
              <span>Subtotal</span>
              <span className="text-gray-950">{money(activeReceipt.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm font-semibold">
              <span>Service Fee (3%)</span>
              <span className="text-gray-950">{money(activeReceipt.serviceFee)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm font-semibold">
              <span>Estimated Tax (8%)</span>
              <span className="text-gray-950">{money(activeReceipt.estimatedTax)}</span>
            </div>
            <div className="flex justify-between text-gray-955 text-base font-bold pt-3 mt-1.5 border-t border-gray-100 items-baseline">
              <span>Total Amount</span>
              <span className="text-2xl text-[#003ec7] font-black">{money(activeReceipt.total)}</span>
            </div>
          </div>

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
            className="flex-1 h-12 bg-[#003ec7] hover:bg-[#003ec7]/90 text-white rounded-xl font-bold transition-all cursor-pointer border-0 shadow-sm"
            type="button"
            onClick={onClose}
          >
            New Order
          </button>
        </div>
      </div>
    </div>
  );
}
