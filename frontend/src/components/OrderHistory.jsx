import { useEffect, useState, useMemo } from 'react';
import { money } from '../utils/format';
import Icon from './ui/Icon';
import ReceiptModal from './ReceiptModal';
import { useSalesReport } from '../hooks/useSalesReport';
import DateRangeDialog from './reports/DateRangeDialog';

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

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return 'Custom dates';

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: start.getFullYear() === end.getFullYear() ? undefined : 'numeric',
  });
  const endFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (startDate === endDate) return endFormatter.format(start);
  return `${formatter.format(start)} - ${endFormatter.format(end)}`;
}

export default function OrderHistory({ orders: rawOrders = [], onRetryTelegramDispatch }) {
  const today = localDateValue();
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'week' | 'month' | 'custom'
  const [customDateRange, setCustomDateRange] = useState({ startDate: today, endDate: today });
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'ledger'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStallId, setSelectedStallId] = useState('');
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
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
    startDate: customDateRange.startDate,
    endDate: customDateRange.endDate,
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
    const customStart = new Date(`${customDateRange.startDate}T00:00:00`);
    const customEnd = new Date(`${customDateRange.endDate}T23:59:59.999`);

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
      } else if (dateFilter === 'custom') {
        return orderDate >= customStart && orderDate <= customEnd;
      }
      return true;
    });
  }, [allOrders, customDateRange, dateFilter, selectedStallId, selectedCashierId]);

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

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      if (!report) {
        throw new Error('Wait for the backend report to finish loading before exporting.');
      }

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModule.default;
      const document = new jsPDF({ unit: 'pt', format: 'a4' });
      const summary = report.summary || {};
      const rangeLabel = formatDateRange(report.filters?.startDate, report.filters?.endDate);
      const stallLabel = stallFilterOptions.find(
        (stall) => Number(stall.id) === Number(selectedStallId)
      )?.name || 'All stalls';
      const cashierLabel = cashierFilterOptions.find(
        (cashier) => Number(cashier.id) === Number(selectedCashierId)
      )?.name || 'All cashiers';
      const tableStyles = {
        fontSize: 8,
        cellPadding: 5,
        textColor: [55, 65, 81],
      };
      const headStyles = {
        fillColor: [0, 62, 199],
        textColor: 255,
        fontStyle: 'bold',
      };

      document.setTextColor(17, 24, 39);
      document.setFontSize(20);
      document.setFont('helvetica', 'bold');
      document.text('TouB POS Sales Report', 40, 48);
      document.setFontSize(9);
      document.setFont('helvetica', 'normal');
      document.setTextColor(107, 114, 128);
      document.text(`Date range: ${rangeLabel}`, 40, 68);
      document.text(`Filters: ${stallLabel} | ${cashierLabel}`, 40, 82);
      document.text(`Generated: ${new Date().toLocaleString()}`, 40, 96);

      autoTable(document, {
        startY: 114,
        head: [['Total revenue', 'Paid orders', 'Average order', 'Cash', 'KHQR']],
        body: [[
          money(summary.totalRevenue || 0),
          String(summary.paidOrders || 0),
          money(summary.averageOrderValue || 0),
          `${summary.paymentMethods?.cash?.count || 0} / ${money(summary.paymentMethods?.cash?.revenue || 0)}`,
          `${summary.paymentMethods?.khqr?.count || 0} / ${money(summary.paymentMethods?.khqr?.revenue || 0)}`,
        ]],
        styles: tableStyles,
        headStyles,
        theme: 'grid',
      });

      autoTable(document, {
        startY: document.lastAutoTable.finalY + 18,
        head: [['Stall', 'Paid orders', 'Revenue']],
        body: report.byStall?.length
          ? report.byStall.map((stall) => [stall.stallName, stall.orderCount, money(stall.revenue)])
          : [['No paid stall sales in this range', '0', money(0)]],
        styles: tableStyles,
        headStyles,
        theme: 'striped',
      });

      autoTable(document, {
        startY: document.lastAutoTable.finalY + 18,
        head: [['Cashier', 'Stall', 'Paid orders', 'Revenue', 'Average ticket']],
        body: employeeEfficiency.length
          ? employeeEfficiency.map((cashier) => [
              cashier.name,
              cashier.stallName,
              cashier.ordersCount,
              money(cashier.salesTotal),
              money(cashier.averageTicket),
            ])
          : [['No paid cashier sales in this range', '-', '0', money(0), money(0)]],
        styles: tableStyles,
        headStyles,
        theme: 'striped',
      });

      autoTable(document, {
        startY: document.lastAutoTable.finalY + 18,
        head: [['Order', 'Date and time', 'Stall', 'Cashier', 'Payment', 'Status', 'Total']],
        body: filteredOrders.length
          ? filteredOrders.map((order) => [
              `#${order.orderNo}`,
              new Date(order.createdAt).toLocaleString(),
              order.stallName || '-',
              order.cashierName || '-',
              order.paymentMethod || '-',
              order.status || '-',
              money(order.total || 0),
            ])
          : [['No transactions in this range', '-', '-', '-', '-', '-', money(0)]],
        styles: tableStyles,
        headStyles,
        theme: 'grid',
        margin: { left: 32, right: 32 },
      });

      const pageCount = document.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        document.setPage(page);
        document.setFontSize(8);
        document.setTextColor(156, 163, 175);
        document.text(`TouB POS | Page ${page} of ${pageCount}`, 40, 816);
      }

      const fileStart = report.filters?.startDate || dateFilter;
      const fileEnd = report.filters?.endDate;
      const fileRange = fileEnd && fileEnd !== fileStart ? `${fileStart}-to-${fileEnd}` : fileStart;
      document.save(`toub-sales-${fileRange}.pdf`);
    } catch (error) {
      setExportError(error.message || 'Unable to export this report as PDF.');
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
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-[#f3f4f6] shrink-0 max-[900px]:flex-col max-[900px]:items-stretch">
        <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl w-fit max-[900px]:grid max-[900px]:w-full max-[900px]:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('analytics')}
            className={`cursor-pointer px-4 py-1.5 rounded-lg border-none text-[13px] font-bold font-sans transition-all max-[480px]:px-2 ${
              activeSubTab === 'analytics' ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
            }`}
          >
            Analytics Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`cursor-pointer px-4 py-1.5 rounded-lg border-none text-[13px] font-bold font-sans transition-all max-[480px]:px-2 ${
              activeSubTab === 'ledger' ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
            }`}
          >
            Transaction Ledger
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:justify-stretch">
          {/* Live indicator badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] border border-[#dcfce7] max-[900px]:col-span-2 max-[900px]:w-fit">
            <span className={`w-2 h-2 rounded-full ${reportLoading ? 'bg-amber-500' : 'bg-[#22c55e]'} animate-pulse`} />
            <span style={{ fontSize: 11, fontWeight: 700, color: reportLoading ? '#b45309' : '#15803d', fontFamily: 'Inter, sans-serif' }}>
              {reportLoading ? 'Loading report' : 'Backend report'}
            </span>
          </div>

          <select
            value={selectedStallId}
            onChange={(event) => setSelectedStallId(event.target.value)}
            className="h-9 min-w-0 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[12px] font-bold text-[#374151] outline-none focus:border-[#003ec7]"
          >
            <option value="">All Stalls</option>
            {stallFilterOptions.map((stall) => (
              <option key={stall.id} value={stall.id}>{stall.name}</option>
            ))}
          </select>

          <select
            value={selectedCashierId}
            onChange={(event) => setSelectedCashierId(event.target.value)}
            className="h-9 min-w-0 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[12px] font-bold text-[#374151] outline-none focus:border-[#003ec7]"
          >
            <option value="">All Cashiers</option>
            {cashierFilterOptions.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>{cashier.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl max-[900px]:col-span-2 max-[900px]:grid max-[900px]:grid-cols-4 max-[520px]:grid-cols-2">
            {['today', 'week', 'month'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDateFilter(t)}
                aria-pressed={dateFilter === t}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg border-none text-[12px] font-extrabold uppercase tracking-wider font-sans transition-all ${
                  dateFilter === t ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsDateRangeOpen(true)}
              aria-pressed={dateFilter === 'custom'}
              className={`cursor-pointer px-3.5 py-1.5 rounded-lg border-none text-[12px] font-extrabold uppercase tracking-wider font-sans transition-all ${
                dateFilter === 'custom' ? 'bg-white text-[#003ec7] shadow-sm' : 'text-[#6b7280]'
              }`}
            >
              Custom
            </button>
          </div>
        </div>
      </div>

      {dateFilter === 'custom' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-[12px] font-semibold text-blue-900">
          <span>
            Showing {formatDateRange(customDateRange.startDate, customDateRange.endDate)}
          </span>
          <button
            type="button"
            onClick={() => setIsDateRangeOpen(true)}
            className="cursor-pointer rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-extrabold text-blue-700 transition-colors hover:bg-blue-100"
          >
            Change dates
          </button>
        </div>
      ) : null}

      {reportError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
          {reportError}
        </div>
      )}

      {exportError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
          {exportError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#f3f4f6] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="m-0 text-[15px] font-extrabold text-[#111827] font-sans">
              Operations Watch
            </h3>
            <p className="m-0 mt-0.5 text-[12px] text-[#9ca3af] font-sans">
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
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Total Revenue</h4>
                  <span className="block mt-1" style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                    {money(totalRevenue)}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#dcfce7] flex items-center justify-center text-[#15803d]">
                  <Icon name="trendUp" className="w-4 h-4" />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[12px] text-[#9ca3af] font-sans">
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
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Selling Stalls</h4>
                  <span className="block mt-1" style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
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
              
              <div className="text-[12px] text-[#9ca3af] font-sans">
                Based on paid orders in the selected date range.
              </div>
            </div>

            {/* CardPaymentMix */}
            <div className="bg-white p-5 rounded-2xl border border-[#f3f4f6] flex flex-col justify-between h-[180px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-start">
                <div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Payment Mix</h4>
                  <span className="block mt-1" style={{ fontSize: 28, fontWeight: 800, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
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
            <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-b border-[#f3f4f6] max-[640px]:px-4">
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                  Cashier Sales Matrix
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
                  {employeeEfficiency.length} cashiers with paid sales · {totalCompletedOrders} paid orders
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || reportLoading || !report}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e7eb] bg-white text-[12px] font-bold text-[#6b7280] cursor-pointer hover:bg-gray-50 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting ? 'Creating PDF...' : 'Export PDF'}
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
            <div className="flex items-center px-6 py-2.5 bg-[#f9fafb] border-b border-[#f3f4f6] text-[11px] font-bold text-[#9ca3af] tracking-wider uppercase max-[900px]:hidden">
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
                <div key={emp.name} className="flex items-center px-6 py-3.5 border-b border-[#f9fafb] hover:bg-[#fafbff] transition-colors max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-3 max-[640px]:px-4">
                  <div className="flex-[2] min-w-[200px] flex items-center gap-3 max-[900px]:col-span-2 max-[900px]:min-w-0">
                    <div className="w-[36px] h-[36px] rounded-full bg-[#eef2ff] text-[#003ec7] flex items-center justify-center font-bold text-[12px]">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="block text-[14px] font-semibold text-[#111827]">{emp.name}</span>
                      <span className="block text-[11px] text-[#9ca3af]">Cashier</span>
                    </div>
                  </div>

                  <span className="flex-1 text-[13px] font-medium text-[#374151]"><span className="hidden text-[10px] uppercase text-[#9ca3af] max-[900px]:block">Stall</span>{emp.stallName}</span>
                  
                  <span className="flex-1 text-center text-[13px] font-semibold text-[#111827] max-[900px]:text-left"><span className="hidden text-[10px] uppercase text-[#9ca3af] max-[900px]:block">Orders</span>
                    {emp.ordersCount} Orders
                  </span>
                  
                  <span className="flex-1 text-center text-[13px] font-extrabold text-[#111827] max-[900px]:text-left"><span className="hidden text-[10px] uppercase text-[#9ca3af] max-[900px]:block">Sales</span>
                    {money(emp.salesTotal)}
                  </span>

                  <span className="flex-1 text-center text-[13px] font-extrabold text-[#111827] max-[900px]:text-left"><span className="hidden text-[10px] uppercase text-[#9ca3af] max-[900px]:block">Avg ticket</span>
                    {money(emp.averageTicket)}
                  </span>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 bg-[#fafafa] border-t border-[#f3f4f6] max-[640px]:px-4">
              <span className="text-[12px] text-[#9ca3af]">
                Showing {employeeEfficiency.length} of {employeeEfficiency.length} employees · Updated just now
              </span>
              <div className="flex flex-wrap gap-4 text-[12px] font-bold text-[#374151]">
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
            <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 max-[640px]:px-4">
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                  Transaction Ledger
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
                  Review, filter and track individual sales receipts
                </p>
              </div>

              {/* Search Input */}
              <div className="relative max-[640px]:w-full">
                <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Search orders, cashiers, stalls..."
                  value={searchQuery}
                  onChange={(e) => {
                    setActiveOperationalFilter(null);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-9 pr-4 py-2 border border-[#e5e7eb] rounded-xl text-[13px] outline-none w-[280px] max-[640px]:w-full"
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
          <div className="flex items-center px-6 py-2.5 bg-[#f9fafb] border-b border-[#f3f4f6] text-[11px] font-bold text-[#9ca3af] tracking-wider uppercase max-[900px]:hidden">
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
                <div key={order.id} className="flex items-center px-6 py-4 border-b border-[#f9fafb] hover:bg-[#fafbff] transition-colors max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-3 max-[640px]:px-4">
                  <span className="flex-1 text-[13px] font-bold text-[#003ec7]">#{order.orderNo}</span>
                  <span className="flex-1 text-[13px] text-[#6b7280] max-[900px]:text-right">{new Date(order.createdAt).toLocaleString()}</span>
                  <span className="flex-[1.35] text-[13px] text-[#374151] font-semibold"><span className="hidden text-[10px] uppercase text-[#9ca3af] max-[900px]:block">Stall</span>{order.stallName || 'Back Office'}</span>
                  <span className="flex-1 text-[13px] text-[#374151]"><span className="hidden text-[10px] uppercase text-[#9ca3af] max-[900px]:block">Cashier</span>{order.cashierName}</span>
                  
                  <div className="flex-[0.8] flex justify-center max-[900px]:justify-start">
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

                  <div className="flex-1 flex justify-center max-[900px]:justify-start">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${getKitchenStatusConfig(order.kitchenStatus).className}`}>
                      {getKitchenStatusConfig(order.kitchenStatus).label}
                    </span>
                  </div>

                  <span className="flex-1 text-right text-[14px] font-extrabold text-[#111827] max-[900px]:text-left"><span className="hidden text-[10px] uppercase text-[#9ca3af] max-[900px]:block">Total</span>
                    {money(order.total)}
                  </span>

                  <div className="flex-[1.3] flex justify-end gap-2 max-[900px]:justify-start">
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

      {isDateRangeOpen ? (
        <DateRangeDialog
          isOpen
          initialStartDate={customDateRange.startDate}
          initialEndDate={customDateRange.endDate}
          onClose={() => setIsDateRangeOpen(false)}
          onApply={(range) => {
            setCustomDateRange(range);
            setDateFilter('custom');
            setIsDateRangeOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
