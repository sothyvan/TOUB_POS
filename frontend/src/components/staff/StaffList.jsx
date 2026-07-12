import { useState, useMemo } from 'react';
import { ROLES } from '../../data/seedData';
import { canManageUserRole, getManageableDisplayRoles, roleToApiRole } from '../../utils/permissions';
import Icon from '../ui/Icon';
import Pagination from '../ui/Pagination';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import FormCheckbox from '../ui/FormCheckbox';
import StatusBadge from '../ui/StatusBadge';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import { initials } from '../../utils/format';

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
    <div className="flex items-center gap-3.5 bg-white rounded-2xl flex-1 border border-[#e5e7eb]" style={{padding:'18px 20px'}}>
      <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center shrink-0" style={{background:iconBg}}>
        <Icon name={iconName} className="w-5 h-5" style={{color:'#374151'}} strokeWidth={1.8}/>
      </div>
      <div>
        <p style={{margin:0,fontSize:22,fontWeight:800,color:'#111827',fontFamily:'Inter,sans-serif',lineHeight:1.1}}>{value}</p>
        <p style={{margin:0,fontSize:12,fontWeight:600,color:'#6b7280',fontFamily:'Inter,sans-serif'}}>{label}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-[#e5e7eb]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
          <h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#111827',fontFamily:'Inter,sans-serif'}}>
            {isNew ? 'Add Employee' : 'Edit Employee'}
          </h3>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-0 bg-[#fafafa] hover:bg-gray-100">
            <Icon name="close" className="w-3.5 h-3.5 text-[#6b7280]" strokeWidth={2}/>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5 p-6">
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          <FormInput
            label="Full Name"
            required
            value={form.name}
            placeholder="Sokha Chan"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
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
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            )}
          </div>
          <FormCheckbox
            label="Active account"
            checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
          />
          <div className="flex gap-2.5 mt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-[10px] border border-[#e5e7eb] cursor-pointer hover:bg-gray-50 font-bold"
              style={{height:40,fontSize:13,color:'#6b7280',fontFamily:'Inter,sans-serif',background:'#ffffff'}}>Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-[2] rounded-[10px] border-0 cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 font-bold"
              style={{height:40,fontSize:13,color:'#ffffff',background:'#003ec7',fontFamily:'Inter,sans-serif'}}>
              {isSaving ? 'Saving...' : (isNew ? 'Add Employee' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  const filtered = useMemo(()=>users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())),[users,search]);
  const activeCount = users.filter(u=>u.active).length;
  const assignedCount = Object.keys(userStallMap).length;

  const STAFF_PAGE_SIZE = 10;
  const [staffPage, setStaffPage] = useState(1);
  const staffTotalPages = Math.ceil(filtered.length / STAFF_PAGE_SIZE) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (staffPage - 1) * STAFF_PAGE_SIZE;
    return filtered.slice(start, start + STAFF_PAGE_SIZE);
  }, [filtered, staffPage]);

  const openNew  = ()=>{ clearActionError?.(); setUserForm({ ...EMPTY, role: roleOptions[0] ?? 'Cashier' }); setIsNew(true);  setShowModal(true); };
  const openEdit = u=>{ clearActionError?.(); onEdit(u); setIsNew(false); setShowModal(true); };
  const close    = ()=>{ setShowModal(false); onCancel(); };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3.5 shrink-0 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1">
        <StatCard iconName="users"    iconBg="#eef2ff" value={users.length}  label="Total Staff"/>
        <StatCard iconName="check"    iconBg="#e0f2fe" value={activeCount}   label="Active Now"/>
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
          <div className="flex items-center gap-2.5 max-[640px]:w-full">
            <div className="relative max-[640px]:flex-1">
              <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" strokeWidth={2}/>
              <input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}
                className="border border-[#e5e7eb] rounded-[9px] outline-none"
                style={{height:36,paddingLeft:34,paddingRight:12,fontSize:13,fontFamily:'Inter,sans-serif',width:'100%',minWidth:160}}/>
            </div>
            {roleOptions.length > 0 && (
              <Button type="button" onClick={openNew} size="sm" iconName="plus" className="shrink-0">Add Employee</Button>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[200px_100px_minmax(160px,1fr)_80px_190px] items-center gap-4 border-b border-[#f3f4f6] shrink-0 max-[1200px]:hidden"
          style={{padding:'8px 24px',background:'#f9fafb'}}>
          {[['Employee','0 0 200px'],['Role','0 0 100px'],['Stall','1 1 260px'],['Status','0 0 80px'],['Actions','0 0 190px']].map(([l,f])=>(
            <span key={l} style={{fontSize:11,fontWeight:700,color:'#9ca3af',fontFamily:'Inter,sans-serif',textTransform:'uppercase',letterSpacing:'0.05em'}} data-flex={f}>{l}</span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
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
              <div key={user.id} className="grid grid-cols-[200px_100px_minmax(160px,1fr)_80px_190px] items-center gap-4 border-b border-ui-border hover:bg-ui-muted transition-colors max-[1200px]:grid-cols-[minmax(0,1fr)_auto] max-[1200px]:gap-3 max-[640px]:px-4"
                style={{padding:'12px 24px',minHeight:69}}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-xs font-black shrink-0" style={avatarStyle(idx)}>
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p style={{margin:0,fontSize:14,fontWeight:600,color:'#111827',fontFamily:'Inter,sans-serif',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</p>
                    <p style={{margin:0,fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>{user.role}</p>
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
                  <StatusBadge active={user.active} activeLabel="Active" inactiveLabel="Off" />
                </div>
                <div className="flex items-center gap-1 shrink-0 max-[1200px]:col-span-2 max-[1200px]:justify-end max-[640px]:justify-start">
                  {canManageUserRole(currentUser, user.role) ? (
                    [
                      {label:'Edit',  color:'#003ec7', icon:'edit',   fn:()=>openEdit(user)},
                      {label:user.active?'Disable':'Enable', color:'#6b7280', icon:user.active?'disable':'enable', fn:()=>onToggleActive(user.id)},
                      {label:'Del',   color:'#ef4444', icon:'delete', fn:()=>onDelete(user.id)},
                    ].map((a,i)=>(
                      <span key={a.label} className="flex items-center gap-0.5">
                        {i>0&&<span style={{color:'#e5e7eb',fontSize:14,margin:'0 2px'}}>|</span>}
                        <button type="button" onClick={a.fn} className="flex items-center gap-1 cursor-pointer border-0 bg-transparent hover:opacity-70 px-1 py-0.5">
                          <Icon name={a.icon} className="w-3.5 h-3.5" style={{color:a.color}} strokeWidth={2}/>
                          <span style={{fontSize:12,fontWeight:600,color:a.color,fontFamily:'Inter,sans-serif'}}>{a.label}</span>
                        </button>
                      </span>
                    ))
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
            Page {staffPage} of {staffTotalPages} &middot; Showing {paginatedStaff.length} of {filtered.length} employees
          </p>
        </div>

        {staffTotalPages > 1 && (
          <div className="px-6 py-3 border-t border-[#f3f4f6] shrink-0" style={{background:'#fff'}}>
            <Pagination currentPage={staffPage} totalPages={staffTotalPages} onPageChange={setStaffPage} />
          </div>
        )}
      </div>

      {showModal && <UserModal form={userForm} setForm={setUserForm} onSave={onSave} onClose={close} isNew={isNew} roleOptions={roleOptions} actionError={actionError}/>}
    </div>
  );
}
