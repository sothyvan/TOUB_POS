import Icon from '../ui/Icon';

export default function StaffAllocation({ users = [], stalls = [] }) {
  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex gap-3.5 shrink-0">
        {[
          { icon: 'users', bg: '#eef2ff', val: users.length, label: 'Total Staff' },
          { icon: 'location', bg: '#e0f2fe', val: stalls.length, label: 'Backend Stalls' },
          { icon: 'clock', bg: '#dcfce7', val: 'TODO', label: 'Shift Scheduling' },
        ].map(card => (
          <div key={card.label} className="flex items-center gap-3.5 bg-white rounded-2xl flex-1" style={{ padding: '18px 20px' }}>
            <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center shrink-0" style={{ background: card.bg }}>
              <Icon name={card.icon} className="w-5 h-5" style={{ color: '#374151' }} strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827', fontFamily: 'Inter,sans-serif', lineHeight: 1.1 }}>{card.val}</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter,sans-serif' }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-[#e5e7eb] flex flex-col items-center justify-center text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-[#eef2ff] flex items-center justify-center mb-4">
          <Icon name="clock" className="w-7 h-7 text-[#003ec7]" strokeWidth={1.8} />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#111827', fontFamily: 'Inter,sans-serif' }}>
          Shift allocation is not database-backed yet
        </h3>
        <p style={{ margin: 0, maxWidth: 520, fontSize: 13, color: '#6b7280', fontFamily: 'Inter,sans-serif', lineHeight: 1.6 }}>
          Phase 3 now stores stall staff assignments in MySQL. Use the Stall Management tab to assign cashiers to stalls.
          This shift-scheduling matrix is paused until a future backend table/API exists for shifts.
        </p>
      </div>
    </div>
  );
}
