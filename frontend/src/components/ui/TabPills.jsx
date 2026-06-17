/**
 * Reusable Tab switcher pills with the standard POS admin styling.
 *
 * Props:
 *  - tabs     – Array of { id, label }
 *  - activeId – ID of the active tab
 *  - onChange – Callback when a tab is selected: (id) => void
 *  - className - Extra class name for the wrapper
 */
export default function TabPills({ tabs, activeId, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl shrink-0 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className="cursor-pointer transition-all duration-150 active:scale-95 border-0 outline-none"
          style={{
            padding: '6px 18px',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: activeId === tab.id ? 600 : 500,
            fontFamily: 'Inter, sans-serif',
            background: activeId === tab.id ? '#ffffff' : 'transparent',
            color: activeId === tab.id ? '#003ec7' : '#6b7280',
            boxShadow: activeId === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
