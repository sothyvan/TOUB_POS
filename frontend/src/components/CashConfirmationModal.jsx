import { useMemo, useState } from 'react';
import { money } from '../utils/format';
import ModalShell from './ui/ModalShell';

export default function CashConfirmationModal({
  isOpen,
  total = 0,
  isBusy = false,
  error,
  onCancel,
  onConfirm,
}) {
  const totalAmount = Number(total || 0);
  const [cashReceived, setCashReceived] = useState(
    totalAmount > 0 ? totalAmount.toFixed(2) : ''
  );

  const parsedCashReceived = Number(cashReceived);
  const hasValidAmount = useMemo(() => (
    cashReceived.trim() !== ''
      && Number.isFinite(parsedCashReceived)
      && parsedCashReceived > 0
  ), [cashReceived, parsedCashReceived]);
  const changeDue = hasValidAmount ? parsedCashReceived - totalAmount : 0;
  const isUnderpaid = hasValidAmount && changeDue < -0.001;
  const canConfirm = hasValidAmount && !isUnderpaid && !isBusy;

  function handleConfirm() {
    if (!canConfirm) {
      return;
    }

    onConfirm(parsedCashReceived.toFixed(2));
  }

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="cash-confirmation-title"
      panelClassName="w-full max-w-115 rounded-3xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.24)] p-6"
    >
      <div className="text-center">
        <h3 id="cash-confirmation-title" className="m-0 text-2xl font-black text-brand-dark tracking-tight">
          Cash received
        </h3>
        <p className="mt-2 mb-6 text-sm font-semibold text-brand-subtext">
          Enter the customer's cash amount. TouB POS will calculate the change and the backend will verify it.
        </p>

        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-4 text-left space-y-3">
          <div className="flex items-center justify-between text-sm font-bold text-gray-500 mb-2">
            <span>Order total</span>
            <div className="text-right">
              <span className="text-xl text-gray-900">{money(totalAmount)}</span>
              <span className="block text-xs text-gray-400">{Math.round(totalAmount * 4000).toLocaleString()} ៛</span>
            </div>
          </div>

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
                  value={cashReceived}
                  disabled={isBusy}
                  onChange={(event) => setCashReceived(event.target.value)}
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
                  value={cashReceived === '' || isNaN(parsedCashReceived) ? '' : Math.round(parsedCashReceived * 4000)}
                  disabled={isBusy}
                  onChange={(event) => {
                    const val = event.target.value;
                    if (val === '') {
                      setCashReceived('');
                    } else {
                      const usd = parseFloat(val) / 4000;
                      setCashReceived(usd.toString());
                    }
                  }}
                />
                <span className="text-xl font-bold text-gray-400 ml-1">៛</span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white border border-gray-100 px-4 py-3">
            <span className="text-sm font-bold text-gray-500">Change due</span>
            <div className="text-right">
              <span className={`block text-2xl font-black ${isUnderpaid ? 'text-state-danger' : 'text-state-success'}`}>
                {money(Math.max(changeDue, 0))}
              </span>
              <span className={`block text-sm font-bold mt-0.5 ${isUnderpaid ? 'text-state-danger/70' : 'text-gray-400'}`}>
                {Math.round(Math.max(changeDue, 0) * 4000).toLocaleString()} ៛
              </span>
            </div>
          </div>
        </div>

        {isUnderpaid ? (
          <p className="mt-0 mb-4 text-sm font-bold text-state-danger">
            Cash received must be at least {money(totalAmount)}.
          </p>
        ) : null}

        {error ? (
          <p className="mt-0 mb-4 text-sm font-bold text-state-danger">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          <button
            className="flex-1 h-13 rounded-xl border-0 bg-state-danger text-white font-bold cursor-pointer hover:bg-state-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 h-13 rounded-xl border-0 bg-state-success text-white font-bold cursor-pointer hover:bg-state-success/90 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {isBusy ? 'Processing...' : 'Confirm paid'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
