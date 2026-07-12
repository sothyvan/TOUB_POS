const variantClasses = {
  info: {
    dot: 'bg-brand-action',
    panel: 'border-brand-action/30 bg-brand-action/8 text-brand-text',
    title: 'text-brand-action',
  },
  success: {
    dot: 'bg-state-success',
    panel: 'border-state-success/30 bg-state-success/8 text-brand-text',
    title: 'text-state-success',
  },
  warning: {
    dot: 'bg-amber-500',
    panel: 'border-state-warning/30 bg-state-warning/8 text-brand-text',
    title: 'text-state-warning',
  },
  danger: {
    dot: 'bg-state-danger',
    panel: 'border-state-danger/30 bg-state-danger/8 text-brand-text',
    title: 'text-state-danger',
  },
};

export default function Alert({
  actions,
  children,
  className = '',
  title,
  variant = 'info',
}) {
  const styles = variantClasses[variant] || variantClasses.info;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium leading-relaxed ${styles.panel} ${className}`}
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-sm ${styles.dot}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className={`m-0 text-sm font-extrabold ${styles.title}`}>{title}</p>
        ) : null}
        {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
