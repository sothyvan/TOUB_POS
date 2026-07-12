import Icon from '../../../components/ui/Icon';
import EmptyState from '../../../components/ui/EmptyState';

export default function StaffAllocation({ users = [], stalls = [] }) {
  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="grid grid-cols-2 gap-3.5 shrink-0 max-[640px]:grid-cols-1">
        {[
          { icon: 'users', bg: '#eef2ff', val: users.length, label: 'Total Staff' },
          { icon: 'location', bg: '#e0f2fe', val: stalls.length, label: 'Backend Stalls' },
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

      <div className="flex-1 bg-white rounded-2xl border border-[#e5e7eb] flex items-center justify-center p-6">
        <EmptyState
          iconName="clock"
          title="Shift scheduling is coming later"
          message="Cashier-to-stall assignments are ready in Stall Management. Shift calendars are outside the current project scope."
          className="max-w-xl"
        />
      </div>
    </div>
  );
}
