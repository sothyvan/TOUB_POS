import { useState, useRef } from 'react';
import Icon from './ui/Icon';
import { initials } from '../utils/format';

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_STALLS = [
  { id: 'stall-1', name: 'Stall 1', location: 'BKK1',           online: true  },
  { id: 'stall-2', name: 'Stall 2', location: 'Russian Market',  online: true  },
  { id: 'stall-3', name: 'Stall 3', location: 'Toul Tom Poung',  online: false },
];

const AVATAR_COLORS = ['#eef2ff','#dcfce7','#f3e8ff','#fff1f2','#fef3c7','#e0f2fe'];
const AVATAR_TEXT   = ['#3730a3','#166534','#7e22ce','#be123c','#92400e','#075985'];

function avatarStyle(idx) {
  const i = idx % AVATAR_COLORS.length;
  return { background: AVATAR_COLORS[i], color: AVATAR_TEXT[i] };
}

function getStalls() {
  try { return JSON.parse(localStorage.getItem('toub_stalls')) || SEED_STALLS; } catch { return SEED_STALLS; }
}
function saveStalls(s)      { localStorage.setItem('toub_stalls', JSON.stringify(s)); }
function getAssignments()   {
  try { return JSON.parse(localStorage.getItem('toub_stall_assignments')) || { 'stall-1': ['user-cashier'] }; } catch { return {}; }
}
function saveAssignments(a) { localStorage.setItem('toub_stall_assignments', JSON.stringify(a)); }

// ── Add Stall modal ───────────────────────────────────────────────────────────
function AddStallModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', location: '' });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) return;
    onAdd({ id: `stall-${Date.now()}`, name: form.name.trim(), location: form.location.trim(), online: true });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
          Add New Location
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif' }}>Stall Name</label>
            <input type="text" required placeholder="Stall 4" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#e5e7eb] px-3 py-2 outline-none"
              style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif' }}>Location</label>
            <input type="text" required placeholder="Diamond Island" value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#e5e7eb] px-3 py-2 outline-none"
              style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-[#e5e7eb] py-2 cursor-pointer hover:bg-gray-50"
              style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter, sans-serif', background: 'white' }}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 rounded-lg py-2 cursor-pointer hover:opacity-90 border-0"
              style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#003ec7', fontFamily: 'Inter, sans-serif' }}>
              Add Stall
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Draggable staff pill (pool) ───────────────────────────────────────────────
function DraggablePill({ user, idx, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('userId', user.id);
        e.dataTransfer.setData('source', 'pool');
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.();
      }}
      className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 border border-[#f3f4f6] select-none"
      style={{
        background: '#ffffff',
        cursor: 'grab',
        transition: 'box-shadow 0.15s, opacity 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Drag handle dots */}
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
        <circle cx="3" cy="4"  r="1.5" fill="#374151" />
        <circle cx="7" cy="4"  r="1.5" fill="#374151" />
        <circle cx="3" cy="8"  r="1.5" fill="#374151" />
        <circle cx="7" cy="8"  r="1.5" fill="#374151" />
        <circle cx="3" cy="12" r="1.5" fill="#374151" />
        <circle cx="7" cy="12" r="1.5" fill="#374151" />
      </svg>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
        style={avatarStyle(idx)}>
        {initials(user.name)}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
          {user.name}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
          {user.role}
        </p>
      </div>
    </div>
  );
}

// ── Draggable roster card (assigned) ─────────────────────────────────────────
function RosterCard({ user, idx, onUnassign }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('userId', user.id);
        e.dataTransfer.setData('source', 'roster');
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="flex flex-col items-center rounded-2xl border border-[#f3f4f6] p-4 gap-2 select-none"
      style={{ background: '#ffffff', cursor: 'grab' }}
    >
      <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-sm font-black"
        style={avatarStyle(idx)}>
        {initials(user.name)}
      </div>
      <div className="text-center">
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif' }}>{user.name}</p>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>{user.role}</p>
      </div>
      <button type="button" onClick={() => onUnassign(user.id)}
        className="px-4 py-1 rounded-full cursor-pointer hover:opacity-80 active:scale-95 border-0"
        style={{ background: '#fff1f2', fontSize: 12, fontWeight: 600, color: '#dc2626', fontFamily: 'Inter, sans-serif' }}>
        Unassign
      </button>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ onDrop, isDragOver, setIsDragOver }) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(e.dataTransfer.getData('userId')); }}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200"
      style={{
        minHeight: 128,
        border: isDragOver ? '2px solid #003ec7' : '2px dashed #e5e7eb',
        background: isDragOver ? '#eef2ff' : '#fafafa',
        padding: '28px 16px',
      }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: isDragOver ? '#c7d2fe' : '#f3f4f6' }}>
        <Icon name="userPlus" className="w-[18px] h-[18px]"
          style={{ color: isDragOver ? '#4f46e5' : '#9ca3af' }} strokeWidth={1.8} />
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
        color: isDragOver ? '#4f46e5' : '#9ca3af', textAlign: 'center' }}>
        {isDragOver ? 'Release to assign' : 'Drag staff here to assign to this stall'}
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StallAdmin({ users = [] }) {
  const [stalls, setStalls]             = useState(getStalls);
  const [assignments, setAssignments]   = useState(getAssignments);
  const [selectedStallId, setSelectedStallId] = useState(() => getStalls()[0]?.id ?? null);
  const [staffSearch, setStaffSearch]   = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDropZoneOver, setIsDropZoneOver] = useState(false);
  // For unassign-by-drag-back: highlight pool as drop zone when dragging from roster
  const [isDraggingFromRoster, setIsDraggingFromRoster] = useState(false);
  const [isPoolOver, setIsPoolOver] = useState(false);

  const selectedStall  = stalls.find(s => s.id === selectedStallId) ?? null;
  const assignedIds    = assignments[selectedStallId] ?? [];
  const assignedUsers  = users.filter(u => assignedIds.includes(u.id));
  const poolUsers      = users.filter(u =>
    !assignedIds.includes(u.id) &&
    u.name.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const updateAssignments = (next) => { setAssignments(next); saveAssignments(next); };

  const handleAssign = (userId) => {
    if (!selectedStallId || assignedIds.includes(userId)) return;
    updateAssignments({ ...assignments, [selectedStallId]: [...assignedIds, userId] });
  };

  const handleUnassign = (userId) => {
    updateAssignments({ ...assignments, [selectedStallId]: assignedIds.filter(id => id !== userId) });
  };

  const handleAddStall = (stall) => {
    const next = [...stalls, stall];
    setStalls(next); saveStalls(next);
    setSelectedStallId(stall.id);
  };

  // Pool drop: unassign from current stall (drag back from roster)
  const handlePoolDrop = (e) => {
    e.preventDefault();
    setIsPoolOver(false);
    const userId = e.dataTransfer.getData('userId');
    const source = e.dataTransfer.getData('source');
    if (source === 'roster') handleUnassign(userId);
  };

  return (
    <div
      className="flex gap-4 h-full min-h-0 overflow-hidden"
      // Global drag-end cleanup
      onDragEnd={() => { setIsDraggingFromRoster(false); setIsDropZoneOver(false); setIsPoolOver(false); }}
    >
      {/* ── Col 1: Stall selector ──────────────────────────────────────────── */}
      <div className="flex flex-col bg-white rounded-2xl overflow-hidden" style={{ width: 280, minWidth: 240, flexShrink: 0 }}>
        <div className="flex flex-col gap-1 px-5 pt-5 pb-3.5 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
              <Icon name="location" className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} strokeWidth={2} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              Active Locations
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif', margin: 0, paddingLeft: 36 }}>
            {stalls.length} stalls configured
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {stalls.map((stall) => {
            const isActive = stall.id === selectedStallId;
            const count    = (assignments[stall.id] ?? []).length;
            return (
              <button key={stall.id} type="button" onClick={() => setSelectedStallId(stall.id)}
                className="w-full flex items-center gap-3 cursor-pointer transition-all duration-150 border-0 text-left"
                style={{ padding: '14px 18px', background: isActive ? '#f0f7ff' : 'transparent', borderBottom: '1px solid #f9fafb' }}>
                <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: isActive ? '#dbeafe' : '#f3f4f6' }}>
                  <Icon name="location" className="w-4 h-4" style={{ color: isActive ? '#2563eb' : '#9ca3af' }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isActive ? '#1d4ed8' : '#374151', fontFamily: 'Inter, sans-serif' }}>
                    {stall.name} — {stall.location}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: stall.online ? '#22c55e' : '#d1d5db' }} />
                    <span style={{ fontSize: 11, color: stall.online ? '#16a34a' : '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
                      {stall.online ? 'Online' : 'Offline'}
                    </span>
                    <span style={{ fontSize: 11, color: '#d1d5db' }}>·</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>{count} staff</span>
                  </div>
                </div>
                <Icon name="arrowRight" className="w-[15px] h-[15px] shrink-0"
                  style={{ color: isActive ? '#93c5fd' : '#d1d5db' }} strokeWidth={2} />
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3.5 bg-[#fafafa] border-t border-[#f3f4f6]">
          <button type="button" onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-[9px] cursor-pointer hover:opacity-90 active:scale-[0.98] border-0"
            style={{ height: 39, background: '#5855ea' }}>
            <Icon name="plus" className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>Add Location</span>
          </button>
        </div>
      </div>

      {/* ── Col 2: Assigned roster + drop zone ─────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              {selectedStall ? `Roster: ${selectedStall.name} — ${selectedStall.location}` : 'Select a stall'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              {assignedUsers.length} staff assigned · drag from pool to assign
            </p>
          </div>
          {selectedStall && (
            <div className="px-3 py-1 rounded-full shrink-0" style={{ background: '#dbeafe' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', fontFamily: 'Inter, sans-serif' }}>
                {assignedUsers.length} / 12
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {/* Roster cards */}
          {assignedUsers.length > 0 && (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))' }}>
              {assignedUsers.map((user, idx) => (
                <RosterCard
                  key={user.id}
                  user={user}
                  idx={idx}
                  onUnassign={handleUnassign}
                />
              ))}
            </div>
          )}

          {/* Drop zone — always visible when a stall is selected */}
          {selectedStall && (
            <DropZone
              onDrop={handleAssign}
              isDragOver={isDropZoneOver}
              setIsDragOver={setIsDropZoneOver}
            />
          )}
        </div>
      </div>

      {/* ── Col 3: Staff pool (draggable) ──────────────────────────────────── */}
      <div
        className="flex flex-col bg-white rounded-2xl overflow-hidden"
        style={{ width: 280, minWidth: 240, flexShrink: 0 }}
        onDragOver={(e) => {
          const source = e.dataTransfer.types.includes('text/plain') ? null : null;
          e.preventDefault();
          setIsPoolOver(true);
        }}
        onDragLeave={() => setIsPoolOver(false)}
        onDrop={handlePoolDrop}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3.5 border-b border-[#f3f4f6]"
          style={{ background: isPoolOver ? '#f0fdf4' : 'white', transition: 'background 0.15s' }}>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              Employee Pool
            </span>
            <div className="px-2.5 py-0.5 rounded-full" style={{ background: '#eef2ff' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#003ec7', fontFamily: 'Inter, sans-serif' }}>
                {poolUsers.length}
              </span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
            {isPoolOver ? '↩ Drop here to unassign' : 'Drag a card to assign to the selected stall'}
          </p>
        </div>

        {/* Search */}
        <div className="px-3.5 py-3 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2 rounded-[9px] px-3 py-2" style={{ background: '#f8fafc' }}>
            <Icon name="search" className="w-3.5 h-3.5 text-[#9ca3af]" strokeWidth={2} />
            <input
              type="text" placeholder="Search staff..."
              value={staffSearch}
              onChange={e => setStaffSearch(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none"
              style={{ fontSize: 13, color: '#374151', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>

        {/* Draggable pills */}
        <div className="flex-1 overflow-y-auto p-3">
          {poolUsers.length === 0 ? (
            <p className="text-center py-8" style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              {staffSearch ? 'No results' : 'All staff are assigned'}
            </p>
          ) : (
            <>
              <p className="px-1 pb-2" style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                Available
              </p>
              <div className="flex flex-col gap-2">
                {poolUsers.map((user, idx) => (
                  <DraggablePill
                    key={user.id}
                    user={user}
                    idx={idx}
                    onDragStart={() => setIsDraggingFromRoster(false)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddStallModal onClose={() => setShowAddModal(false)} onAdd={handleAddStall} />
      )}
    </div>
  );
}
