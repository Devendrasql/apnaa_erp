// In backend/src/controllers/reportController.js

const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');

/**
 * @desc    Generate a daily sales report
 * @route   GET /api/reports/daily-sales
 * @access  Private (Manager/Admin)
 */
const getDailySalesReport = async (req, res, next) => {
    try {
        const { date, branch_id } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: 'A specific date is required for the report.' });
        }

        const whereClauses = ['DATE(s.sale_date) = ?', 's.is_deleted = FALSE'];
        const params = [date];

        if (branch_id) {
            whereClauses.push('s.branch_id = ?');
            params.push(branch_id);
        }

        const whereString = `WHERE ${whereClauses.join(' AND ')}`;

        // Summary Stats
        const summaryQuery = `
            SELECT
                COUNT(id) as total_transactions,
                COALESCE(SUM(final_amount), 0) as total_revenue,
                COALESCE(SUM(total_items), 0) as total_items_sold,
                COALESCE(AVG(final_amount), 0) as average_sale_value
            FROM sales s
            ${whereString}
        `;
        const [summary] = await executeQuery(summaryQuery, params);

        // Payment Method Breakdown
        const paymentMethodsQuery = `
            SELECT
                payment_method,
                COUNT(id) as transaction_count,
                COALESCE(SUM(final_amount), 0) as total_amount
            FROM sales s
            ${whereString}
            GROUP BY payment_method
        `;
        const paymentMethods = await executeQuery(paymentMethodsQuery, params);

        // Top 5 Selling Products for that day
        const topProductsQuery = `
            SELECT 
                p.name as product_name,
                p.sku,
                SUM(si.quantity) as total_quantity_sold,
                SUM(si.line_total) as total_revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            ${whereString}
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_quantity_sold DESC
            LIMIT 5
        `;
        const topProducts = await executeQuery(topProductsQuery, params);

        const reportData = {
            report_date: date,
            branch_id: branch_id || 'All Branches',
            summary,
            payment_methods: paymentMethods,
            top_selling_products: topProducts
        };

        res.status(200).json({
            success: true,
            data: reportData
        });

    } catch (error) {
        logger.error('Error generating daily sales report:', error);
        next(error);
    }
};

/**
 * @desc    Generate an inventory report
 * @route   GET /api/reports/inventory
 * @access  Private (Manager/Admin)
 */
const getInventoryReport = async (req, res, next) => {
    try {
        const { branch_id, report_type = 'all' } = req.query; // report_type can be 'all', 'low_stock', or 'expiring_soon'

        let baseQuery = `SELECT * FROM v_current_stock`; // Using the view we created
        let params = [];

        if (report_type === 'low_stock') {
            baseQuery = `SELECT * FROM v_low_stock_products`;
        } else if (report_type === 'expiring_soon') {
            baseQuery = `SELECT * FROM v_expiring_soon`;
        }

        if (branch_id) {
            baseQuery += ` WHERE branch_id = ?`;
            params.push(branch_id);
        }

        const inventoryItems = await executeQuery(baseQuery, params);

        res.status(200).json({
            success: true,
            count: inventoryItems.length,
            data: inventoryItems
        });

    } catch (error) {
        logger.error('Error generating inventory report:', error);
        next(error);
    }
};

/**
 * @desc    Generate a product performance report
 * @route   GET /api/reports/product-performance
 * @access  Private (Manager/Admin)
 */
const getProductPerformanceReport = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;

        if (!from_date || !to_date) {
            return res.status(400).json({ success: false, message: 'A date range (from_date and to_date) is required.' });
        }

        let whereClauses = ['DATE(s.sale_date) BETWEEN ? AND ?', 's.is_deleted = FALSE'];
        const params = [from_date, to_date];

        if (branch_id) {
            whereClauses.push('s.branch_id = ?');
            params.push(branch_id);
        }

        const whereString = `WHERE ${whereClauses.join(' AND ')}`;

        const query = `
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.sku,
                SUM(si.quantity) as total_quantity_sold,
                SUM(si.line_total) as total_revenue,
                (SUM(si.line_total) - SUM(si.quantity * p.purchase_price)) as estimated_profit
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            ${whereString}
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_revenue DESC
        `;

        const reportData = await executeQuery(query, params);

        res.status(200).json({
            success: true,
            count: reportData.length,
            data: reportData
        });

    } catch (error) {
        logger.error('Error generating product performance report:', error);
        next(error);
    }
};



module.exports = {
    getDailySalesReport,
    getInventoryReport, // Export the new function
    getProductPerformanceReport, // Export the new function
};
