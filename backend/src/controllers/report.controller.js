import { getSalesReport } from '../services/report.service.js';

/**
 * Get daily summary report of paid transactions.
 */
export async function getDailySummary(req, res, next) {
  try {
    const date = req.query.date;
    const report = await getSalesReport(
      req.user,
      date
        ? { range: 'custom', start_date: date, end_date: date }
        : { range: 'today' }
    );

    res.json({
      success: true,
      data: {
        date: report.filters.startDate,
        totalOrders: report.summary.paidOrders,
        totalRevenue: report.summary.totalRevenue,
        breakdown: report.summary.paymentMethods,
        stalls: report.byStall.map((stall) => ({
          stallName: stall.stallName,
          orderCount: stall.orderCount,
          revenue: stall.revenue,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get filtered sales report for Owner/Manager reporting screens.
 */
export async function getSalesSummary(req, res, next) {
  try {
    const report = await getSalesReport(req.user, req.query);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}
