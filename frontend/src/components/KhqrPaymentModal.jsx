import { useEffect, useState } from 'react';
import ModalShell from './ui/ModalShell';

const QR_CODE_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';

function formatExpiresAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function KhqrPaymentModal({ isOpen, total, order, qrPayload, pollingError, onCancel }) {
  const [now, setNow] = useState(null);
  const expiresAt = order?.paymentExpiresAt ? new Date(order.paymentExpiresAt) : null;

  useEffect(() => {
    if (!isOpen || !order?.paymentExpiresAt) return undefined;

    const refreshNow = () => setNow(Date.now());
    const initialTimerId = window.setTimeout(refreshNow, 0);
    const intervalId = window.setInterval(refreshNow, 30000);

    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(intervalId);
    };
  }, [isOpen, order?.paymentExpiresAt]);

  const isExpired = Boolean(
    order?.status === 'pending_payment'
    && expiresAt
    && now
    && expiresAt.getTime() < now
  );
  const displayStatus = isExpired ? 'expired' : (order?.status || 'pending_payment');
  const qrData = encodeURIComponent(qrPayload || order?.paymentReference || `toub-pos-order-${order?.id || 'pending'}`);
  const statusClassName = displayStatus === 'paid'
    ? 'bg-green-50 text-green-700 border-green-200'
    : displayStatus === 'expired'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-yellow-50 text-yellow-700 border-yellow-200';

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="khqr-payment-title"
      panelClassName="bg-white/80 rounded-4xl w-115 max-w-full p-7 flex flex-col items-center text-center shadow-[0_24px_64px_rgba(0,0,0,0.24)] border-0"
    >
        <h3 id="khqr-payment-title" className="m-0 text-[26px] font-extrabold text-brand-dark mb-2 mt-1 tracking-tight">
          Scan KHQR To Pay
        </h3>
        <p className="m-0 mb-5 text-sm font-semibold text-gray-600">
          Backend-owned Individual KHQR order
        </p>

        {/* KHQR Poster Slip */}
        <div
          className="bg-white rounded-3xl p-6 w-full shadow-lg flex flex-col items-center border border-gray-150 relative overflow-hidden"
        >
          <span className="text-[28px] font-black tracking-tight text-state-danger uppercase leading-none mt-1">
            TOUB PAY
          </span>
          <span className="text-[11px] font-bold text-gray-400 tracking-wide uppercase mt-1">
            Scan. Pay. Wait for confirmation.
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
            {order ? `Order ${order.orderNo}` : 'Preparing order'}
          </span>

          <div className="w-full mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-left space-y-2">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-gray-500">Amount</span>
              <span className="font-black text-gray-900">${Number(order?.total ?? total ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-gray-500">Status</span>
              <span className={`px-2 py-1 rounded-full border text-xs font-bold uppercase ${statusClassName}`}>
                {displayStatus.replace('_', ' ')}
              </span>
            </div>
            {order?.paymentReference && (
              <div className="text-xs">
                <span className="font-semibold text-gray-500">Reference</span>
                <p className="m-0 mt-1 font-mono text-gray-800 break-all">{order.paymentReference}</p>
              </div>
            )}
            {order?.qrMd5 && (
              <div className="text-xs">
                <span className="font-semibold text-gray-500">QR MD5</span>
                <p className="m-0 mt-1 font-mono text-gray-800 break-all">{order.qrMd5}</p>
              </div>
            )}
            {formatExpiresAt(order?.paymentExpiresAt) && (
              <div className="flex justify-between gap-3 text-xs">
                <span className="font-semibold text-gray-500">Expires</span>
                <span className="font-bold text-gray-800">{formatExpiresAt(order.paymentExpiresAt)}</span>
              </div>
            )}
          </div>

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
          {isExpired
            ? 'This QR has expired. Create a new KHQR checkout if the customer has not paid.'
            : 'Waiting for Bakong payment confirmation...'}
        </span>
        {pollingError && (
          <span className="text-xs font-semibold text-state-danger mt-2">
            {pollingError}
          </span>
        )}
    </ModalShell>
  );
}
