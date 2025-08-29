// In backend/src/controllers/paymentController.js

const { getConnection, executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Record a new payment for a sale
 * @route   POST /api/payments
 * @access  Private
 */
const recordPayment = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const connection = getConnection();
    try {
        const { sale_id, amount_paid, payment_method, payment_date, notes } = req.body;
        const recorded_by = req.user.id;

        await connection.beginTransaction();

        const [sales] = await connection.execute('SELECT * FROM sales WHERE id = ? AND is_deleted = FALSE FOR UPDATE', [sale_id]);
        if (sales.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        }
        const sale = sales[0];

        const newPaidAmount = Number(sale.paid_amount) + Number(amount_paid);
        if (newPaidAmount > sale.final_amount) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Payment amount cannot exceed the balance amount.' });
        }

        await connection.execute(
            `INSERT INTO customer_payments (sale_id, amount_paid, payment_method, payment_date, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)`,
            [sale_id, amount_paid, payment_method, payment_date, notes || null, recorded_by]
        );

        await connection.execute(
            'UPDATE sales SET paid_amount = ?, balance_amount = final_amount - ? WHERE id = ?',
            [newPaidAmount, newPaidAmount, sale_id]
        );

        await connection.commit();

        logger.info(`Payment of ${amount_paid} recorded for sale ID ${sale_id}`);
        res.status(201).json({ success: true, message: 'Payment recorded successfully.' });

    } catch (error) {
        await connection.rollback();
        logger.error('Error recording payment:', error);
        next(error);
    }
};

/**
 * @desc    Get all sales with an outstanding balance
 * @route   GET /api/payments/outstanding
 * @access  Private
 */
const getOutstandingSales = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        
        // Ensure limit and offset are safe integers
        const safeLimit = parseInt(limit, 10);
        const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

        let baseQuery = `
            SELECT 
                s.id, s.invoice_number, s.sale_date, s.final_amount, s.paid_amount, s.balance_amount,
                CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                b.name as branch_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN branches b ON s.branch_id = b.id
        `;
        let countQuery = `SELECT COUNT(s.id) as total FROM sales s`;

        const whereClauses = ['s.is_deleted = FALSE', 's.balance_amount > 0'];
        const whereParams = [];

        if (search) {
            whereClauses.push('s.invoice_number LIKE ?');
            whereParams.push(`%${search}%`);
        }

        const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
        // Construct the final queries with embedded LIMIT/OFFSET
        const finalQuery = `${baseQuery}${whereString} ORDER BY s.sale_date ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
        const finalCountQuery = countQuery + whereString;

        const sales = await executeQuery(finalQuery, whereParams);
        const [totalResult] = await executeQuery(finalCountQuery, whereParams);
        const totalSales = totalResult.total;

        res.status(200).json({
            success: true,
            pagination: {
                total: totalSales,
                limit: safeLimit,
                page: parseInt(page, 10),
                totalPages: Math.ceil(totalSales / safeLimit)
            },
            data: sales
        });

    } catch (error) {
        logger.error('Error fetching outstanding sales:', error);
        next(error);
    }
};


module.exports = {
    recordPayment,
    getOutstandingSales,
};
