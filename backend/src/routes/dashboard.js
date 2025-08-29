// In backend/src/routes/dashboard.js

const express = require('express');
const router = express.Router();

const {
  getStats,
  getSalesOverTime, // 1. Import the new function
  getTopSellingProducts,
  getRecentSales,
} = require('../controllers/dashboardController');

// @route   GET /api/dashboard/stats
// @desc    Get key dashboard statistics
// @access  Private
router.get('/stats', getStats);

// @route   GET /api/dashboard/sales-over-time
// @desc    Get sales data for a chart
// @access  Private
router.get('/sales-over-time', getSalesOverTime); // 2. Add the new route

// @route   GET /api/dashboard/top-selling
// @desc    Get top 5 selling products
// @access  Private
router.get('/top-selling', getTopSellingProducts);

// @route   GET /api/dashboard/recent-sales
// @desc    Get 5 most recent sales transactions
// @access  Private
router.get('/recent-sales', getRecentSales);

module.exports = router;



// const express = require('express');
// const { executeQuery } = require('../utils/database');
// const router = express.Router();

// // Get dashboard statistics
// router.get('/stats', async (req, res, next) => {
//   try {
//     const { branch_id } = req.query;
//     let branchFilter = '';
//     let params = [];

//     if (branch_id && req.user.role !== 'super_admin') {
//       branchFilter = 'WHERE branch_id = ?';
//       params.push(branch_id);
//     }

//     // Today's sales
//     const todaySales = await executeQuery(
//       `SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total
//        FROM sales 
//        WHERE DATE(sale_date) = CURDATE() ${branchFilter}`,
//       params
//     );

//     // This month's sales
//     const monthSales = await executeQuery(
//       `SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total
//        FROM sales 
//        WHERE YEAR(sale_date) = YEAR(CURDATE()) 
//        AND MONTH(sale_date) = MONTH(CURDATE()) ${branchFilter}`,
//       params
//     );

//     // Low stock alerts
//     const lowStock = await executeQuery(
//       `SELECT COUNT(*) as count FROM low_stock_alerts 
//        WHERE is_acknowledged = false ${branchFilter}`,
//       params
//     );

//     // Expiring items (next 30 days)
//     const expiringItems = await executeQuery(
//       `SELECT COUNT(*) as count FROM expiry_alerts 
//        WHERE is_acknowledged = false AND alert_type != 'expired' ${branchFilter}`,
//       params
//     );

//     // Recent sales
//     const recentSales = await executeQuery(
//       `SELECT s.invoice_number, s.final_amount, s.sale_date,
//               c.first_name, c.last_name, b.name as branch_name
//        FROM sales s
//        LEFT JOIN customers c ON s.customer_id = c.id
//        LEFT JOIN branches b ON s.branch_id = b.id
//        WHERE s.is_cancelled = false ${branchFilter}
//        ORDER BY s.sale_date DESC LIMIT 5`,
//       params
//     );

//     res.json({
//       success: true,
//       data: {
//         today_sales: todaySales[0],
//         month_sales: monthSales[0],
//         low_stock_count: lowStock[0].count,
//         expiring_items_count: expiringItems[0].count,
//         recent_sales: recentSales
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// module.exports = router;