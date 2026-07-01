import ModalShell from './ui/ModalShell';

const QR_CODE_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';

export default function KhqrPaymentModal({ isOpen, total, order, qrPayload, onCancel }) {
  const qrData = encodeURIComponent(qrPayload || `pay-to-toub-pos-amount-${total}`);

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="khqr-payment-title"
      panelClassName="bg-white/80 rounded-4xl w-115 max-w-full p-7 flex flex-col items-center text-center shadow-[0_24px_64px_rgba(0,0,0,0.24)] border-0"
    >
        <h3 id="khqr-payment-title" className="m-0 text-[26px] font-extrabold text-brand-dark mb-5 mt-1 tracking-tight">
          Scan QR Code to Pay!
        </h3>

        {/* KHQR Poster Slip */}
        <div
          className="bg-white rounded-3xl p-6 w-full shadow-lg flex flex-col items-center border border-gray-150 relative overflow-hidden"
        >
          <span className="text-[28px] font-black tracking-tight text-state-danger uppercase leading-none mt-1">
            TOUB PAY
          </span>
          <span className="text-[11px] font-bold text-gray-400 tracking-wide uppercase mt-1">
            Scan. Pay. Done.
          </span>

          {/* QR Code Graphic */}
          <div className="border border-gray-150 rounded-2xl p-4 my-5 bg-white relative shadow-sm">
            <img
              src={`${QR_CODE_API_BASE}?size=180x180&data=${qrData}`}
              alt="KHQR Code"
              className="w-45 h-45 block"
            />
            {/* Simulated center badge icon */}
            <div className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold text-red-600 text-xs">
              T
            </div>
          </div>

          <span className="text-lg font-black text-[#0f2c59] tracking-tight uppercase leading-none">
            TOUB POS MERCHANT
          </span>
          <span className="text-[11px] font-bold text-gray-400 mt-1">
            {order ? `Order ${order.orderNo} · ${order.status}` : 'merchant@toubpos'}
          </span>

          {/* Member of KHQR footer */}
          <div className="w-full flex justify-between items-center mt-5 pt-3 border-t border-gray-100 text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Member of</span>
            <span className="text-base font-black text-state-danger tracking-tighter leading-none">KHQR</span>
          </div>
        </div>

        <button
          className="w-4/5 h-14 bg-state-danger hover:bg-state-danger/90 active:scale-[0.98] text-white text-xl font-bold rounded-2xl transition-all cursor-pointer border-0 shadow-md flex items-center justify-center mt-6"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <span className="text-xs font-semibold text-gray-700 mt-3 animate-pulse">
          Order is pending payment. KHQR webhook confirmation is planned for a later phase.
        </span>
    </ModalShell>
  );
}
