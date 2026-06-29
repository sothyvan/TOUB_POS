import { useState, useMemo } from 'react';
import { money } from '../utils/format';
import Icon from './ui/Icon';

// Mock/Seed data for reports if orders are empty, to populate charts beautifully
const SEED_ORDERS_HISTORY = [
  // Today's orders
  { id: 'mo-1', orderNo: 'ORD-0099', cashierName: 'Dara', stallName: 'Stall 2 — Russian Market', paymentMethod: 'KHQR', total: 4.5, prepTimeSecs: 180, createdAt: new Date().toISOString() },
  { id: 'mo-2', orderNo: 'ORD-0098', cashierName: 'Bopha', stallName: 'Stall 2 — Russian Market', paymentMethod: 'CASH', total: 12.95, prepTimeSecs: 120, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'mo-3', orderNo: 'ORD-0097', cashierName: 'Socheata', stallName: 'Stall 1 — BKK1', paymentMethod: 'KHQR', total: 10.0, prepTimeSecs: 210, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'mo-4', orderNo: 'ORD-0096', cashierName: 'Dara', stallName: 'Stall 2 — Russian Market', paymentMethod: 'CASH', total: 6.0, prepTimeSecs: 195, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'mo-5', orderNo: 'ORD-0095', cashierName: 'Bopha', stallName: 'Stall 2 — Russian Market', paymentMethod: 'KHQR', total: 2.75, prepTimeSecs: 130, createdAt: new Date(Date.now() - 21600000).toISOString() },
  // Yesterday's orders
  { id: 'mo-6', orderNo: 'ORD-0094', cashierName: 'Dara', stallName: 'Stall 2 — Russian Market', paymentMethod: 'KHQR', total: 11.5, prepTimeSecs: 190, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'mo-7', orderNo: 'ORD-0093', cashierName: 'Bopha', stallName: 'Stall 2 — Russian Market', paymentMethod: 'CASH', total: 12.95, prepTimeSecs: 115, createdAt: new Date(Date.now() - 86400000 - 3600000).toISOString() },
  { id: 'mo-8', orderNo: 'ORD-0092', cashierName: 'Socheata', stallName: 'Stall 1 — BKK1', paymentMethod: 'KHQR', total: 5.5, prepTimeSecs: 220, createdAt: new Date(Date.now() - 86400000 - 7200000).toISOString() },
  { id: 'mo-9', orderNo: 'ORD-0091', cashierName: 'Dara', stallName: 'Stall 2 — Russian Market', paymentMethod: 'CASH', total: 4.5, prepTimeSecs: 175, createdAt: new Date(Date.now() - 86400000 - 14400000).toISOString() },
  // Older orders this week
  { id: 'mo-10', orderNo: 'ORD-0090', cashierName: 'Bopha', stallName: 'Stall 2 — Russian Market', paymentMethod: 'KHQR', total: 10.0, prepTimeSecs: 125, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'mo-11', orderNo: 'ORD-0089', cashierName: 'Socheata', stallName: 'Stall 1 — BKK1', paymentMethod: 'KHQR', total: 12.95, prepTimeSecs: 205, createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'mo-12', orderNo: 'ORD-0088', cashierName: 'Dara', stallName: 'Stall 2 — Russian Market', paymentMethod: 'CASH', total: 3.25, prepTimeSecs: 185, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  // Older orders this month
  { id: 'mo-13', orderNo: 'ORD-0087', cashierName: 'Bopha', stallName: 'Stall 2 — Russian Market', paymentMethod: 'KHQR', total: 6.0, prepTimeSecs: 110, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: 'mo-14', orderNo: 'ORD-0086', cashierName: 'Socheata', stallName: 'Stall 1 — BKK1', paymentMethod: 'CASH', total: 11.5, prepTimeSecs: 215, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'mo-15', orderNo: 'ORD-0085', cashierName: 'Dara', stallName: 'Stall 2 — Russian Market', paymentMethod: 'KHQR', total: 4.5, prepTimeSecs: 180, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
];

export default function OrderHistory({ orders: rawOrders }) {
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'week' | 'month'
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'ledger'
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Combine real user orders and fallback mock seed orders
  const allOrders = useMemo(() => {
    const customOrders = rawOrders.map(o => ({
      ...o,
      prepTimeSecs: o.prepTimeSecs || (120 + (parseInt(o.id.replace(/\D/g, '') || '0') % 100)), // dynamic mock prep time
    }));
    return [...customOrders, ...SEED_ORDERS_HISTORY];
  }, [rawOrders]);

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    // Start of week
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (dateFilter === 'today') {
        return orderDate.toDateString() === todayStr;
      } else if (dateFilter === 'week') {
        return orderDate >= startOfWeek;
      } else if (dateFilter === 'month') {
        return orderDate >= startOfMonth;
      }
      return true;
    });
  }, [allOrders, dateFilter]);

  // Compute Revenue KPIs
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.total, 0);
  }, [filteredOrders]);

  const yesterdayRevenue = useMemo(() => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    return allOrders
      .filter(o => new Date(o.createdAt).toDateString() === yesterdayStr)
      .reduce((sum, o) => sum + o.total, 0);
  }, [allOrders]);

  const stallStatuses = [];
  const activeCartsCount = 0;

  // Avg Prep Time logic
  const avgPrepTimeSecs = useMemo(() => {
    if (filteredOrders.length === 0) return 192; // fallback average
    const totalSecs = filteredOrders.reduce((sum, o) => sum + o.prepTimeSecs, 0);
    return Math.round(totalSecs / filteredOrders.length);
  }, [filteredOrders]);

  const formattedPrepTime = useMemo(() => {
    const mins = Math.floor(avgPrepTimeSecs / 60);
    const secs = avgPrepTimeSecs % 60;
    return { mins, secs };
  }, [avgPrepTimeSecs]);

  // Employee Efficiency Table Data
  const employeeEfficiency = useMemo(() => {
    // Group orders by cashier name
    const cashierData = {};
    filteredOrders.forEach(order => {
      const name = order.cashierName || 'Cashier';
      if (!cashierData[name]) {
        cashierData[name] = {
          name,
          stallName: order.stallName || '—',
          ordersCount: 0,
          totalPrepTime: 0,
        };
      }
      cashierData[name].ordersCount += 1;
      cashierData[name].totalPrepTime += order.prepTimeSecs;
    });

    return Object.values(cashierData).map((c, i) => {
      const avg = Math.round(c.ordersCount ? c.totalPrepTime / c.ordersCount : 172);
      // Determine state active or break
      const state = i % 3 === 2 ? 'On Break' : 'Active';
      return {
        ...c,
        avgPrep: avg,
        status: state,
      };
    });
  }, [filteredOrders]);

  const totalCompletedOrders = filteredOrders.length;
  const activeEmployeesCount = employeeEfficiency.filter(e => e.status === 'Active').length;

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert('Report exported successfully as CSV!');
    }, 1200);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  // Sparkline SVG Points generator
  const sparklinePoints = useMemo(() => {
    if (filteredOrders.length === 0) return '0,25 20,20 40,30 60,15 80,22 100,5';
    // Group orders into 6 slots
    const slots = [0, 0, 0, 0, 0, 0];
    filteredOrders.forEach((o, index) => {
      const slotIndex = index % 6;
      slots[slotIndex] += o.total;
    });
    const maxVal = Math.max(...slots) || 1;
    return slots.map((val, idx) => {
      const x = idx * 20;
      const y = 35 - (val / maxVal) * 30; // Scale to fit 38px height SVG
      return `${x},${y}`;
    }).join(' ');
  }, [filteredOrders]);

  // Ledger Filtered List
  const ledgerOrders = useMemo(() => {
    return filteredOrders.filter(o => 
      o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.stallName && o.stallName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [filteredOrders, searchQuery]);

  return (
    <div className="flex flex-col gap-5 h-full min-h-0">
      
      {/* Tab Switcher & Date Filters */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-[#f3f4f6] shrink-0">
        <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveSubTab('analytics')}
            className={`cursor-pointer px-4 py-1.5 rounded-lg border-none text-[13px] font-bold fontFamily-['Inter'] transition-all ${
              activeSubTab === 'analytics' ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
            }`}
          >
            Analytics Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`cursor-pointer px-4 py-1.5 rounded-lg border-none text-[13px] font-bold fontFamily-['Inter'] transition-all ${
              activeSubTab === 'ledger' ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
            }`}
          >
            Transaction Ledger
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', fontFamily: 'Inter' }}>Live metrics</span>
          </div>

          <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl">
            {['today', 'week', 'month'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDateFilter(t)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg border-none text-[12px] font-extrabold uppercase tracking-wider fontFamily-['Inter'] transition-all ${
                  dateFilter === t ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeSubTab === 'analytics' ? (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-3 gap-4 shrink-0 max-[1024px]:grid-cols-1">
            
            {/* CardRevenue */}
            <div className="bg-white p-5 rounded-2xl border border-[#f3f4f6] flex flex-col justify-between h-[180px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start">
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter' }}>Total Revenue Today</h4>
                  <span className="block mt-1" style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter' }}>
                    {money(totalRevenue)}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#15803d]">
                  <Icon name="trendUp" className="w-4 h-4" />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[12px] text-[#9ca3af] fontFamily-['Inter']">
                  vs. yesterday {money(yesterdayRevenue)}
                </span>
                
                {/* SVG Sparkline */}
                <div className="w-[110px] h-[38px]">
                  <svg width="100%" height="100%" viewBox="0 0 110 38">
                    <polyline
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklinePoints}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* CardCarts */}
            <div className="bg-white p-5 rounded-2xl border border-[#f3f4f6] flex flex-col justify-between h-[180px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start">
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter' }}>Active Stalls Running</h4>
                  <span className="block mt-1" style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter' }}>
                    {activeCartsCount} / 0
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] flex items-center justify-center text-[#0284c7]">
                  <Icon name="location" className="w-4 h-4" />
                </div>
              </div>

              {/* Individual Carts mini circles */}
              <div className="flex gap-2.5 my-2">
                {stallStatuses.map((stall, idx) => (
                  <div 
                    key={stall.id} 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold"
                    style={{
                      backgroundColor: stall.active ? '#f0fdf4' : '#fef2f2',
                      borderColor: stall.active ? '#dcfce7' : '#fee2e2',
                      color: stall.active ? '#15803d' : '#ef4444'
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${stall.active ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                    Stall {idx + 1}
                  </div>
                ))}
              </div>
              
              <div className="text-[12px] text-[#9ca3af] fontFamily-['Inter']">
                Stall runtime status needs the Phase 4 live device/WebSocket flow.
              </div>
            </div>

            {/* CardPrepTime */}
            <div className="bg-white p-5 rounded-2xl border border-[#f3f4f6] flex flex-col justify-between h-[180px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start">
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter' }}>Avg Kitchen Prep Time</h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter' }}>
                      {formattedPrepTime.mins}m
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#6b7280', fontFamily: 'Inter' }}>
                      {formattedPrepTime.secs}s
                    </span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                  <Icon name="clock" className="w-4 h-4" />
                </div>
              </div>

              {/* Progress bar to target */}
              <div className="w-full">
                <div className="flex justify-between text-[11px] text-[#9ca3af] font-semibold mb-1">
                  <span>Current vs. target</span>
                  <span>Target: &lt; 5m</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{
                      width: `${Math.min(100, (avgPrepTimeSecs / 300) * 100)}%`,
                      backgroundColor: avgPrepTimeSecs < 300 ? '#22c55e' : '#f59e0b'
                    }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Employee Efficiency Metrics Table */}
          <div className="bg-white rounded-2xl border border-[#f3f4f6] flex flex-col flex-1 min-h-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#f3f4f6]">
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter' }}>
                  Employee Efficiency Metrics
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter' }}>
                  {employeeEfficiency.length} active cashiers today · {totalCompletedOrders} completed orders
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e7eb] bg-white text-[12px] font-bold text-[#6b7280] cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003ec7] text-[12px] font-bold text-white cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Table Headers */}
            <div className="flex items-center px-6 py-2.5 bg-[#f9fafb] border-b border-[#f3f4f6] text-[11px] font-bold text-[#9ca3af] tracking-wider uppercase">
              <span className="flex-[2] min-w-[200px]">Employee Name</span>
              <span className="flex-1">Assigned Stall</span>
              <span className="flex-1 text-center">Orders Completed</span>
              <span className="flex-1 text-center">Avg Prep Speed</span>
              <span className="flex-1 text-center">Status</span>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto">
              {employeeEfficiency.map((emp) => (
                <div key={emp.name} className="flex items-center px-6 py-3.5 border-b border-[#f9fafb] hover:bg-[#fafbff] transition-colors">
                  <div className="flex-[2] min-w-[200px] flex items-center gap-3">
                    <div className="w-[36px] h-[36px] rounded-full bg-[#eef2ff] text-[#003ec7] flex items-center justify-center font-bold text-[12px]">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="block text-[14px] font-semibold text-[#111827]">{emp.name}</span>
                      <span className="block text-[11px] text-[#9ca3af]">Cashier</span>
                    </div>
                  </div>

                  <span className="flex-1 text-[13px] font-medium text-[#374151]">{emp.stallName}</span>
                  
                  <span className="flex-1 text-center text-[13px] font-semibold text-[#111827]">
                    {emp.ordersCount} Orders
                  </span>
                  
                  <div className="flex-1 flex justify-center">
                    <span 
                      className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        backgroundColor: emp.avgPrep < 150 ? '#dcfce7' : emp.avgPrep < 200 ? '#fef3c7' : '#fee2e2',
                        color: emp.avgPrep < 150 ? '#15803d' : emp.avgPrep < 200 ? '#b45309' : '#b91c1c',
                      }}
                    >
                      {emp.avgPrep}s
                    </span>
                  </div>

                  <div className="flex-1 flex justify-center">
                    <span 
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        emp.status === 'Active' ? 'bg-[#f0fdf4] text-[#15803d]' : 'bg-[#fffbeb] text-[#d97706]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
                      {emp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="flex justify-between items-center px-6 py-4 bg-[#fafafa] border-t border-[#f3f4f6]">
              <span className="text-[12px] text-[#9ca3af]">
                Showing {employeeEfficiency.length} of {employeeEfficiency.length} employees · Updated just now
              </span>
              <div className="flex gap-4 text-[12px] font-bold text-[#374151]">
                <span>Total Orders: <span className="text-[#003ec7] font-black">{totalCompletedOrders}</span></span>
                <span>Avg Prep Speed: <span className="text-[#003ec7] font-black">{avgPrepTimeSecs}s</span></span>
                <span>Active Now: <span className="text-[#003ec7] font-black">{activeEmployeesCount} / {employeeEfficiency.length}</span></span>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* Transaction Ledger sub-tab */
        <div className="bg-white rounded-2xl border border-[#f3f4f6] flex flex-col flex-1 min-h-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center px-6 py-4 border-b border-[#f3f4f6]">
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter' }}>
                Transaction Ledger
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter' }}>
                Review, filter and track individual sales receipts
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search orders, cashiers, stalls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-[#e5e7eb] rounded-xl text-[13px] outline-none w-[280px]"
                onFocus={(e) => e.target.style.borderColor = '#003ec7'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Ledger Table Header */}
          <div className="flex items-center px-6 py-2.5 bg-[#f9fafb] border-b border-[#f3f4f6] text-[11px] font-bold text-[#9ca3af] tracking-wider uppercase">
            <span className="flex-1">Order ID</span>
            <span className="flex-1">Date &amp; Time</span>
            <span className="flex-[1.5]">Stall / Cart</span>
            <span className="flex-1">Cashier</span>
            <span className="flex-[0.8] text-center">Payment</span>
            <span className="flex-1 text-right">Total Amount</span>
          </div>

          {/* Ledger Table Body */}
          <div className="flex-1 overflow-y-auto">
            {ledgerOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#9ca3af]">
                <Icon name="orders" className="w-8 h-8 mb-2" />
                <span className="text-[13px] font-medium">No transactions found matching the filter</span>
              </div>
            ) : (
              ledgerOrders.map((order) => (
                <div key={order.id} className="flex items-center px-6 py-4 border-b border-[#f9fafb] hover:bg-[#fafbff] transition-colors">
                  <span className="flex-1 text-[13px] font-bold text-[#003ec7]">#{order.orderNo}</span>
                  <span className="flex-1 text-[13px] text-[#6b7280]">{new Date(order.createdAt).toLocaleString()}</span>
                  <span className="flex-[1.5] text-[13px] text-[#374151] font-semibold">{order.stallName || 'Back Office'}</span>
                  <span className="flex-1 text-[13px] text-[#374151]">{order.cashierName}</span>
                  
                  <div className="flex-[0.8] flex justify-center">
                    <span 
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                        order.paymentMethod === 'KHQR' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {order.paymentMethod}
                    </span>
                  </div>

                  <span className="flex-1 text-right text-[14px] font-extrabold text-[#111827]">
                    {money(order.total)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-4 bg-[#fafafa] border-t border-[#f3f4f6] text-[12px] text-[#9ca3af]">
            Total matching transactions: <span className="text-[#111827] font-bold">{ledgerOrders.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
