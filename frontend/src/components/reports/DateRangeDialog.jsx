import { useState } from 'react';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import ModalShell from '../ui/ModalShell';

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DateRangeDialog({
  initialEndDate,
  initialStartDate,
  isOpen,
  onApply,
  onClose,
}) {
  const today = localDateValue();
  const [startDate, setStartDate] = useState(initialStartDate || today);
  const [endDate, setEndDate] = useState(initialEndDate || today);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!startDate || !endDate) {
      setError('Choose both a start date and an end date.');
      return;
    }

    if (startDate > endDate) {
      setError('The start date cannot be after the end date.');
      return;
    }

    if (endDate > today) {
      setError('Reports cannot include future dates.');
      return;
    }

    onApply({ startDate, endDate });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onBackdropClick={onClose}
      labelledBy="report-date-range-title"
      showCloseButton
      size="md"
    >
      <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl bg-white">
        <div className="border-b border-brand-border px-6 py-5 pr-16">
          <p className="m-0 text-xs font-extrabold uppercase tracking-wider text-brand-action">
            Sales report
          </p>
          <h2 id="report-date-range-title" className="m-0 mt-1 text-xl font-extrabold text-brand-text">
            Choose a date range
          </h2>
          <p className="m-0 mt-1 text-sm font-medium text-gray-500">
            Select the first and last day to include. Use the same date for a one-day report.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <FormInput
            id="report-start-date"
            type="date"
            label="Start date"
            max={today}
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setError('');
            }}
            required
            requiredLabel
          />
          <FormInput
            id="report-end-date"
            type="date"
            label="End date"
            min={startDate || undefined}
            max={today}
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setError('');
            }}
            required
            requiredLabel
          />

          {error ? (
            <Alert variant="danger" className="sm:col-span-2">
              {error}
            </Alert>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-brand-border bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Apply date range</Button>
        </div>
      </form>
    </ModalShell>
  );
}
