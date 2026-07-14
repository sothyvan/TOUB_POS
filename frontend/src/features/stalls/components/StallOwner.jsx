import { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from '../../../components/ui/Icon';
import { initials } from '../../../utils/format';
import { roleToApiRole } from '../../../utils/permissions';
import { api } from '../../../services/api';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import FormInput from '../../../components/ui/FormInput';
import ModalShell from '../../../components/ui/ModalShell';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';

// ── Seed data ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#eef2ff','#dcfce7','#f3e8ff','#fff1f2','#fef3c7','#e0f2fe'];
const AVATAR_TEXT   = ['#3730a3','#166534','#7e22ce','#be123c','#92400e','#075985'];

function avatarStyle(idx) {
  const i = idx % AVATAR_COLORS.length;
  return { background: AVATAR_COLORS[i], color: AVATAR_TEXT[i] };
}

// ── Add Stall modal ───────────────────────────────────────────────────────────
function AddStallModal({ onClose, onAdd, error }) {
  const [form, setForm] = useState({ name: '' });
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const saved = await onAdd({ name: form.name.trim() });
      if (saved) onClose();
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
          Add New Location
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <Alert variant="danger">{error}</Alert>}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'Inter, sans-serif' }}>Stall Name</label>
            <input type="text" required placeholder="Stall 4" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[#e5e7eb] px-3 py-2 outline-none"
              style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-[#e5e7eb] py-2 cursor-pointer hover:bg-gray-50"
              style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter, sans-serif', background: 'white' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              className="flex-1 rounded-lg py-2 cursor-pointer hover:opacity-90 border-0 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#003ec7', fontFamily: 'Inter, sans-serif' }}>
              {isSaving ? 'Adding...' : 'Add Stall'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Draggable staff pill (pool) ───────────────────────────────────────────────
function PoolPill({ user, idx, assignedStall, selectedStallId, onDragStart, onClick }) {
  const isAssigned = !!assignedStall;
  const isThisStall = isAssigned && assignedStall.id === selectedStallId;

  return (
    <div
      draggable={!isThisStall}
      onDragStart={(e) => {
        if (isThisStall) return;
        e.dataTransfer.setData('userId', user.id);
        e.dataTransfer.setData('source', 'pool');
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.();
      }}
      onClick={() => {
        if (!isThisStall) onClick?.();
      }}
      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 border border-[#f3f4f6] select-none transition-all duration-150 ${
        isThisStall ? 'opacity-40 cursor-not-allowed bg-white/50' : 'cursor-grab bg-white hover:shadow-md'
      }`}
    >
      {!isThisStall && (
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
          <circle cx="3" cy="4"  r="1.5" fill="#374151" />
          <circle cx="7" cy="4"  r="1.5" fill="#374151" />
          <circle cx="3" cy="8"  r="1.5" fill="#374151" />
          <circle cx="7" cy="8"  r="1.5" fill="#374151" />
          <circle cx="3" cy="12" r="1.5" fill="#374151" />
          <circle cx="7" cy="12" r="1.5" fill="#374151" />
        </svg>
      )}
      {isThisStall && (
        <div className="w-[10px] shrink-0" />
      )}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
        style={avatarStyle(idx)}>
        {initials(user.name)}
      </div>
      <div className="min-w-0 flex-1" title={user.name}>
        <p className="truncate" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
          {user.name}
        </p>
        <p className="truncate" style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
          {user.role}
        </p>
      </div>

      {isAssigned && (
        <div 
          title={isThisStall ? 'This stall' : assignedStall.name}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 max-w-[90px] truncate ${
            isThisStall ? 'bg-[#eff6ff] text-[#1e40af]' : 'bg-[#f3f4f6] text-[#4b5563]'
          }`}
        >
          {isThisStall ? 'This stall' : assignedStall.name}
        </div>
      )}
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
      className="hidden xl:flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200"
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

function ManageStaffDialog({
  cashiers,
  error,
  isOpen,
  onAssign,
  onClose,
  onRemove,
  pendingUserId,
  stall,
  userStallMap,
}) {
  const [search, setSearch] = useState('');

  if (!stall) return null;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCashiers = cashiers.filter((user) => (
    !normalizedSearch
    || user.name.toLowerCase().includes(normalizedSearch)
    || String(user.username || '').toLowerCase().includes(normalizedSearch)
  ));

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={pendingUserId ? undefined : onClose}
      onBackdropClick={pendingUserId ? undefined : onClose}
      labelledBy="manage-stall-staff-title"
      showCloseButton={!pendingUserId}
      size="lg"
    >
      <div className="flex max-h-[88svh] flex-col overflow-hidden">
        <div className="border-b border-ui-border px-5 py-5 pr-16 sm:px-6">
          <p className="m-0 text-xs font-extrabold uppercase tracking-wider text-brand-action">Stall roster</p>
          <h2 id="manage-stall-staff-title" className="m-0 mt-1 text-xl font-extrabold text-text-strong">
            Manage staff for {stall.name}
          </h2>
          <p className="m-0 mt-1 text-sm font-medium text-text-muted">
            Assign available cashiers, move them from another stall, or remove them from this roster.
          </p>
        </div>

        <div className="border-b border-ui-border px-5 py-4 sm:px-6">
          <FormInput
            id="manage-staff-search"
            label="Search cashiers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or username"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          {filteredCashiers.length === 0 ? (
            <EmptyState
              iconName="users"
              title={search ? 'No matching cashiers' : 'No cashiers available'}
              message={search ? 'Try another name or username.' : 'Create a cashier account before assigning staff to this stall.'}
            />
          ) : (
            filteredCashiers.map((user, index) => {
              const assignedStall = userStallMap[user.id];
              const isAssignedHere = Number(assignedStall?.id) === Number(stall.id);
              const isAssignedElsewhere = Boolean(assignedStall) && !isAssignedHere;
              const isPending = Number(pendingUserId) === Number(user.id);

              return (
                <div
                  key={user.id}
                  className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-ui-border bg-ui-surface px-3 py-3 transition-colors hover:border-brand-action/45 hover:bg-ui-muted"
                >
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-black"
                    style={avatarStyle(index)}
                  >
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-text-strong">{user.name}</strong>
                    <span className="block truncate text-xs font-semibold text-text-muted">
                      {isAssignedHere
                        ? 'Assigned to this stall'
                        : (isAssignedElsewhere ? `Currently at ${assignedStall.name}` : 'Not assigned to a stall')}
                    </span>
                  </div>
                  {isAssignedHere ? (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={isPending}
                      disabled={Boolean(pendingUserId) && !isPending}
                      onClick={() => onRemove(user.id)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={isAssignedElsewhere ? 'secondary' : 'primary'}
                      loading={isPending}
                      disabled={Boolean(pendingUserId) && !isPending}
                      onClick={() => onAssign(user.id)}
                    >
                      {isAssignedElsewhere ? 'Move here' : 'Assign'}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ui-border px-5 py-4 sm:px-6">
          <span className="text-xs font-bold text-text-muted">{cashiers.length} cashier{cashiers.length === 1 ? '' : 's'}</span>
          <Button variant="secondary" onClick={onClose} disabled={Boolean(pendingUserId)}>Done</Button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function StallOwner({ users = [] }) {
  const cashierUsers = useMemo(() => {
    return users.filter((user) => roleToApiRole(user.role) === 'cashier');
  }, [users]);
  
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStallId, setSelectedStallId] = useState(null);
  const [actionError, setActionError] = useState('');
  
  const [staffSearch, setStaffSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isManageStaffOpen, setIsManageStaffOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isDropZoneOver, setIsDropZoneOver] = useState(false);
  const [, setIsDraggingFromRoster] = useState(false);
  const [isPoolOver, setIsPoolOver] = useState(false);

  const loadStalls = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await api.stalls.getAll();
      setStalls(data);
      setActionError('');
      setSelectedStallId((current) => {
        if (current && data.some((stall) => stall.id === current)) {
          return current;
        }
        return data[0]?.id ?? null;
      });
      return data;
    } catch (err) {
      setActionError(err.message || 'Failed to load stalls.');
      return [];
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStalls(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadStalls]);

  useAutoRefresh(() => loadStalls(false), {
    intervalMs: 30000,
  });

  const assignments = useMemo(() => {
    const map = {};
    stalls.forEach(s => {
      map[s.id] = s.staff ? s.staff.map(u => u.id) : [];
    });
    return map;
  }, [stalls]);

  const selectedStall  = stalls.find(s => s.id === selectedStallId) ?? null;
  const assignedIds    = assignments[selectedStallId] ?? [];
  const assignedUsers  = cashierUsers.filter(u => assignedIds.includes(u.id));

  const userStallMap = useMemo(() => {
    const map = {};
    stalls.forEach(s => {
      if (s.staff) {
        s.staff.forEach(u => {
          map[u.id] = s;
        });
      }
    });
    return map;
  }, [stalls]);

  const filteredPoolUsers = useMemo(() => {
    return cashierUsers.filter(u =>
      u.name.toLowerCase().includes(staffSearch.toLowerCase())
    );
  }, [cashierUsers, staffSearch]);

  const availablePool = useMemo(() => {
    return filteredPoolUsers.filter(u => !userStallMap[u.id]);
  }, [filteredPoolUsers, userStallMap]);

  const assignedPool = useMemo(() => {
    return filteredPoolUsers.filter(u => !!userStallMap[u.id]);
  }, [filteredPoolUsers, userStallMap]);

  const availableCount = useMemo(() => {
    return cashierUsers.filter(u => !userStallMap[u.id]).length;
  }, [cashierUsers, userStallMap]);

  const [transferConfirm, setTransferConfirm] = useState(null);

  const updateAssignmentsLocally = (stallId, addUserId, removeUserId) => {
    setStalls(prev => prev.map(s => {
      if (s.id === stallId) {
        let newStaff = s.staff || [];
        if (removeUserId) newStaff = newStaff.filter(u => u.id !== removeUserId);
        if (addUserId) {
          const user = users.find(u => u.id === addUserId);
          if (user) newStaff = [...newStaff, { id: user.id, name: user.name, role: user.role }];
        }
        return { ...s, staff: newStaff };
      }
      if (addUserId && s.id !== stallId) {
        return { ...s, staff: (s.staff || []).filter(u => u.id !== addUserId) };
      }
      return s;
    }));
  };

  const handleAssign = async (userId) => {
    if (!selectedStallId || assignedIds.includes(userId)) return false;
    
    // Check if user is already assigned to another stall
    const oldStall = userStallMap[userId];
    if (oldStall && oldStall.id !== selectedStallId) {
      setTransferConfirm({
        userId,
        oldStall,
        newStall: stalls.find(s => s.id === selectedStallId)
      });
      return false;
    }

    setPendingUserId(userId);
    const assigned = await performAssign(userId, selectedStallId);
    setPendingUserId(null);
    return assigned;
  };

  const performAssign = async (userId, toStallId) => {
    setActionError('');
    try {
      await api.stalls.assignStaff(toStallId, userId);
      updateAssignmentsLocally(toStallId, userId, null);
      await loadStalls(false);
      return true;
    } catch (err) {
      setActionError(err.message || 'Failed to assign staff.');
      return false;
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferConfirm) return;
    const { userId, newStall } = transferConfirm;
    setTransferConfirm(null);
    setPendingUserId(userId);
    await performAssign(userId, newStall.id);
    setPendingUserId(null);
  };

  const handleUnassign = async (userId) => {
    setActionError('');
    setPendingUserId(userId);
    try {
      await api.stalls.unassignStaff(selectedStallId, userId);
      updateAssignmentsLocally(selectedStallId, null, userId);
      await loadStalls(false);
      return true;
    } catch (err) {
      setActionError(err.message || 'Failed to unassign staff.');
      return false;
    } finally {
      setPendingUserId(null);
    }
  };

  const handleAddStall = async (stallData) => {
    setActionError('');
    try {
      const saved = await api.stalls.save(stallData);
      setStalls((current) => [...current, saved]);
      setSelectedStallId(saved.id);
      await loadStalls(false);
      return true;
    } catch (err) {
      setActionError(err.message || 'Failed to create stall.');
      return false;
    }
  };

  const handlePoolDrop = (e) => {
    e.preventDefault();
    setIsPoolOver(false);
    const userId = e.dataTransfer.getData('userId');
    const source = e.dataTransfer.getData('source');
    if (source === 'roster') handleUnassign(Number(userId));
  };

  return (
    <div
      className="relative flex flex-col xl:flex-row gap-4 h-full min-h-0 xl:overflow-hidden overflow-y-auto overflow-x-hidden pb-6 xl:pb-0"
      onDragEnd={() => { setIsDraggingFromRoster(false); setIsDropZoneOver(false); setIsPoolOver(false); }}
    >
      {actionError && !showAddModal && !isManageStaffOpen && (
        <Alert variant="danger" className="fixed left-1/2 top-20 z-40 w-[min(92vw,520px)] -translate-x-1/2 shadow-lg">
          {actionError}
        </Alert>
      )}
      <div className="flex flex-col bg-white rounded-2xl shrink-0 w-full xl:w-[280px] xl:min-w-[240px] max-h-[300px] xl:max-h-none xl:h-auto xl:overflow-hidden">
        <div className="flex flex-col gap-1 px-5 pt-5 pb-3.5 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
              <Icon name="location" className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} strokeWidth={2} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              Active Locations
            </span>
            {loading && <span className="text-xs text-[#6b7280] animate-pulse ml-2">...</span>}
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
                    {stall.name}
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
            className="w-full flex h-10 items-center justify-center gap-2 rounded-lg border-0 bg-brand-action cursor-pointer hover:bg-brand-action-hover active:scale-[0.98]">
            <Icon name="plus" className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>Add Location</span>
          </button>
        </div>
      </div>

      <div className="xl:flex-1 bg-white rounded-2xl flex flex-col min-w-0 w-full min-h-[350px] xl:min-h-0 xl:h-auto xl:overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <div className="min-w-0">
            <h2 className="truncate" title={selectedStall ? `Current Roster: ${selectedStall.name}${selectedStall.location ? ` — ${selectedStall.location}` : ''}` : 'Select a Location'} style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              {selectedStall ? `Current Roster: ${selectedStall.name}${selectedStall.location ? ` — ${selectedStall.location}` : ''}` : 'Select a Location'}
            </h2>
            <p className="truncate" title={selectedStall ? `${assignedUsers.length} staff currently assigned · use Manage Staff to update the roster` : 'Choose a location from the left'} style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              {selectedStall ? `${assignedUsers.length} staff currently assigned · use Manage Staff to update the roster` : 'Choose a location from the left'}
            </p>
          </div>
          {selectedStall && (
            <div className="flex shrink-0 items-center gap-2">
              <div className="px-3 py-1 rounded-full" style={{ background: '#eff6ff' }}>
                <span className="text-[13px] font-bold text-[#1d4ed8] font-sans">
                  {assignedUsers.length} / 12
                </span>
              </div>
              <Button size="sm" iconName="users" onClick={() => setIsManageStaffOpen(true)}>
                Manage Staff
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {assignedUsers.length > 0 && (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))' }}>
              {assignedUsers.map((user, idx) => (
                <RosterCard key={user.id} user={user} idx={idx} onUnassign={handleUnassign} />
              ))}
            </div>
          )}

          {selectedStall && assignedUsers.length === 0 && (
            <EmptyState
              className="xl:hidden"
              iconName="users"
              title="No cashiers assigned"
              message="Use Manage Staff to add a cashier to this stall."
              action={(
                <Button size="sm" iconName="userPlus" onClick={() => setIsManageStaffOpen(true)}>
                  Manage Staff
                </Button>
              )}
            />
          )}

          {selectedStall && (
            <DropZone onDrop={(userId) => handleAssign(Number(userId))} isDragOver={isDropZoneOver} setIsDragOver={setIsDropZoneOver} />
          )}
        </div>
      </div>

      <div
        className="hidden xl:flex flex-col bg-white rounded-2xl shrink-0 w-full xl:w-[280px] xl:min-w-[240px] h-[450px] xl:h-auto xl:overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setIsPoolOver(true); }}
        onDragLeave={() => setIsPoolOver(false)}
        onDrop={handlePoolDrop}
      >
        <div className="px-5 pt-5 pb-3.5 border-b border-[#f3f4f6]"
          style={{ background: isPoolOver ? '#f0fdf4' : 'white', transition: 'background 0.15s' }}>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              All Employee Pool
            </span>
            <div className="px-2.5 py-0.5 rounded-full" style={{ background: '#eef2ff' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#003ec7', fontFamily: 'Inter, sans-serif' }}>
                {cashierUsers.length}
              </span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
            {availableCount} available · drag or click to assign
          </p>
        </div>

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

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
          {/* AVAILABLE SECTION */}
          {availablePool.length > 0 && (
            <div>
              <p className="px-1 pb-2 font-sans" style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                Available
              </p>
              <div className="flex flex-col gap-2">
                {availablePool.map((user, idx) => (
                  <PoolPill
                    key={user.id}
                    user={user}
                    idx={idx}
                    assignedStall={userStallMap[user.id]}
                    selectedStallId={selectedStallId}
                    onDragStart={() => setIsDraggingFromRoster(false)}
                    onClick={() => handleAssign(user.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ASSIGNED SECTION */}
          {assignedPool.length > 0 && (
            <div>
              <p className="px-1 pb-2 font-sans" style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                Assigned Here
              </p>
              <div className="flex flex-col gap-2">
                {assignedPool.map((user, idx) => (
                  <PoolPill
                    key={user.id}
                    user={user}
                    idx={idx}
                    assignedStall={userStallMap[user.id]}
                    selectedStallId={selectedStallId}
                    onDragStart={() => setIsDraggingFromRoster(false)}
                    onClick={() => handleAssign(user.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredPoolUsers.length === 0 && (
            <p className="text-center py-8" style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              {staffSearch ? 'No results' : 'All staff are assigned'}
            </p>
          )}
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center px-4 py-3 bg-[#fafafa] border-t border-[#f3f4f6] text-[11px] font-bold text-gray-400 font-sans select-none">
          <span>{cashierUsers.length - assignedUsers.length} not assigned here</span>
          <span>{assignedUsers.length} assigned</span>
        </div>
      </div>

      {showAddModal && (
        <AddStallModal onClose={() => { setShowAddModal(false); setActionError(''); }} onAdd={handleAddStall} error={actionError} />
      )}

      <ManageStaffDialog
        key={`${selectedStallId}-${isManageStaffOpen ? 'open' : 'closed'}`}
        cashiers={cashierUsers}
        error={actionError}
        isOpen={isManageStaffOpen}
        stall={selectedStall}
        userStallMap={userStallMap}
        pendingUserId={pendingUserId}
        onAssign={handleAssign}
        onRemove={handleUnassign}
        onClose={() => {
          setIsManageStaffOpen(false);
          setActionError('');
        }}
      />

      {transferConfirm && (
        <ConfirmDialog
          isOpen={!!transferConfirm}
          title="Move Staff?"
          message={`${users.find(u => u.id === transferConfirm.userId)?.name} is already assigned to ${transferConfirm.oldStall.name}. Are you sure you want to move them to ${transferConfirm.newStall.name}?`}
          cancelLabel="Cancel"
          confirmLabel="Move Staff"
          cancelTone="secondary"
          confirmTone="primary"
          size="compact"
          onCancel={() => setTransferConfirm(null)}
          onConfirm={handleConfirmTransfer}
        />
      )}
    </div>
  );
}
