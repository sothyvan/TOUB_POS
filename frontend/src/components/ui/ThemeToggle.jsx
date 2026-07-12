import Icon from './Icon';
import useTheme from '../../theme/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border border-brand-border bg-ui-surface text-text-soft transition-colors hover:border-brand-action/50 hover:bg-ui-muted hover:text-brand-action ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon name={isDark ? 'sun' : 'moon'} className="h-4.5 w-4.5" strokeWidth={2} />
    </button>
  );
}
