import { useState } from 'react';
import Alert from '../../../../components/ui/Alert';
import Button from '../../../../components/ui/Button';
import Icon from '../../../../components/ui/Icon';
import { useTelegramOperations } from '../../../../hooks/useTelegramOperations';
import {
  formatTelegramDuration,
  getTelegramHealthPresentation,
  getTelegramJobTiming,
} from '../../../../utils/telegramOperations';

const healthClasses = {
  success: 'border-state-success/30 bg-state-success/8 text-state-success',
  warning: 'border-state-warning/30 bg-state-warning/8 text-state-warning',
  danger: 'border-state-danger/30 bg-state-danger/8 text-state-danger',
  neutral: 'border-ui-border bg-ui-muted text-text-soft',
};

function Metric({ label, value, tone = 'text-brand-text' }) {
  return (
    <div className="rounded-lg border border-ui-border bg-ui-surface px-3 py-3">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-text-soft">{label}</span>
      <span className={`mt-1 block text-2xl font-black ${tone}`}>{value}</span>
    </div>
  );
}

export default function TelegramOperationsPanel({ onRetryTelegramDispatch }) {
  const { snapshot, loading, error, refresh } = useTelegramOperations();
  const [retryingOrderId, setRetryingOrderId] = useState(null);
  const [retryError, setRetryError] = useState('');
  const presentation = getTelegramHealthPresentation(snapshot?.health);
  const queued = Number(snapshot?.status_counts?.pending || 0)
    + Number(snapshot?.status_counts?.processing || 0);
  const stale = Number(snapshot?.alerts?.stale_pending || 0)
    + Number(snapshot?.alerts?.stale_processing || 0);
  const latencyWindowHours = Number(snapshot?.thresholds?.latency_window_hours || 24);
  const deliveryTargetMs = Number(snapshot?.thresholds?.delivery_target_ms || 2000);

  const handleRetry = async (orderId) => {
    if (!onRetryTelegramDispatch || retryingOrderId) return;
    setRetryingOrderId(orderId);
    setRetryError('');
    try {
      await onRetryTelegramDispatch(orderId);
      await refresh(false);
    } catch (retryFailure) {
      setRetryError(retryFailure.message || 'Unable to retry this Telegram delivery.');
    } finally {
      setRetryingOrderId(null);
    }
  };

  return (
    <section className="w-full rounded-xl border border-ui-border bg-ui-surface p-5 shadow-sm" aria-labelledby="telegram-operations-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="telegram" className="h-5 w-5 text-brand-action" />
            <h2 id="telegram-operations-title" className="m-0 text-lg font-extrabold text-text-strong">
              Kitchen delivery health
            </h2>
          </div>
          <p className="m-0 mt-1 text-xs text-text-soft">
            Current Telegram outbox state and delivery speed across your stalls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            role={snapshot?.health === 'critical' ? 'alert' : 'status'}
            className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${healthClasses[presentation.tone]}`}
          >
            {loading && !snapshot ? 'Loading health…' : presentation.label}
          </span>
          <Button
            size="compact"
            variant="secondary"
            iconName="refresh"
            loading={loading}
            onClick={() => refresh(true)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert className="mt-4" variant="warning" title="Monitoring unavailable">
          {error}
        </Alert>
      ) : null}
      {retryError ? (
        <Alert className="mt-4" variant="danger" title="Retry failed">
          {retryError}
        </Alert>
      ) : null}

      <div className="mt-4 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        <Metric label="Queued" value={queued} />
        <Metric label="Retrying" value={snapshot?.alerts?.retrying || 0} tone="text-state-warning" />
        <Metric label="Failed" value={snapshot?.alerts?.failed || 0} tone="text-state-danger" />
        <Metric label="Stale" value={stale} tone={stale > 0 ? 'text-state-danger' : 'text-state-success'} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 max-[680px]:grid-cols-1">
        <div className="rounded-lg border border-ui-border bg-ui-muted px-4 py-3">
          <span className="text-xs font-bold text-text-soft">
            {latencyWindowHours}h average delivery
          </span>
          <strong className="mt-1 block text-lg text-text-strong">
            {formatTelegramDuration(snapshot?.latency?.average_ms)}
          </strong>
        </div>
        <div className="rounded-lg border border-ui-border bg-ui-muted px-4 py-3">
          <span className="text-xs font-bold text-text-soft">
            {latencyWindowHours}h p95 · target ≤ {formatTelegramDuration(deliveryTargetMs)}
          </span>
          <strong className="mt-1 block text-lg text-text-strong">
            {formatTelegramDuration(snapshot?.latency?.p95_ms)}
          </strong>
        </div>
      </div>

      {(snapshot?.actionable_jobs || []).length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-ui-border">
          <div className="border-b border-ui-border bg-ui-muted px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-text-soft">
            Needs attention
          </div>
          <div className="divide-y divide-ui-border">
            {snapshot.actionable_jobs.slice(0, 5).map((job) => (
              <div key={`${job.order_id}-${job.status}`} className="flex items-center justify-between gap-4 px-4 py-3 max-[680px]:items-start">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-extrabold text-text-strong">
                    {job.order_no} · {job.stall_name}
                  </p>
                  <p className="m-0 mt-1 text-xs text-text-soft">{job.failure_summary}</p>
                  <p className="m-0 mt-1 text-[11px] font-semibold text-text-soft">
                    {getTelegramJobTiming(job)} · {job.attempt_count} attempt{job.attempt_count === 1 ? '' : 's'}
                  </p>
                </div>
                {job.can_retry && onRetryTelegramDispatch ? (
                  <Button
                    size="compact"
                    variant="warning"
                    loading={retryingOrderId === job.order_id}
                    disabled={Boolean(retryingOrderId)}
                    onClick={() => handleRetry(job.order_id)}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && !error ? (
          <p className="m-0 mt-4 rounded-lg bg-state-success/8 px-4 py-3 text-sm font-semibold text-state-success" role="status">
            No Telegram deliveries currently need attention.
          </p>
        ) : null
      )}
    </section>
  );
}
