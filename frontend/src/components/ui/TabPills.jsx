/**
 * Reusable Tab switcher pills with the standard POS owner styling.
 *
 * Props:
 *  - tabs     – Array of { id, label }
 *  - activeId – ID of the active tab
 *  - onChange – Callback when a tab is selected: (id) => void
 *  - className - Extra class name for the wrapper
 */
export default function TabPills({ tabs, activeId, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 rounded-lg border border-ui-border bg-ui-bg p-1 shrink-0 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`cursor-pointer rounded-md border px-4.5 py-1.5 text-[13px] transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-action/20 ${
            activeId === tab.id
              ? 'border-brand-action/50 bg-brand-action/10 text-brand-action font-semibold'
              : 'border-transparent bg-transparent text-text-soft hover:bg-ui-muted hover:text-brand-text font-medium'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
