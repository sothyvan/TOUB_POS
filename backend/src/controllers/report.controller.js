import { Order, Stall } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get daily summary report of completed transactions.
 */
export async function getDailySummary(req, res, next) {
  try {
    const { date } = req.query; // YYYY-MM-DD
    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all completed orders for the specified date
    const orders = await Order.findAll({
      where: {
        status: 'completed',
        created_at: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      include: [{ model: Stall, attributes: ['name'] }],
    });

    let totalRevenue = 0;
    let cashRevenue = 0;
    let khqrRevenue = 0;
    let cashCount = 0;
    let khqrCount = 0;

    const stallStats = {};

    for (const order of orders) {
      const amount = parseFloat(order.total_usd || 0);
      totalRevenue += amount;

      if (order.payment_method === 'cash') {
        cashRevenue += amount;
        cashCount++;
      } else if (order.payment_method === 'khqr') {
        khqrRevenue += amount;
        khqrCount++;
      }

      const stallName = order.Stall?.name || 'Unknown Stall';
      if (!stallStats[stallName]) {
        stallStats[stallName] = { count: 0, revenue: 0 };
      }
      stallStats[stallName].count++;
      stallStats[stallName].revenue += amount;
    }

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        totalOrders: orders.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        breakdown: {
          cash: { count: cashCount, revenue: parseFloat(cashRevenue.toFixed(2)) },
          khqr: { count: khqrCount, revenue: parseFloat(khqrRevenue.toFixed(2)) },
        },
        stalls: Object.entries(stallStats).map(([name, stats]) => ({
          stallName: name,
          orderCount: stats.count,
          revenue: parseFloat(stats.revenue.toFixed(2)),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
