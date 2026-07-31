import { useMemo, useState } from 'react';
import { khrMoney, money } from '../../../utils/format';
import { calculateMixedCashPreview } from '../../../../config/financial-policy';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import ModalShell from '../../../components/ui/ModalShell';

export default function CashConfirmationModal({
  isOpen,
  total = 0,
  totalKhr = 0,
  exchangeRateKhrPerUsd = 4100,
  initialPricingCurrency = 'usd',
  isBusy = false,
  isOnline = true,
  isCheckingBackend = false,
  error,
  onCancel,
  onConfirm,
}) {
  const totalAmount = Number(total || 0);
  const pricingCurrency = initialPricingCurrency;
  const [cashReceivedUsd, setCashReceivedUsd] = useState(
    initialPricingCurrency === 'usd' && totalAmount > 0 ? totalAmount.toFixed(2) : ''
  );
  const [cashReceivedKhr, setCashReceivedKhr] = useState(
    initialPricingCurrency === 'khr' && Number(totalKhr) > 0 ? String(totalKhr) : ''
  );
  const preview = useMemo(() => calculateMixedCashPreview({
    totalUsd: totalAmount,
    totalKhr,
    pricingCurrency,
    exchangeRateKhrPerUsd,
    cashReceivedUsd,
    cashReceivedKhr,
  }), [
    cashReceivedKhr,
    cashReceivedUsd,
    exchangeRateKhrPerUsd,
    pricingCurrency,
    totalAmount,
    totalKhr,
  ]);
  const canConfirm = preview.isValid && !preview.isUnderpaid && !isBusy && isOnline;

  function handleConfirm() {
    if (!canConfirm) {
      return;
    }

    onConfirm({
      cashReceivedUsd: Number(cashReceivedUsd) > 0 ? Number(cashReceivedUsd).toFixed(2) : null,
      cashReceivedKhr: Number(cashReceivedKhr) > 0 ? Math.round(Number(cashReceivedKhr)) : null,
    });
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      labelledBy="cash-confirmation-title"
      panelClassName="w-full max-w-115 rounded-3xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.24)] p-6"
    >
      <div className="text-center">
        <h3 id="cash-confirmation-title" className="m-0 text-2xl font-black text-brand-dark tracking-tight">
          Cash received
        </h3>

        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-4 text-left space-y-3">
          <div className="flex items-center justify-between text-sm font-bold text-gray-500 mb-2">
            <span>Order totals</span>
            <div className="text-right">
              <span className="text-xl text-state-success">{money(totalAmount)}</span>
              <span className="block text-xs text-gray-400">{khrMoney(totalKhr)}</span>
            </div>
          </div>

          <p className="m-0 text-xs font-semibold text-gray-400">Saved rate: 1 USD = {Number(exchangeRateKhrPerUsd).toLocaleString()} KHR</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                Received (USD)
              </span>
              <div className="flex items-center w-full h-13 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-brand-action focus-within:ring-4 focus-within:ring-brand-action/10 transition-all">
                <span className="text-xl font-medium text-gray-400 mr-1">$</span>
                <input
                  className="w-full text-2xl font-black text-gray-900 bg-transparent outline-none disabled:opacity-60 p-0"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={cashReceivedUsd}
                  disabled={isBusy}
                  onChange={(event) => setCashReceivedUsd(event.target.value)}
                  autoFocus
                />
              </div>
            </label>
            <label className="block">
              <span className="block mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                Received (KHR)
              </span>
              <div className="flex items-center w-full h-13 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-brand-action focus-within:ring-4 focus-within:ring-brand-action/10 transition-all">
                <input
                  className="w-full text-2xl font-black text-gray-900 bg-transparent outline-none disabled:opacity-60 p-0"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={cashReceivedKhr}
                  disabled={isBusy}
                  onChange={(event) => setCashReceivedKhr(event.target.value)}
                />
                <span className="text-xl font-bold text-gray-400 ml-1">៛</span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white border border-gray-100 px-4 py-3">
            <span className="text-sm font-bold text-gray-500">Change due</span>
            <div className="text-right">
              <span className={`block text-2xl font-black ${preview.isUnderpaid ? 'text-state-danger' : 'text-state-success'}`}>
                {money(preview.changeUsd)}
              </span>
              <span className={`block text-xs font-bold ${preview.isUnderpaid ? 'text-state-danger' : 'text-gray-400'}`}>
                {khrMoney(preview.changeKhr)}
              </span>
            </div>
          </div>
        </div>

        {preview.isUnderpaid ? (
          <Alert variant="warning" className="mb-4 text-left" title="Cash is short">
            Combined USD and KHR cash is below the order total.
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="danger" className="mb-4 text-left" title="Payment failed">
            {error}
          </Alert>
        ) : null}

        {!isOnline ? (
          <Alert variant="warning" className="mb-4 text-left" title="Payment unavailable">
            {isCheckingBackend
              ? 'Checking the TouB POS server. Payment will be enabled when it responds.'
              : 'The server is unreachable. Do not accept payment yet; keep this dialog open and retry after reconnection.'}
          </Alert>
        ) : null}

        <div className="flex gap-3">
          <Button
            className="h-13 flex-1"
            type="button"
            disabled={isBusy}
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-13 flex-1"
            type="button"
            disabled={!canConfirm}
            loading={isBusy}
            variant="success"
            onClick={handleConfirm}
          >
            {isBusy ? 'Processing...' : 'Confirm paid'}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
