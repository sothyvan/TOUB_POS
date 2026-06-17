import { useState, useMemo } from 'react';
import Icon from '../ui/Icon';
import { initials } from '../../utils/format';

const AVATAR_COLORS = ['#eef2ff','#dcfce7','#f3e8ff','#fff1f2','#fef3c7','#e0f2fe'];
const AVATAR_TEXT   = ['#3730a3','#166534','#7e22ce','#be123c','#92400e','#075985'];
function avatarStyle(i) { const j=i%6; return {background:AVATAR_COLORS[j],color:AVATAR_TEXT[j]}; }

const SHIFTS = [null,'AM','PM','FD']; // cycle order

const SHIFT_STYLE = {
  AM: { bg:'#fffbeb', color:'#92400e', label:'AM' },
  PM: { bg:'#eff6ff', color:'#1d4ed8', label:'PM' },
  FD: { bg:'#f3e8ff', color:'#7e22ce', label:'FD' },
};

function getStalls() {
  const S=[
    {id:'stall-1',name:'Stall 1',location:'BKK1'},
    {id:'stall-2',name:'Stall 2',location:'Russian Market'},
    {id:'stall-3',name:'Stall 3',location:'Toul Tom Poung'},
  ];
  try { return JSON.parse(localStorage.getItem('toub_stalls'))||S; } catch { return S; }
}

function loadMatrix() {
  try { return JSON.parse(localStorage.getItem('toub_shift_matrix'))||{}; } catch { return {}; }
}
function saveMatrix(m) { localStorage.setItem('toub_shift_matrix', JSON.stringify(m)); }

// ── Shift cell ────────────────────────────────────────────────────────────────
function ShiftCell({ shift, onClick }) {
  if (!shift) {
    return (
      <button type="button" onClick={onClick}
        className="flex items-center justify-center rounded-full border border-[#e5e7eb] cursor-pointer hover:border-[#003ec7] hover:bg-[#eef2ff] transition-all border-0 bg-transparent"
        style={{width:62,height:30}}>
        <span style={{fontSize:14,color:'#d1d5db',fontFamily:'Inter,sans-serif'}}>—</span>
      </button>
    );
  }
  const s = SHIFT_STYLE[shift];
  return (
    <button type="button" onClick={onClick}
      className="flex items-center justify-center rounded-full cursor-pointer hover:opacity-80 active:scale-95 transition-all border-0"
      style={{width:62,height:30,background:s.bg}}>
      <span style={{fontSize:12,fontWeight:700,color:s.color,fontFamily:'Inter,sans-serif'}}>{s.label}</span>
    </button>
  );
}

// ── Coverage bar ──────────────────────────────────────────────────────────────
function CoverageBar({ stall, assigned, total }) {
  const pct = total ? (assigned/total)*100 : 0;
  const color = pct >= 50 ? '#f59e0b' : '#f87171';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#f9fafb] last:border-0">
      <span style={{fontSize:13,fontWeight:500,color:'#374151',fontFamily:'Inter,sans-serif',flex:'1 1 0',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {stall.name} — {stall.location}
      </span>
      <div className="flex-1 h-2 rounded-full bg-[#f3f4f6] overflow-hidden mx-2">
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:color}}/>
      </div>
      <span style={{fontSize:12,fontWeight:700,color,fontFamily:'Inter,sans-serif',whiteSpace:'nowrap'}}>
        {assigned}/{total} staff
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StaffAllocation({ users }) {
  const stalls = useMemo(getStalls, []);
  const [matrix, setMatrix] = useState(loadMatrix); // { userId: { stallId: 'AM'|'PM'|'FD'|null } }
  const [saved, setSaved]   = useState(false);

  const cycle = (userId, stallId) => {
    setMatrix(prev => {
      const current = prev[userId]?.[stallId] ?? null;
      const nextIdx = (SHIFTS.indexOf(current) + 1) % SHIFTS.length;
      const next    = SHIFTS[nextIdx];
      return { ...prev, [userId]: { ...(prev[userId]??{}), [stallId]: next } };
    });
    setSaved(false);
  };

  const handleSave = () => { saveMatrix(matrix); setSaved(true); setTimeout(()=>setSaved(false), 2000); };

  // Stats
  const totalSlots    = users.length * stalls.length;
  const assignedCells = Object.values(matrix).flatMap(Object.values).filter(Boolean).length;
  const unassigned    = totalSlots - assignedCells;

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">

      {/* ── Stat cards ── */}
      <div className="flex gap-3.5 shrink-0">
        {[
          {icon:'users',   bg:'#eef2ff', val:users.length,  label:'Total Staff'},
          {icon:'location',bg:'#e0f2fe', val:stalls.length, label:'Active Stalls'},
          {icon:'clock',   bg:'#dcfce7', val:assignedCells, label:'Shifts Assigned'},
          {icon:'trendUp', bg:'#fef3c7', val:unassigned,    label:'Unassigned Slots'},
        ].map(c=>(
          <div key={c.label} className="flex items-center gap-3.5 bg-white rounded-2xl flex-1" style={{padding:'18px 20px'}}>
            <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center shrink-0" style={{background:c.bg}}>
              <Icon name={c.icon} className="w-5 h-5" style={{color:'#374151'}} strokeWidth={1.8}/>
            </div>
            <div>
              <p style={{margin:0,fontSize:22,fontWeight:800,color:'#111827',fontFamily:'Inter,sans-serif',lineHeight:1.1}}>{c.val}</p>
              <p style={{margin:0,fontSize:12,fontWeight:600,color:'#6b7280',fontFamily:'Inter,sans-serif'}}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Allocation Matrix ── */}
      <div className="flex flex-col bg-white rounded-2xl overflow-hidden flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6] shrink-0">
          <div>
            <h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#111827',fontFamily:'Inter,sans-serif'}}>Allocation Matrix</h3>
            <p style={{margin:'2px 0 0',fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>Click any cell to cycle through shift assignments</p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4">
            {Object.entries(SHIFT_STYLE).map(([k,s])=>(
              <div key={k} className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center rounded-full w-7 h-5" style={{background:s.bg}}>
                  <span style={{fontSize:10,fontWeight:700,color:s.color,fontFamily:'Inter,sans-serif'}}>{s.label}</span>
                </span>
                <span style={{fontSize:11,color:'#6b7280',fontFamily:'Inter,sans-serif'}}>
                  {k==='AM'?'Morning (AM)':k==='PM'?'Evening (PM)':'Full Day (FD)'}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span style={{fontSize:14,color:'#d1d5db'}}>—</span>
              <span style={{fontSize:11,color:'#6b7280',fontFamily:'Inter,sans-serif'}}>Unassigned</span>
            </div>
          </div>
        </div>

        {/* Scrollable matrix */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse" style={{minWidth: 200 + stalls.length*150}}>
            <thead>
              <tr style={{background:'#f9fafb'}}>
                <th className="text-left border-b border-[#f3f4f6]" style={{padding:'10px 24px',fontSize:11,fontWeight:700,color:'#9ca3af',fontFamily:'Inter,sans-serif',textTransform:'uppercase',letterSpacing:'0.05em',width:230}}>
                  Staff Member
                </th>
                {stalls.map(s=>(
                  <th key={s.id} className="text-center border-b border-[#f3f4f6]" style={{padding:'10px 16px',fontSize:11,fontWeight:700,color:'#9ca3af',fontFamily:'Inter,sans-serif',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                    {s.name}
                    <div style={{fontSize:10,fontWeight:400,color:'#d1d5db',textTransform:'none',letterSpacing:0}}>{s.location}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user,idx)=>(
                <tr key={user.id} className="border-b border-[#f9fafb] hover:bg-[#fafbff] transition-colors">
                  <td style={{padding:'14px 24px'}}>
                    <div className="flex items-center gap-3">
                      <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-xs font-black shrink-0" style={avatarStyle(idx)}>
                        {initials(user.name)}
                      </div>
                      <div>
                        <p style={{margin:0,fontSize:14,fontWeight:600,color:'#111827',fontFamily:'Inter,sans-serif'}}>{user.name}</p>
                        <p style={{margin:0,fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>{user.role}</p>
                      </div>
                    </div>
                  </td>
                  {stalls.map(stall=>(
                    <td key={stall.id} style={{padding:'14px 16px',textAlign:'center'}}>
                      <ShiftCell
                        shift={matrix[user.id]?.[stall.id] ?? null}
                        onClick={()=>cycle(user.id, stall.id)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#f3f4f6] shrink-0" style={{background:'#fafafa'}}>
          <p style={{margin:0,fontSize:12,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>
            {users.length} staff · {stalls.length} stalls · {totalSlots} total slots
          </p>
          <button type="button" onClick={handleSave}
            className="rounded-[10px] border-0 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            style={{height:38,padding:'0 24px',background:saved?'#16a34a':'#003ec7',fontSize:13,fontWeight:700,color:'#ffffff',fontFamily:'Inter,sans-serif'}}>
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Bottom cards ── */}
      <div className="flex gap-4 shrink-0">
        {/* Shift Key */}
        <div className="bg-white rounded-2xl p-5" style={{flex:'0 0 320px'}}>
          <h3 style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:'#111827',fontFamily:'Inter,sans-serif'}}>Shift Key</h3>
          <div className="flex flex-col gap-3">
            {[
              {shift:'AM',title:'Morning Shift',  hours:'08:00 – 14:00'},
              {shift:'PM',title:'Evening Shift',  hours:'14:00 – 21:00'},
              {shift:'FD',title:'Full Day Shift', hours:'08:00 – 21:00'},
              {shift:null,title:'Unassigned',     hours:'No shift scheduled'},
            ].map(row=>{
              const s = row.shift ? SHIFT_STYLE[row.shift] : null;
              return (
                <div key={row.title} className="flex items-center gap-3">
                  {s
                    ? <span className="inline-flex items-center justify-center rounded-full w-9 h-6 shrink-0" style={{background:s.bg}}><span style={{fontSize:11,fontWeight:700,color:s.color,fontFamily:'Inter,sans-serif'}}>{s.label}</span></span>
                    : <span className="inline-flex items-center justify-center rounded-full w-9 h-6 shrink-0 border border-[#e5e7eb]" style={{background:'#fafafa'}}><span style={{fontSize:13,color:'#d1d5db'}}>—</span></span>
                  }
                  <div>
                    <p style={{margin:0,fontSize:13,fontWeight:600,color:'#374151',fontFamily:'Inter,sans-serif'}}>{row.title}</p>
                    <p style={{margin:0,fontSize:11,color:'#9ca3af',fontFamily:'Inter,sans-serif'}}>{row.hours}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage by Stall */}
        <div className="flex-1 bg-white rounded-2xl p-5">
          <h3 style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:'#111827',fontFamily:'Inter,sans-serif'}}>Coverage by Stall</h3>
          {stalls.map(stall=>{
            const assigned = users.filter(u=>(matrix[u.id]?.[stall.id]??null)!==null).length;
            return <CoverageBar key={stall.id} stall={stall} assigned={assigned} total={users.length}/>;
          })}
        </div>
      </div>
    </div>
  );
}
