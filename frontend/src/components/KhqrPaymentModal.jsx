import { useEffect, useState } from 'react';
import Alert from './ui/Alert';
import Badge from './ui/Badge';
import Button from './ui/Button';
import ModalShell from './ui/ModalShell';
import khqrLogoRed from '../assets/khqr-logo-red.png';

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
      onClose={onCancel}
      labelledBy="khqr-payment-title"
      panelClassName="khqr-payment-surface w-[min(92vw,430px)] max-h-[94svh] overflow-y-auto rounded-lg bg-white p-4 shadow-[0_24px_64px_rgba(0,0,0,0.4)] border border-[#d8d8d8] max-[420px]:p-3"
    >
        <div className="flex flex-col items-center text-center">
          <img
            src={khqrLogoRed}
            alt="KHQR"
            className="mt-1 h-auto w-28"
          />

          <h3 id="khqr-payment-title" className="m-0 mt-3 text-xl font-black uppercase tracking-tight text-brand-dark">
            TOUB POS MERCHANT
          </h3>
          <p className="khqr-amount m-0 mt-1 text-2xl font-black">
            ${Number(order?.total ?? total ?? 0).toFixed(2)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={statusVariant} dot>{statusLabel}</Badge>
            {formatExpiresAt(order?.paymentExpiresAt) ? (
              <span className="text-xs font-bold text-gray-500">
                Expires {formatExpiresAt(order.paymentExpiresAt)}
              </span>
            ) : null}
          </div>

          <div className="relative my-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <img
              src={`${QR_CODE_API_BASE}?size=220x220&data=${qrData}`}
              alt={`KHQR payment code for ${order?.orderNo || 'current order'}`}
              className="block aspect-square w-[min(64vw,220px)]"
            />
            <div className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold text-red-600 text-xs">
              T
            </div>
          </div>

          {pollingError ? (
            <Alert variant="danger" className="mb-3 w-full text-left">
              {pollingError}
            </Alert>
          ) : null}

          <Button
            className="min-h-11 rounded-xl"
            type="button"
            variant="secondary"
            fullWidth
            onClick={onCancel}
          >
            Close QR
          </Button>
        </div>
    </ModalShell>
  );
}
