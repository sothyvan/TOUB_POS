const healthPresentations = {
  healthy: { label: 'Healthy', tone: 'success' },
  warning: { label: 'Needs attention', tone: 'warning' },
  critical: { label: 'Needs immediate attention', tone: 'danger' },
};

export function getTelegramHealthPresentation(health) {
  return healthPresentations[health] || { label: 'Status unavailable', tone: 'neutral' };
}

export function formatTelegramDuration(value) {
  if (value === null || value === undefined || value === '') {
    return 'No samples';
  }
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return 'No samples';
  }
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  return `${(milliseconds / 1000).toFixed(2).replace(/\.00$/, '')}s`;
}

function formatSeconds(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function getTelegramJobTiming(job, now = new Date()) {
  if (job?.status === 'retry' && job.next_attempt_at) {
    const retryAt = new Date(job.next_attempt_at).getTime();
    const nowMs = new Date(now).getTime();
    if (Number.isFinite(retryAt) && Number.isFinite(nowMs)) {
      return `Automatic retry in ${formatSeconds(Math.ceil((retryAt - nowMs) / 1000))}`;
    }
  }
  if (job?.is_stale) {
    return `Stale for ${formatSeconds(job.age_seconds)}`;
  }
  return `Queued ${formatSeconds(job?.age_seconds)} ago`;
}
