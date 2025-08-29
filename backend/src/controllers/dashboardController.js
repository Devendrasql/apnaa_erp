// In backend/src/controllers/dashboardController.js

const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');

/**
 * @desc    Get key statistics for the main dashboard.
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getStats = async (req, res, next) => {
  try {
    // NOTE: This query now correctly counts sellable product variants instead of master products.
    const [productResult] = await executeQuery('SELECT COUNT(id) as totalProducts FROM product_variants WHERE is_deleted = FALSE');
    const [customerResult] = await executeQuery('SELECT COUNT(id) as totalCustomers FROM customers WHERE is_deleted = FALSE');
    const [salesResult] = await executeQuery('SELECT SUM(final_amount) as todaySales FROM sales WHERE DATE(sale_date) = CURDATE() AND is_deleted = FALSE');

    // IMPORTANT: This query requires the `v_low_stock_products` view to exist in your database.
    // If this fails, you must create the view using the provided SQL script in the next step.
    const [lowStockResult] = await executeQuery('SELECT COUNT(*) as lowStockCount FROM v_low_stock_products');

    const stats = {
      totalProducts: productResult.totalProducts || 0,
      totalCustomers: customerResult.totalCustomers || 0,
      todaySales: salesResult.todaySales || 0,
      lowStockCount: lowStockResult.lowStockCount || 0,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

/**
 * @desc    Get sales data for a chart (last 7 days).
 * @route   GET /api/dashboard/sales-over-time
 * @access  Private
 */
const getSalesOverTime = async (req, res, next) => {
  try {
    // This query remains correct as the sales table structure is compatible.
    const query = `
      SELECT 
        DATE_FORMAT(sale_date, '%Y-%m-%d') as date, 
        SUM(final_amount) as totalSales
      FROM sales
      WHERE sale_date >= CURDATE() - INTERVAL 7 DAY AND is_deleted = FALSE
      GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
      ORDER BY date ASC;
    `;
    const results = await executeQuery(query);
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error fetching sales over time data:', error);
    next(error);
  }
};


/**
 * @desc    Get top 5 selling products.
 * @route   GET /api/dashboard/top-selling
 * @access  Private
 */
const getTopSellingProducts = async (req, res, next) => {
  try {
    /*
    // === OLD QUERY (COMMENTED OUT) ===
    // This query failed because `sale_items` no longer has a `product_id`.
    const query_old = `
      SELECT 
        p.name, 
        SUM(si.quantity) as totalQuantitySold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.is_deleted = FALSE
      GROUP BY p.name
      ORDER BY totalQuantitySold DESC
      LIMIT 5;
    `;
    */

    // === NEW, CORRECTED QUERY ===
    // This query now correctly joins through the `product_variants` table
    // to get the product name, making it compatible with the new schema.
    const query = `
      SELECT 
        CONCAT(p.name, ' ', COALESCE(pv.strength_label, '')) as productName,
        SUM(si.quantity) as totalQuantitySold
      FROM sale_items si
      JOIN product_variants pv ON si.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE si.is_deleted = FALSE AND p.is_deleted = FALSE
      GROUP BY productName
      ORDER BY totalQuantitySold DESC
      LIMIT 5;
    `;
    const results = await executeQuery(query);
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error fetching top selling products:', error);
    next(error);
  }
};

/**
 * @desc    Get the 5 most recent sales transactions.
 * @route   GET /api/dashboard/recent-sales
 * @access  Private
 */
const getRecentSales = async (req, res, next) => {
    try {
        // This query remains correct as the sales and customers table structures are compatible.
        const query = `
            SELECT 
                s.id,
                s.invoice_number,
                s.final_amount as total_amount,
                s.sale_date,
                CONCAT(c.first_name, ' ', c.last_name) as customer_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.is_deleted = FALSE
            ORDER BY s.sale_date DESC
            LIMIT 5;
        `;
        const results = await executeQuery(query);
        res.status(200).json({
            success: true,
            data: results,
        });
    } catch (error) {
        logger.error('Error fetching recent sales:', error);
        next(error);
    }
};


module.exports = {
  getStats,
  getSalesOverTime,
  getTopSellingProducts,
  getRecentSales,
};





// // In backend/src/controllers/dashboardController.js

// const { executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');

// /**
//  * @desc    Get key statistics for the main dashboard.
//  * @route   GET /api/dashboard/stats
//  * @access  Private
//  */
// const getStats = async (req, res, next) => {
//   try {
//     const [productResult] = await executeQuery('SELECT COUNT(id) as totalProducts FROM products WHERE is_deleted = FALSE');
//     const [customerResult] = await executeQuery('SELECT COUNT(id) as totalCustomers FROM customers WHERE is_deleted = FALSE');
//     const [salesResult] = await executeQuery('SELECT SUM(final_amount) as todaySales FROM sales WHERE DATE(sale_date) = CURDATE() AND is_deleted = FALSE');
//     const [lowStockResult] = await executeQuery('SELECT COUNT(*) as lowStockCount FROM v_low_stock_products');

//     const stats = {
//       totalProducts: productResult.totalProducts || 0,
//       totalCustomers: customerResult.totalCustomers || 0,
//       todaySales: salesResult.todaySales || 0,
//       lowStockCount: lowStockResult.lowStockCount || 0,
//     };

//     res.status(200).json({
//       success: true,
//       data: stats,
//     });
//   } catch (error) {
//     logger.error('Error fetching dashboard stats:', error);
//     next(error);
//   }
// };

// /**
//  * @desc    Get sales data for a chart (last 7 days).
//  * @route   GET /api/dashboard/sales-over-time
//  * @access  Private
//  */
// const getSalesOverTime = async (req, res, next) => {
//   try {
//     const query = `
//       SELECT 
//         DATE_FORMAT(sale_date, '%Y-%m-%d') as date, 
//         SUM(final_amount) as totalSales
//       FROM sales
//       WHERE sale_date >= CURDATE() - INTERVAL 7 DAY AND is_deleted = FALSE
//       GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
//       ORDER BY date ASC;
//     `;
//     const results = await executeQuery(query);
//     res.status(200).json({
//       success: true,
//       data: results,
//     });
//   } catch (error) {
//     logger.error('Error fetching sales over time data:', error);
//     next(error);
//   }
// };


// /**
//  * @desc    Get top 5 selling products.
//  * @route   GET /api/dashboard/top-selling
//  * @access  Private
//  */
// const getTopSellingProducts = async (req, res, next) => {
//   try {
//     const query = `
//       SELECT 
//         p.name, 
//         SUM(si.quantity) as totalQuantitySold
//       FROM sale_items si
//       JOIN products p ON si.product_id = p.id
//       WHERE si.is_deleted = FALSE
//       GROUP BY p.name
//       ORDER BY totalQuantitySold DESC
//       LIMIT 5;
//     `;
//     const results = await executeQuery(query);
//     res.status(200).json({
//       success: true,
//       data: results,
//     });
//   } catch (error) {
//     logger.error('Error fetching top selling products:', error);
//     next(error);
//   }
// };

// /**
//  * @desc    Get the 5 most recent sales transactions.
//  * @route   GET /api/dashboard/recent-sales
//  * @access  Private
//  */
// const getRecentSales = async (req, res, next) => {
//     try {
//         const query = `
//             SELECT 
//                 s.id,
//                 s.invoice_number,
//                 s.final_amount as total_amount,
//                 s.sale_date,
//                 CONCAT(c.first_name, ' ', c.last_name) as customer_name
//             FROM sales s
//             LEFT JOIN customers c ON s.customer_id = c.id
//             WHERE s.is_deleted = FALSE
//             ORDER BY s.sale_date DESC
//             LIMIT 5;
//         `;
//         const results = await executeQuery(query);
//         res.status(200).json({
//             success: true,
//             data: results,
//         });
//     } catch (error) {
//         logger.error('Error fetching recent sales:', error);
//         next(error);
//     }
// };


// module.exports = {
//   getStats,
//   getSalesOverTime,
//   getTopSellingProducts,
//   getRecentSales,
// };





// // // In backend/src/controllers/dashboardController.js

// // const { executeQuery } = require('../utils/database');
// // const logger = require('../utils/logger');

// // // This function contains the logic from your existing file
// // const getDashboardStats = async (req, res, next) => {
// //   try {
// //     // Branch filtering logic from your original file
// //     const { branch_id } = req.query;
// //     let branchFilter = '';
// //     let params = [];

// //     // Only apply branch filter if the user is not a super_admin
// //     if (branch_id && req.user.role !== 'super_admin') {
// //       branchFilter = 'WHERE branch_id = ?';
// //       params.push(branch_id);
// //     }

// //     // Today's sales
// //     const todaySalesQuery = `SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total FROM sales WHERE DATE(sale_date) = CURDATE() ${branchFilter.replace('WHERE', 'AND')}`;
// //     const [todaySales] = await executeQuery(todaySalesQuery, params);

// //     // This month's sales
// //     const monthSalesQuery = `SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total FROM sales WHERE YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE()) ${branchFilter.replace('WHERE', 'AND')}`;
// //     const [monthSales] = await executeQuery(monthSalesQuery, params);

// //     // Low stock alerts
// //     const lowStockQuery = `SELECT COUNT(*) as count FROM low_stock_alerts WHERE is_acknowledged = false ${branchFilter.replace('WHERE', 'AND')}`;
// //     const [lowStock] = await executeQuery(lowStockQuery, params);

// //     // Expiring items (next 30 days)
// //     const expiringQuery = `SELECT COUNT(*) as count FROM expiry_alerts WHERE is_acknowledged = false AND alert_type != 'expired' ${branchFilter.replace('WHERE', 'AND')}`;
// //     const [expiringItems] = await executeQuery(expiringQuery, params);

// //     // Recent sales
// //     const recentSalesQuery = `SELECT s.invoice_number, s.final_amount, s.sale_date, c.first_name, c.last_name, b.name as branch_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN branches b ON s.branch_id = b.id WHERE s.is_cancelled = false ${branchFilter.replace('WHERE', 'AND')} ORDER BY s.sale_date DESC LIMIT 5`;
// //     const recentSales = await executeQuery(recentSalesQuery, params);

// //     res.json({
// //       success: true,
// //       data: {
// //         today_sales: todaySales,
// //         month_sales: monthSales,
// //         low_stock_count: lowStock.count,
// //         expiring_items_count: expiringItems.count,
// //         recent_sales: recentSales
// //       }
// //     });

// //   } catch (error) {
// //     logger.error('Error fetching dashboard stats:', error);
// //     next(error);
// //   }
// // };

// // module.exports = {
// //   getDashboardStats,
// //   // We can add more functions here later, like getSalesOverTime, etc.
// // };
