import Icon from './Icon';

export default function EmptyState({
  action,
  className = '',
  iconName = 'orders',
  message,
  title = 'Nothing here yet',
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white/60 px-6 py-10 text-center ${className}`}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-action/10 text-brand-action">
        <Icon name={iconName} className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <div>
        <p className="m-0 text-sm font-extrabold text-text-strong">{title}</p>
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
