import { useMemo, useState } from 'react';
import { ROLES } from '../../../data/seedData';
import { canManageUserRole, getManageableDisplayRoles, roleToApiRole } from '../../../utils/permissions';
import Icon from '../../../components/ui/Icon';
import Pagination from '../../../components/ui/Pagination';
import FormInput from '../../../components/ui/FormInput';
import FormSelect from '../../../components/ui/FormSelect';
import FormCheckbox from '../../../components/ui/FormCheckbox';
import StatusBadge from '../../../components/ui/StatusBadge';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import ModalShell from '../../../components/ui/ModalShell';
import { initials } from '../../../utils/format';

const AVATAR_COLORS = ['#eef2ff','#dcfce7','#f3e8ff','#fff1f2','#fef3c7','#e0f2fe'];
const AVATAR_TEXT   = ['#3730a3','#166534','#7e22ce','#be123c','#92400e','#075985'];
function avatarStyle(i) { const j=i%6; return {background:AVATAR_COLORS[j],color:AVATAR_TEXT[j]}; }

function roleBadgeStyle(role) {
  const styles = {
    Owner: { background: '#f3e8ff', color: '#7e22ce' },
    Manager: { background: '#dbeafe', color: '#1d4ed8' },
    Cashier: { background: '#fffbeb', color: '#92400e' },
  };
  return styles[role] ?? styles.Cashier;
}

function StatCard({ iconName, iconBg, value, label }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-[#e5e7eb] bg-white p-[18px_20px] max-[420px]:gap-2.5 max-[420px]:p-3">
      <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center shrink-0 max-[420px]:h-10 max-[420px]:w-10" style={{background:iconBg}}>
        <Icon name={iconName} className="w-5 h-5" style={{color:'#374151'}} strokeWidth={1.8}/>
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[22px] font-extrabold leading-none text-[#111827] max-[420px]:text-lg">{value}</p>
        <p className="m-0 mt-1 text-xs font-semibold leading-tight text-[#6b7280]">{label}</p>
      </div>
    </div>
  );
}

function UserModal({ form, setForm, onSave, onClose, isNew, roleOptions, actionError }) {
  const isCashier = roleToApiRole(form.role) === 'cashier';
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const saved = await onSave();
      if (saved) onClose();
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <ModalShell
      isOpen
      onClose={isSaving ? undefined : onClose}
      onBackdropClick={isSaving ? undefined : onClose}
      labelledBy="staff-editor-title"
      showCloseButton={!isSaving}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[88svh] flex-col overflow-hidden">
        <div className="border-b border-ui-border px-5 py-5 pr-16 sm:px-6">
          <h2 id="staff-editor-title" className="m-0 text-lg font-extrabold text-text-strong">
            {isNew ? 'Add Employee' : 'Edit Employee'}
          </h2>
          <p className="m-0 mt-1 text-sm font-medium text-text-muted">
            {isNew ? 'Create a management or cashier account.' : 'Update this employee’s access and account status.'}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:p-6">
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          <FormInput
            label="Full Name"
            requiredLabel
            required
            value={form.name}
            placeholder="Sokha Chan"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Role"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value, password: '', pin: '' }))}
            >
              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </FormSelect>
            {isCashier ? (
              <FormInput
                label={`PIN ${!isNew ? '(blank = keep)' : ''}`}
                type="password"
                inputMode="numeric"
                placeholder="4 digits"
                value={form.pin}
                required={isNew}
                requiredLabel={isNew}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
              />
            ) : (
              <FormInput
                label={`Password ${!isNew ? '(blank = keep)' : ''}`}
                type="password"
                autoComplete="new-password"
                placeholder="Enter password"
                value={form.password}
                required={isNew}
                requiredLabel={isNew}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            )}
          </div>
          <FormCheckbox
            label="Active account"
            checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ui-border bg-ui-muted/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button fullWidth className="sm:w-auto" type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button fullWidth className="sm:w-auto" type="submit" loading={isSaving}>
            {isNew ? 'Add Employee' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

const EMPTY = { id:null,name:'',role:'Cashier',password:'',pin:'',active:true };

export default function StaffList({
  userForm,
  setUserForm,
  users,
  onSave,
  onEdit,
  onToggleActive,
  onDelete,
  onCancel,
  currentUser,
  loading,
  error,
  stalls = [],
  stallsLoading,
  stallsError,
  actionError,
  clearActionError,
}) {
  const [showModal, setShowModal] = useState(false);
  const [isNew, setIsNew]         = useState(false);
  const [search, setSearch]       = useState('');
  const roleOptions = useMemo(() => {
    const manageableRoles = getManageableDisplayRoles(currentUser);
    return manageableRoles.length > 0 ? manageableRoles : ROLES;
  }, [currentUser]);

  const userStallMap = useMemo(()=>{
    const m={};
    stalls.forEach(stall => {
      (stall.staff ?? []).forEach(user => {
        m[user.id] = stall.location ? `${stall.name} — ${stall.location}` : stall.name;
      });
    });
    return m;
  },[stalls]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.name, user.username, user.role]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [users, search]);
  const activeCount = users.filter(u=>u.active).length;
  const assignedCount = Object.keys(userStallMap).length;

  const STAFF_PAGE_SIZE = 10;
  const [staffPage, setStaffPage] = useState(1);
  const staffTotalPages = Math.ceil(filtered.length / STAFF_PAGE_SIZE) || 1;
  const currentStaffPage = Math.min(staffPage, staffTotalPages);
  const paginatedStaff = useMemo(() => {
    const start = (currentStaffPage - 1) * STAFF_PAGE_SIZE;
    return filtered.slice(start, start + STAFF_PAGE_SIZE);
  }, [currentStaffPage, filtered]);

  const openNew  = ()=>{ clearActionError?.(); setUserForm({ ...EMPTY, role: roleOptions[0] ?? 'Cashier' }); setIsNew(true);  setShowModal(true); };
  const openEdit = u=>{ clearActionError?.(); onEdit(u); setIsNew(false); setShowModal(true); };
  const close    = ()=>{ setShowModal(false); onCancel(); };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {roleOptions.length > 0 && (
        <div className="flex shrink-0 justify-end">
          <Button type="button" onClick={openNew} iconName="plus" className="max-[640px]:w-full">
            Add Employee
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3.5 shrink-0 max-[1100px]:grid-cols-2">
        <StatCard iconName="users"    iconBg="#eef2ff" value={users.length}  label="Total Staff"/>
        <StatCard iconName="check"    iconBg="#e0f2fe" value={activeCount}   label="Active Accounts"/>
        <StatCard iconName="location" iconBg="#dcfce7" value={stalls.length} label="Active Stalls"/>
        <StatCard iconName="trendUp"  iconBg="#fef3c7" value={assignedCount} label="Assigned"/>
      </div>

      {actionError && <Alert variant="danger">{actionError}</Alert>}

      {/* Table */}
      <div className="flex flex-col bg-white rounded-2xl overflow-hidden flex-1 min-h-0 border border-[#e5e7eb]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[#f3f4f6] shrink-0 max-[640px]:px-4">
          <div>
            <h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#111827',fontFamily:'Inter,sans-serif'}}>Employee Directory</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p style={{margin:0,fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>{filtered.length} employees</p>
              {loading && <span className="text-xs text-[#6b7280] animate-pulse">Loading...</span>}
            {error && <span className="text-xs text-[#ef4444]">{error}</span>}
            {stallsLoading && <span className="text-xs text-[#6b7280] animate-pulse">Loading assignments...</span>}
            {stallsError && <span className="text-xs text-[#ef4444]">{stallsError}</span>}
            </div>
          </div>
          <label className="relative max-[640px]:w-full">
            <span className="sr-only">Search employees</span>
            <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" strokeWidth={2}/>
            <input
              type="search"
              placeholder="Search employees"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setStaffPage(1);
              }}
              className="h-10 w-full min-w-48 rounded-lg border border-ui-border bg-ui-surface pl-9 pr-3 text-sm font-medium text-text-strong outline-none transition-colors placeholder:text-text-muted focus:border-brand-action"
            />
          </label>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[200px_100px_minmax(160px,1fr)_80px_260px] items-center gap-4 border-b border-[#f3f4f6] shrink-0 max-[1200px]:hidden"
          style={{padding:'8px 24px',background:'#f9fafb'}}>
          {[['Employee','0 0 200px'],['Role','0 0 100px'],['Stall','1 1 260px'],['Status','0 0 80px'],['Actions','0 0 260px']].map(([l,f])=>(
            <span key={l} style={{fontSize:11,fontWeight:700,color:'#9ca3af',fontFamily:'Inter,sans-serif',textTransform:'uppercase',letterSpacing:'0.05em'}} data-flex={f}>{l}</span>
          ))}
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#9ca3af]">
                <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }} className="animate-pulse">Loading staff...</span>
             </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#9ca3af]">
                <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>No staff found</span>
             </div>
          ) : paginatedStaff.map((user,idx)=>{
            return (
              <div key={user.id} className="grid grid-cols-[200px_100px_minmax(160px,1fr)_80px_260px] items-center gap-4 border-b border-ui-border hover:bg-ui-muted transition-colors max-[1200px]:grid-cols-[minmax(0,1fr)_auto] max-[1200px]:gap-3 max-[640px]:px-4"
                style={{padding:'12px 24px',minHeight:69}}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-xs font-black shrink-0" style={avatarStyle(idx)}>
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p style={{margin:0,fontSize:14,fontWeight:600,color:'#111827',fontFamily:'Inter,sans-serif',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</p>
                    <p style={{margin:0,fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>{user.username ? `@${user.username}` : user.role}</p>
                  </div>
                </div>
                <div className="max-[1200px]:justify-self-end">
                  <span className="inline-flex rounded-full px-2.5 py-0.5" style={{fontSize:11,fontWeight:700,fontFamily:'Inter,sans-serif',...roleBadgeStyle(user.role)}}>{user.role}</span>
                </div>
                <div className="min-w-0">
                  {userStallMap[user.id]
                    ? <div className="flex items-center gap-1.5"><Icon name="location" className="w-3 h-3 text-[#9ca3af]" strokeWidth={2}/><span style={{fontSize:13,color:'#374151',fontFamily:'Inter,sans-serif',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userStallMap[user.id]}</span></div>
                    : <span style={{fontSize:13,color:'#d1d5db',fontFamily:'Inter,sans-serif'}}>—</span>}
                </div>
                <div className="max-[1200px]:justify-self-end">
                  <StatusBadge active={user.active} activeLabel="Active" inactiveLabel="Inactive" />
                </div>
                <div className="flex shrink-0 items-center gap-1.5 max-[1200px]:col-span-2 max-[1200px]:justify-end max-[640px]:grid max-[640px]:w-full max-[640px]:grid-cols-3 max-[640px]:gap-2">
                  {canManageUserRole(currentUser, user.role) ? (
                    <>
                      <Button size="compact" variant="ghost" iconName="edit" className="max-[640px]:min-h-10 max-[640px]:w-full" onClick={() => openEdit(user)}>
                        Edit
                      </Button>
                      <Button size="compact" variant="secondary" iconName={user.active ? 'disable' : 'enable'} className="max-[640px]:min-h-10 max-[640px]:w-full" onClick={() => onToggleActive(user.id)}>
                        {user.active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="compact" variant="danger" iconName="delete" className="max-[640px]:min-h-10 max-[640px]:w-full" onClick={() => onDelete(user.id)}>
                        Delete
                      </Button>
                    </>
                  ) : (
                    <span style={{fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>Owner-only</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-[#f3f4f6] shrink-0" style={{background:'#fafafa'}}>
          <p style={{margin:0,fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>
            Page {currentStaffPage} of {staffTotalPages} &middot; Showing {paginatedStaff.length} of {filtered.length} employees
          </p>
        </div>

        {staffTotalPages > 1 && (
          <div className="px-6 py-3 border-t border-[#f3f4f6] shrink-0" style={{background:'#fff'}}>
            <Pagination currentPage={currentStaffPage} totalPages={staffTotalPages} onPageChange={setStaffPage} />
          </div>
        )}
      </div>

      {showModal && <UserModal form={userForm} setForm={setUserForm} onSave={onSave} onClose={close} isNew={isNew} roleOptions={roleOptions} actionError={actionError}/>}
    </div>
  );
}
