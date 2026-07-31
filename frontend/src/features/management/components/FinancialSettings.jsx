import { useState } from 'react';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import FormInput from '../../../components/ui/FormInput';

export default function FinancialSettings({ settings, loading, error, onSave }) {
  const [rate, setRate] = useState(settings?.exchangeRateKhrPerUsd ?? 4100);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaveError('');
    setSaved(false);
    try {
      setSaving(true);
      await onSave(Number(rate));
      setSaved(true);
    } catch (err) {
      setSaveError(err.message || 'Unable to update the exchange rate.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-lg border border-ui-border bg-ui-surface p-6">
      <h2 className="m-0 text-xl font-bold text-text-strong">Currency and cash settlement</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-soft">
        This business rate synchronizes product USD/KHR prices and is snapshotted on every new order for mixed-cash settlement. Existing product prices and historical orders are not rewritten when the rate changes.
      </p>

      {error ? <Alert variant="danger" className="mt-4">{error}</Alert> : null}
      {saveError ? <Alert variant="danger" className="mt-4">{saveError}</Alert> : null}
      {saved ? <Alert variant="success" className="mt-4">Exchange rate updated.</Alert> : null}

      <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
        <FormInput
          label="KHR for 1 USD"
          type="number"
          min="1000"
          max="10000"
          step="100"
          value={rate}
          disabled={loading || saving}
          onChange={(event) => setRate(event.target.value)}
          required
        />
        <p className="m-0 text-xs text-text-muted">
          Allowed range: 1,000–10,000 KHR, in increments of 100. Editing either price in the product editor generates the other using the currently saved rate.
        </p>
        <div>
          <Button type="submit" loading={saving} disabled={loading || saving}>
            Save exchange rate
          </Button>
        </div>
      </form>
    </section>
  );
}
