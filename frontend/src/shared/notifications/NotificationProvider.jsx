import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon';
import NotificationContext from './notification-context';
import { appendNotification, createNotification } from './notification-policy';

const variantClasses = {
  success: 'border-state-success/35 bg-ui-elevated text-state-success',
  info: 'border-brand-action/35 bg-ui-elevated text-brand-action',
  warning: 'border-state-warning/35 bg-ui-elevated text-state-warning',
  danger: 'border-state-danger/35 bg-ui-elevated text-state-danger',
};

const variantIcons = {
  success: 'check',
  info: 'warning',
  warning: 'warning',
  danger: 'warning',
};

function NotificationItem({ notification, onDismiss }) {
  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-[0_14px_36px_rgba(0,0,0,0.2)] ${variantClasses[notification.variant]}`}
      role={notification.variant === 'danger' || notification.variant === 'warning' ? 'alert' : 'status'}
    >
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-current/10">
        <Icon name={variantIcons[notification.variant]} className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 text-text-strong">
        {notification.title ? (
          <p className="m-0 text-sm font-extrabold">{notification.title}</p>
        ) : null}
        <p className={`${notification.title ? 'mt-1' : 'm-0'} break-words text-sm font-medium leading-relaxed`}>
          {notification.message}
        </p>
      </div>
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-text-muted hover:bg-ui-muted hover:text-text-strong"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        <Icon name="close" className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());
  const counterRef = useRef(0);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((input) => {
    counterRef.current += 1;
    const id = `notice-${counterRef.current}`;
    const notification = createNotification(input, id);
    if (!notification.message) return null;

    setNotifications((current) => appendNotification(current, notification));
    if (notification.duration > 0) {
      const timer = window.setTimeout(() => dismiss(id), notification.duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({
    dismiss,
    notify,
    success: (message, title = 'Saved') => notify({ variant: 'success', title, message }),
    info: (message, title = '') => notify({ variant: 'info', title, message }),
    warning: (message, title = 'Needs attention') => notify({ variant: 'warning', title, message }),
    error: (message, title = 'Action failed') => notify({ variant: 'danger', title, message, duration: 6500 }),
  }), [dismiss, notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed left-1/2 top-3 z-[100] flex w-[calc(100vw-1.5rem)] max-w-[420px] -translate-x-1/2 flex-col gap-2 sm:top-4 sm:w-[min(420px,calc(100vw-2rem))]"
        aria-label="Notifications"
        aria-live="polite"
      >
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
