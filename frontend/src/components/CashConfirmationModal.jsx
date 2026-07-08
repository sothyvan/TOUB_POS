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
          <div className="flex items-center justify-between text-sm font-bold text-gray-500">
            <span>Order total</span>
            <span className="text-xl text-gray-900">{money(totalAmount)}</span>
          </div>

          <label className="block">
            <span className="block mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
              Cash received (USD)
            </span>
            <input
              className="w-full h-13 rounded-xl border border-gray-200 bg-white px-4 text-2xl font-black text-gray-900 outline-none focus:border-brand-action focus:ring-4 focus:ring-brand-action/10 disabled:opacity-60"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cashReceived}
              disabled={isBusy}
              onChange={(event) => setCashReceived(event.target.value)}
              autoFocus
            />
          </label>

          <div className="flex items-center justify-between rounded-xl bg-white border border-gray-100 px-4 py-3">
            <span className="text-sm font-bold text-gray-500">Change due</span>
            <span className={`text-2xl font-black ${isUnderpaid ? 'text-state-danger' : 'text-state-success'}`}>
              {money(Math.max(changeDue, 0))}
            </span>
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
