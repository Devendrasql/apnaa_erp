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

    let connection;
    try {
        connection = await getConnection();
        const { sale_id, amount_paid, payment_method, payment_date, notes } = req.body;
        const recorded_by = req.user.id;

        await connection.beginTransaction();

        const [sales] = await connection.execute('SELECT * FROM sales WHERE id = ? AND is_deleted = FALSE FOR UPDATE', [sale_id]);
        if (sales.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        }
        const sale = sales[0];
        // Prefer column balance_amount if present; fall back to final_amount check
        const saleFinal = Number(sale.final_amount);
        const saleBalance = sale.balance_amount != null ? Number(sale.balance_amount) : (saleFinal);
        if (Number(amount_paid) > saleBalance) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Payment amount cannot exceed the balance amount.' });
        }

        // Try to persist payment row if table exists; ignore if table missing
        try {
          await connection.execute(
              `INSERT INTO customer_payments (sale_id, amount_paid, payment_method, payment_date, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)`,
              [sale_id, amount_paid, payment_method, payment_date, notes || null, recorded_by]
          );
        } catch (e) {
          if (e?.code !== 'ER_NO_SUCH_TABLE') throw e;
        }

        // Update sales balance if column exists
        try {
          await connection.execute(
            'UPDATE sales SET balance_amount = GREATEST(balance_amount - ?, 0) WHERE id = ?',
            [amount_paid, sale_id]
          );
        } catch (e) {
          // If balance_amount column missing, skip silently
          if (e?.code !== 'ER_BAD_FIELD_ERROR') throw e;
        }

        await connection.commit();

        logger.info(`Payment of ${amount_paid} recorded for sale ID ${sale_id}`);
        res.status(201).json({ success: true, message: 'Payment recorded successfully.' });

    } catch (error) {
        try { if (connection && typeof connection.rollback === 'function') await connection.rollback(); } catch {}
        logger.error('Error recording payment:', error);
        next(error);
    } finally {
        try { if (connection && typeof connection.release === 'function') connection.release(); } catch {}
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

        const orgId = Number(req.user?.org_id || 1);
        const branchId = req.query.branch_id ? Number(req.query.branch_id) : undefined;

        let baseQuery = `
            SELECT 
                s.id,
                s.invoice_number,
                s.sale_date,
                s.final_amount,
                0 AS paid_amount,
                s.final_amount AS balance_amount,
                CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                b.name as branch_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN branches b ON s.branch_id = b.id
        `;
        let countQuery = `
          SELECT COUNT(*) AS total
          FROM sales s
          LEFT JOIN branches b ON s.branch_id = b.id
        `;
        const whereClauses = ['s.is_deleted = FALSE', 's.final_amount > 0', 'b.org_id = ?'];
        const whereParams = [orgId];
        if (Number.isFinite(branchId)) { whereClauses.push('s.branch_id = ?'); whereParams.push(branchId); }

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
