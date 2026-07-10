import { useEffect, useState } from 'react';
import Alert from './ui/Alert';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Icon from './ui/Icon';
import ModalShell from './ui/ModalShell';

const QR_CODE_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';

function formatExpiresAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function KhqrPaymentModal({ isOpen, total, order, qrPayload, pollingError, onCancel }) {
  const [now, setNow] = useState(() => Date.now());
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
  const statusVariant = displayStatus === 'paid'
    ? 'success'
    : displayStatus === 'expired'
      ? 'danger'
      : 'warning';
  const statusLabel = displayStatus === 'pending_payment'
    ? 'Waiting payment'
    : displayStatus.replace('_', ' ');

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="khqr-payment-title"
      panelClassName="bg-white rounded-3xl w-[min(94vw,520px)] max-h-[92svh] overflow-y-auto p-6 flex flex-col items-center text-center shadow-[0_24px_64px_rgba(0,0,0,0.24)] border border-ui-border"
    >
        <div className="mb-4 flex flex-col items-center gap-2">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-state-danger">
            <Icon name="khqr" className="h-6 w-6" />
          </div>
          <h3 id="khqr-payment-title" className="m-0 text-[26px] font-extrabold text-brand-dark tracking-tight">
            Scan KHQR To Pay
          </h3>
          <p className="m-0 text-sm font-semibold text-gray-600">
            Waiting for customer payment confirmation.
          </p>
        </div>

        {/* KHQR Poster Slip */}
        <div
          className="bg-white rounded-3xl p-5 w-full shadow-lg flex flex-col items-center border border-ui-border relative overflow-hidden"
        >
          <div className="flex w-full items-center justify-between gap-3">
            <div className="text-left">
              <span className="block text-[24px] font-black tracking-tight text-state-danger uppercase leading-none">
                TOUB PAY
              </span>
              <span className="mt-1 block text-[11px] font-bold text-gray-400 tracking-wide uppercase">
                Scan. Pay. Wait for confirmation.
              </span>
            </div>
            <Badge variant={statusVariant} dot>{statusLabel}</Badge>
          </div>

          {/* QR Code Graphic */}
          <div className="border border-gray-200 rounded-3xl p-4 my-5 bg-white relative shadow-sm">
            <img
              src={`${QR_CODE_API_BASE}?size=220x220&data=${qrData}`}
              alt="KHQR Code"
              className="w-52 h-52 max-[380px]:w-45 max-[380px]:h-45 block"
            />
            {/* Simulated center badge icon */}
            <div className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold text-red-600 text-xs">
              T
            </div>
          </div>

          <div className="text-center">
            <span className="text-lg font-black text-[#0f2c59] tracking-tight uppercase leading-none">
              TOUB POS MERCHANT
            </span>
            <span className="block text-[11px] font-bold text-gray-400 mt-1">
              {order ? `Order ${order.orderNo}` : 'Preparing order'}
            </span>
          </div>

          <div className="w-full mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-left space-y-2">
            <div className="flex justify-between gap-3 text-sm items-baseline">
              <span className="font-semibold text-gray-500">Amount</span>
              <span className="font-black text-2xl text-brand-action">${Number(order?.total ?? total ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm items-center">
              <span className="font-semibold text-gray-500">Status</span>
              <Badge variant={statusVariant} dot>{statusLabel}</Badge>
            </div>
            {order?.paymentReference && (
              <div className="text-xs">
                <span className="font-semibold text-gray-500">Reference</span>
                <p className="m-0 mt-1 font-mono text-gray-800 break-all">{order.paymentReference}</p>
              </div>
            )}
            {order?.qrMd5 && (
              <div className="text-xs">
                <span className="font-semibold text-gray-500">QR fingerprint</span>
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

        {pollingError ? (
          <Alert variant="danger" className="mt-4 w-full text-left" title="Payment status check">
            {pollingError}
          </Alert>
        ) : null}

        <Button
          className="mt-5 h-13 rounded-2xl"
          type="button"
          variant="secondary"
          fullWidth
          onClick={onCancel}
        >
          Close QR
        </Button>
        <span className="text-xs font-semibold text-gray-700 mt-3">
          {isExpired
            ? 'This QR has expired. Create a new KHQR checkout if the customer has not paid.'
            : 'Closing this screen keeps the KHQR order pending. Resume it from My Orders if needed.'}
        </span>
        {!isExpired && (
          <span className="text-xs font-semibold text-gray-500 mt-1 animate-pulse">
            Waiting for Bakong payment confirmation...
          </span>
        )}
    </ModalShell>
  );
}
