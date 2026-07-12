import Icon from './Icon';

export default function EmptyState({
  action,
  className = '',
  iconName = 'orders',
  message,
  title = 'Nothing here yet',
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-ui-border bg-ui-surface/60 px-6 py-10 text-center ${className}`}>
      <div className="grid h-12 w-12 place-items-center rounded-lg border border-brand-action/25 bg-brand-action/8 text-brand-action">
        <Icon name={iconName} className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div>
        <p className="m-0 text-sm font-bold text-text-strong">{title}</p>
        {message ? (
          <p className="mx-auto mt-1 max-w-sm text-xs font-semibold leading-relaxed text-text-muted">
            {message}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
