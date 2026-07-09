import { useEffect, useState, useMemo } from 'react';
import { money } from '../utils/format';
import Icon from './ui/Icon';
import ReceiptModal from './ReceiptModal';
import { useSalesReport } from '../hooks/useSalesReport';

const kitchenStatusConfig = {
  sent: {
    label: 'Sent',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  done: {
    label: 'Done',
    className: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  not_sent: {
    label: 'Not sent',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  not_ready: {
    label: 'Not ready',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
};

function getKitchenStatusConfig(status) {
  return kitchenStatusConfig[status] || kitchenStatusConfig.not_ready;
}

function canRetryKitchenTicket(order) {
  return order.status === 'paid' && ['failed', 'not_sent'].includes(order.kitchenStatus);
}

function isPendingKhqrOrder(order) {
  return order.paymentMethod === 'KHQR' && order.status === 'pending_payment';
}

function isExpiredKhqrOrder(order, nowMs) {
  if (!isPendingKhqrOrder(order) || !order.paymentExpiresAt) {
    return false;
  }

  const expiryTime = new Date(order.paymentExpiresAt).getTime();
  return Number.isFinite(expiryTime) && expiryTime < Number(nowMs || 0);
}

function matchesOperationalFilter(order, filterId, nowMs) {
  if (!filterId) {
    return true;
  }

  switch (filterId) {
    case 'failed-kitchen':
      return order.status === 'paid' && order.kitchenStatus === 'failed';
    case 'missing-kitchen':
      return order.status === 'paid' && order.kitchenStatus === 'not_sent';
    case 'waiting-kitchen':
      return (order.status === 'paid' && order.kitchenStatus === 'pending')
        || (isPendingKhqrOrder(order) && !isExpiredKhqrOrder(order, nowMs));
    case 'expired-khqr':
      return isExpiredKhqrOrder(order, nowMs);
    case 'pending-khqr':
      return isPendingKhqrOrder(order) && !isExpiredKhqrOrder(order, nowMs);
    default:
      return true;
  }
}

const alertToneConfig = {
  danger: {
    panelClassName: 'border-red-100 bg-red-50',
    iconClassName: 'bg-red-100 text-red-700',
    countClassName: 'text-red-700',
    buttonClassName: 'border-red-200 bg-white text-red-700 hover:bg-red-100',
  },
  warning: {
    panelClassName: 'border-amber-100 bg-amber-50',
    iconClassName: 'bg-amber-100 text-amber-700',
    countClassName: 'text-amber-700',
    buttonClassName: 'border-amber-200 bg-white text-amber-700 hover:bg-amber-100',
  },
  info: {
    panelClassName: 'border-blue-100 bg-blue-50',
    iconClassName: 'bg-blue-100 text-blue-700',
    countClassName: 'text-blue-700',
    buttonClassName: 'border-blue-200 bg-white text-blue-700 hover:bg-blue-100',
  },
  success: {
    panelClassName: 'border-green-100 bg-green-50',
    iconClassName: 'bg-green-100 text-green-700',
    countClassName: 'text-green-700',
    buttonClassName: 'border-green-200 bg-white text-green-700 hover:bg-green-100',
  },
};

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export default function OrderHistory({ orders: rawOrders = [], onRetryTelegramDispatch }) {
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'week' | 'month'
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'ledger'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStallId, setSelectedStallId] = useState('');
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState(null);
  const [kitchenRetryError, setKitchenRetryError] = useState('');
  const [activeOperationalFilter, setActiveOperationalFilter] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const refreshNow = () => setNowMs(Date.now());
    refreshNow();
    const intervalId = window.setInterval(refreshNow, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const allOrders = useMemo(() => {
    return rawOrders;
  }, [rawOrders]);

  const {
    report,
    loading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useSalesReport({
    range: dateFilter,
    stallId: selectedStallId,
    cashierId: selectedCashierId,
  });

  const stallFilterOptions = useMemo(() => {
    const map = new Map();
    allOrders.forEach((order) => {
      if (order.stallId) {
        map.set(order.stallId, order.stallName || `Stall #${order.stallId}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allOrders]);

  const cashierFilterOptions = useMemo(() => {
    const map = new Map();
    allOrders.forEach((order) => {
      if (order.cashierId) {
        map.set(order.cashierId, order.cashierName || `Cashier #${order.cashierId}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allOrders]);

  // Filter orders by date range
  const fallbackFilteredOrders = useMemo(() => {
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
      if (selectedStallId && Number(order.stallId) !== Number(selectedStallId)) {
        return false;
      }
      if (selectedCashierId && Number(order.cashierId) !== Number(selectedCashierId)) {
        return false;
      }
      if (dateFilter === 'today') {
        return orderDate.toDateString() === todayStr;
      } else if (dateFilter === 'week') {
        return orderDate >= startOfWeek;
      } else if (dateFilter === 'month') {
        return orderDate >= startOfMonth;
      }
      return true;
    });
  }, [allOrders, dateFilter, selectedStallId, selectedCashierId]);

  const filteredOrders = report?.orders || fallbackFilteredOrders;

  // Compute Revenue KPIs
  const paidFilteredOrders = useMemo(() => {
    return filteredOrders.filter((order) => order.status === 'paid');
  }, [filteredOrders]);

  const localTotalRevenue = useMemo(() => {
    return paidFilteredOrders.reduce((sum, o) => sum + o.total, 0);
  }, [paidFilteredOrders]);

  const totalRevenue = report?.summary?.totalRevenue ?? localTotalRevenue;

  const activeStallNames = useMemo(() => {
    if (report?.byStall) {
      return report.byStall.map((stall) => stall.stallName).filter(Boolean);
    }

    return Array.from(new Set(
      paidFilteredOrders
        .map((order) => order.stallName)
        .filter(Boolean)
    ));
  }, [paidFilteredOrders, report]);

  const paymentBreakdown = useMemo(() => {
    if (report?.summary?.paymentMethods) {
      return {
        cash: {
          count: report.summary.paymentMethods.cash?.count || 0,
          total: report.summary.paymentMethods.cash?.revenue || 0,
        },
        khqr: {
          count: report.summary.paymentMethods.khqr?.count || 0,
          total: report.summary.paymentMethods.khqr?.revenue || 0,
        },
      };
    }

    return paidFilteredOrders.reduce((summary, order) => {
      const method = order.paymentMethod === 'KHQR' ? 'khqr' : 'cash';
      summary[method].count += 1;
      summary[method].total += Number(order.total || 0);
      return summary;
    }, {
      cash: { count: 0, total: 0 },
      khqr: { count: 0, total: 0 },
    });
  }, [paidFilteredOrders, report]);

  // Employee Efficiency Table Data
  const employeeEfficiency = useMemo(() => {
    if (report?.byCashier) {
      return report.byCashier.map((cashier) => ({
        name: cashier.cashierName,
        stallName: cashier.stallName || '—',
        ordersCount: cashier.orderCount,
        salesTotal: cashier.revenue,
        averageTicket: cashier.orderCount > 0 ? cashier.revenue / cashier.orderCount : 0,
      }));
    }

    const cashierData = {};
    paidFilteredOrders.forEach(order => {
      const name = order.cashierName || 'Cashier';
      if (!cashierData[name]) {
        cashierData[name] = {
          name,
          stallName: order.stallName || '—',
          ordersCount: 0,
          salesTotal: 0,
          averageTicket: 0,
        };
      }
      cashierData[name].ordersCount += 1;
      cashierData[name].salesTotal += Number(order.total || 0);
    });

    return Object.values(cashierData).map((c) => {
      return {
        ...c,
        averageTicket: c.ordersCount > 0 ? c.salesTotal / c.ordersCount : 0,
      };
    });
  }, [paidFilteredOrders, report]);

  const totalCompletedOrders = report?.summary?.paidOrders ?? paidFilteredOrders.length;

  const handleExport = () => {
    setExporting(true);
    try {
      const headers = ['Order ID', 'Date', 'Stall', 'Cashier', 'Payment', 'Status', 'Kitchen', 'Total'];
      const rows = ledgerOrders.map((order) => [
        order.orderNo,
        new Date(order.createdAt).toLocaleString(),
        order.stallName || '',
        order.cashierName || '',
        order.paymentMethod || '',
        order.status || '',
        getKitchenStatusConfig(order.kitchenStatus).label,
        Number(order.total || 0).toFixed(2),
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `toub-sales-${dateFilter}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchReport(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetryKitchenTicket = async (order) => {
    if (!onRetryTelegramDispatch || !canRetryKitchenTicket(order)) {
      return;
    }

    try {
      setKitchenRetryError('');
      setRetryingOrderId(order.id);
      const updatedOrder = await onRetryTelegramDispatch(order.id);
      if (updatedOrder?.kitchenStatus === 'failed') {
        setKitchenRetryError(`Telegram retry for ${order.orderNo} finished, but the ticket is still failed.`);
      }
    } catch (error) {
      setKitchenRetryError(error.message || 'Unable to retry Telegram kitchen ticket.');
    } finally {
      setRetryingOrderId(null);
    }
  };

  const handleViewReceipt = (order) => {
    const detailedOrder = allOrders.find((item) => Number(item.id) === Number(order.id));
    setActiveReceipt(detailedOrder || { ...order, items: [] });
  };

  const sparklinePoints = useMemo(() => {
    const slots = report?.byHour?.length
      ? report.byHour.map((hour) => Number(hour.revenue || 0))
      : filteredOrders.reduce((bucket, order) => {
          const hour = new Date(order.createdAt).getHours();
          if (Number.isInteger(hour) && hour >= 0 && hour < 24 && order.status === 'paid') {
            bucket[hour] += Number(order.total || 0);
          }
          return bucket;
        }, Array(24).fill(0));

    if (!slots.some((value) => value > 0)) {
      return '0,30 22,30 44,30 66,30 88,30 110,30';
    }

    const maxVal = Math.max(...slots) || 1;
    const step = 110 / Math.max(slots.length - 1, 1);
    return slots.map((val, idx) => {
      const x = idx * step;
      const y = 35 - (val / maxVal) * 30;
      return `${x},${y}`;
    }).join(' ');
  }, [filteredOrders, report]);

  const normalizedSearch = searchQuery.toLowerCase();
  const ledgerOrders = filteredOrders.filter((order) => {
    if (!matchesOperationalFilter(order, activeOperationalFilter, nowMs)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return order.orderNo.toLowerCase().includes(normalizedSearch) ||
      (order.cashierName || '').toLowerCase().includes(normalizedSearch) ||
      (order.stallName && order.stallName.toLowerCase().includes(normalizedSearch)) ||
      (order.kitchenStatus && order.kitchenStatus.toLowerCase().includes(normalizedSearch)) ||
      (order.paymentMethod && order.paymentMethod.toLowerCase().includes(normalizedSearch)) ||
      (order.status && order.status.toLowerCase().includes(normalizedSearch));
  });

  const operationalAlerts = useMemo(() => {
    const failedKitchenTickets = filteredOrders.filter(
      (order) => order.status === 'paid' && order.kitchenStatus === 'failed'
    );
    const missingKitchenTickets = filteredOrders.filter(
      (order) => order.status === 'paid' && order.kitchenStatus === 'not_sent'
    );
    const pendingKitchenTickets = filteredOrders.filter(
      (order) => order.status === 'paid' && order.kitchenStatus === 'pending'
    );
    const expiredKhqrOrders = filteredOrders.filter((order) => isExpiredKhqrOrder(order, nowMs));
    const pendingKhqrOrders = filteredOrders.filter((order) => (
      isPendingKhqrOrder(order) && !isExpiredKhqrOrder(order, nowMs)
    ));
    const waitingForKitchenTickets = [
      ...pendingKitchenTickets,
      ...pendingKhqrOrders,
    ];

    return [
      {
        id: 'failed-kitchen',
        label: 'Kitchen failed',
        count: failedKitchenTickets.length,
        description: 'Telegram send failed. Retry these tickets.',
        tone: 'danger',
        filter: 'failed',
      },
      {
        id: 'missing-kitchen',
        label: 'Kitchen missing',
        count: missingKitchenTickets.length,
        description: 'Paid orders without a kitchen ticket.',
        tone: 'warning',
        filter: 'not_sent',
      },
      {
        id: 'waiting-kitchen',
        label: 'Kitchen waiting',
        count: waitingForKitchenTickets.length,
        description: 'Waiting on payment or Telegram dispatch.',
        tone: 'info',
      },
      {
        id: 'expired-khqr',
        label: 'KHQR expired',
        count: expiredKhqrOrders.length,
        description: 'Pending QR payments past expiry.',
        tone: 'danger',
        filter: 'KHQR',
      },
      {
        id: 'pending-khqr',
        label: 'KHQR waiting',
        count: pendingKhqrOrders.length,
        description: 'Payments still awaiting Bakong confirmation.',
        tone: 'info',
      },
    ];
  }, [filteredOrders, nowMs]);

  const hasOperationalAlerts = operationalAlerts.some((alert) => alert.count > 0);

  const handleOperationalAlertClick = (alert) => {
    setActiveOperationalFilter(alert.id);
    setSearchQuery('');
    setActiveSubTab('ledger');
  };

  const activeOperationalAlert = operationalAlerts.find((alert) => alert.id === activeOperationalFilter);

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

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Live indicator badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7]">
            <span className={`w-2 h-2 rounded-full ${reportLoading ? 'bg-amber-500' : 'bg-[#22c55e]'} animate-pulse`} />
            <span style={{ fontSize: 11, fontWeight: 700, color: reportLoading ? '#b45309' : '#15803d', fontFamily: 'Inter' }}>
              {reportLoading ? 'Loading report' : 'Backend report'}
            </span>
          </div>

          <select
            value={selectedStallId}
            onChange={(event) => setSelectedStallId(event.target.value)}
            className="h-9 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[12px] font-bold text-[#374151] outline-none focus:border-[#003ec7]"
          >
            <option value="">All Stalls</option>
            {stallFilterOptions.map((stall) => (
              <option key={stall.id} value={stall.id}>{stall.name}</option>
            ))}
          </select>

          <select
            value={selectedCashierId}
            onChange={(event) => setSelectedCashierId(event.target.value)}
            className="h-9 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[12px] font-bold text-[#374151] outline-none focus:border-[#003ec7]"
          >
            <option value="">All Cashiers</option>
            {cashierFilterOptions.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>{cashier.name}</option>
            ))}
          </select>

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

      {reportError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
          {reportError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#f3f4f6] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="m-0 text-[15px] font-extrabold text-[#111827] fontFamily-['Inter']">
              Operations Watch
            </h3>
            <p className="m-0 mt-0.5 text-[12px] text-[#9ca3af] fontFamily-['Inter']">
              Live payment and kitchen handoff signals for the selected date range
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold uppercase ${
            hasOperationalAlerts
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasOperationalAlerts ? 'bg-amber-500' : 'bg-green-500'}`} />
            {hasOperationalAlerts ? 'Needs attention' : 'Healthy'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-3 max-[1280px]:grid-cols-3 max-[900px]:grid-cols-1">
          {operationalAlerts.map((alert) => {
            const tone = alertToneConfig[alert.count > 0 ? alert.tone : 'success'];
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => handleOperationalAlertClick(alert)}
                className={`text-left rounded-xl border p-3 cursor-pointer transition-all active:scale-[0.99] ${tone.panelClassName}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[12px] font-extrabold text-[#374151]">{alert.label}</span>
                    <span className="block mt-1 text-[11px] font-semibold text-[#6b7280] leading-snug">
                      {alert.count > 0 ? alert.description : 'No issue in this range.'}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone.iconClassName}`}>
                    <Icon name={alert.count > 0 ? 'warning' : 'check'} className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-[24px] font-black leading-none ${tone.countClassName}`}>
                    {alert.count}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase ${tone.buttonClassName}`}>
                    View
                  </span>
                </div>
              </button>
            );
          })}
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
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter' }}>Total Revenue</h4>
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
                  Backend-owned paid orders in this range
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

            {/* CardStalls */}
            <div className="bg-white p-5 rounded-2xl border border-[#f3f4f6] flex flex-col justify-between h-[180px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start">
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter' }}>Selling Stalls</h4>
                  <span className="block mt-1" style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter' }}>
                    {activeStallNames.length}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] flex items-center justify-center text-[#0284c7]">
                  <Icon name="location" className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 my-2">
                {activeStallNames.length > 0 ? activeStallNames.slice(0, 4).map((stallName) => (
                  <div 
                    key={stallName}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50 text-[11px] font-bold text-blue-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {stallName}
                  </div>
                )) : (
                  <span className="text-[12px] font-semibold text-[#9ca3af]">No paid stall activity in this range.</span>
                )}
              </div>
              
              <div className="text-[12px] text-[#9ca3af] fontFamily-['Inter']">
                Based on paid orders in the selected date range.
              </div>
            </div>

            {/* CardPaymentMix */}
            <div className="bg-white p-5 rounded-2xl border border-[#f3f4f6] flex flex-col justify-between h-[180px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start">
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter' }}>Payment Mix</h4>
                  <span className="block mt-1" style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter' }}>
                    {paymentBreakdown.cash.count + paymentBreakdown.khqr.count} Paid
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                  <Icon name="khqr" className="w-4 h-4" />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between text-[12px] font-bold text-[#374151]">
                  <span>Cash</span>
                  <span>{paymentBreakdown.cash.count} · {money(paymentBreakdown.cash.total)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px] font-bold text-[#374151]">
                  <span>KHQR</span>
                  <span>{paymentBreakdown.khqr.count} · {money(paymentBreakdown.khqr.total)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Cashier Sales Matrix */}
          <div className="bg-white rounded-2xl border border-[#f3f4f6] flex flex-col flex-1 min-h-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#f3f4f6]">
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter' }}>
                  Cashier Sales Matrix
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter' }}>
                  {employeeEfficiency.length} cashiers with paid sales · {totalCompletedOrders} paid orders
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
              <span className="flex-1 text-center">Sales Total</span>
              <span className="flex-1 text-center">Avg Ticket</span>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto">
              {employeeEfficiency.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#9ca3af]">
                  <Icon name="users" className="w-8 h-8 mb-2" />
                  <span className="text-[13px] font-medium">No paid cashier sales in this range</span>
                </div>
              ) : employeeEfficiency.map((emp) => (
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
                  
                  <span className="flex-1 text-center text-[13px] font-extrabold text-[#111827]">
                    {money(emp.salesTotal)}
                  </span>

                  <span className="flex-1 text-center text-[13px] font-extrabold text-[#111827]">
                    {money(emp.averageTicket)}
                  </span>
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
                <span>Total Sales: <span className="text-[#003ec7] font-black">{money(totalRevenue)}</span></span>
                <span>Cashiers: <span className="text-[#003ec7] font-black">{employeeEfficiency.length}</span></span>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* Transaction Ledger sub-tab */
        <div className="bg-white rounded-2xl border border-[#f3f4f6] flex flex-col flex-1 min-h-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="border-b border-[#f3f4f6]">
            <div className="flex justify-between items-center px-6 py-4">
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
                  onChange={(e) => {
                    setActiveOperationalFilter(null);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-9 pr-4 py-2 border border-[#e5e7eb] rounded-xl text-[13px] outline-none w-[280px]"
                  onFocus={(e) => e.target.style.borderColor = '#003ec7'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {kitchenRetryError && (
              <div className="mx-6 mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
                {kitchenRetryError}
              </div>
            )}

            {activeOperationalAlert && (
              <div className="mx-6 mb-4 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] font-semibold text-blue-700">
                <span>
                  Showing {activeOperationalAlert.label.toLowerCase()} orders only.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveOperationalFilter(null)}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-[11px] font-extrabold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>

          {/* Ledger Table Header */}
          <div className="flex items-center px-6 py-2.5 bg-[#f9fafb] border-b border-[#f3f4f6] text-[11px] font-bold text-[#9ca3af] tracking-wider uppercase">
            <span className="flex-1">Order ID</span>
            <span className="flex-1">Date &amp; Time</span>
            <span className="flex-[1.35]">Stall / Cart</span>
            <span className="flex-1">Cashier</span>
            <span className="flex-[0.8] text-center">Payment</span>
            <span className="flex-1 text-center">Kitchen</span>
            <span className="flex-1 text-right">Total Amount</span>
            <span className="flex-[1.3] text-right">Actions</span>
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
                  <span className="flex-[1.35] text-[13px] text-[#374151] font-semibold">{order.stallName || 'Back Office'}</span>
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

                  <div className="flex-1 flex justify-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${getKitchenStatusConfig(order.kitchenStatus).className}`}>
                      {getKitchenStatusConfig(order.kitchenStatus).label}
                    </span>
                  </div>

                  <span className="flex-1 text-right text-[14px] font-extrabold text-[#111827]">
                    {money(order.total)}
                  </span>

                  <div className="flex-[1.3] flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(order)}
                      className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      Receipt
                    </button>
                    {canRetryKitchenTicket(order) ? (
                      <button
                        type="button"
                        onClick={() => handleRetryKitchenTicket(order)}
                        disabled={retryingOrderId === order.id}
                        className="cursor-pointer px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-[11px] font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
                      >
                        {retryingOrderId === order.id ? 'Retrying...' : 'Retry'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-4 bg-[#fafafa] border-t border-[#f3f4f6] text-[12px] text-[#9ca3af]">
            Total matching transactions: <span className="text-[#111827] font-bold">{ledgerOrders.length}</span>
          </div>
        </div>
      )}

      <ReceiptModal
        activeReceipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
}
