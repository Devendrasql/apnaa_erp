// In backend/src/controllers/stockTransferController.js

const { getConnection, executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new stock transfer request
 * @route   POST /api/stock-transfers
 * @access  Private
 */
const createStockTransfer = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const connection = getConnection();
    try {
        const { from_branch_id, to_branch_id, notes, items } = req.body;
        const requested_by = req.user.id;

        if (from_branch_id === to_branch_id) {
            return res.status(400).json({ success: false, message: 'From and To branches cannot be the same.' });
        }

        await connection.beginTransaction();

        const transfer_number = `ST-${Date.now()}`;
        
        const transferQuery = `
            INSERT INTO stock_transfers (transfer_number, from_branch_id, to_branch_id, notes, total_items, requested_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [transferResult] = await connection.execute(transferQuery, [transfer_number, from_branch_id, to_branch_id, notes || null, items.length, requested_by]);
        const transferId = transferResult.insertId;

        const itemQuery = `
            INSERT INTO stock_transfer_items (transfer_id, product_id, stock_id, quantity_requested, batch_number, expiry_date)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const reserveStockQuery = `UPDATE product_stock SET quantity_reserved = quantity_reserved + ? WHERE id = ? AND quantity_available >= ?`;

        for (const item of items) {
            const [reserveResult] = await connection.execute(reserveStockQuery, [item.quantity, item.stock_id, item.quantity]);
            if (reserveResult.affectedRows === 0) {
                throw new Error(`Insufficient stock for product SKU ${item.sku}.`);
            }
            const formattedExpiryDate = new Date(item.expiry_date).toISOString().split('T')[0];
            await connection.execute(itemQuery, [transferId, item.product_id, item.stock_id, item.quantity, item.batch_number, formattedExpiryDate]);
        }

        await connection.commit();
        
        logger.info(`New stock transfer created: ${transfer_number}`);
        res.status(201).json({ success: true, message: 'Stock transfer request created successfully.', data: { transfer_number } });

    } catch (error) {
        await connection.rollback();
        logger.error('Error creating stock transfer:', error);
        next(error);
    }
};


/**
 * @desc    Get all stock transfers with filtering and pagination
 * @route   GET /api/stock-transfers
 * @access  Private
 */
const getAllStockTransfers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, from_branch_id, to_branch_id, status } = req.query;
        
        const safeLimit = parseInt(limit, 10);
        const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

        let baseQuery = `
            SELECT 
                st.*,
                from_b.name as from_branch_name,
                to_b.name as to_branch_name
            FROM stock_transfers st
            JOIN branches from_b ON st.from_branch_id = from_b.id
            JOIN branches to_b ON st.to_branch_id = to_b.id
        `;
        let countQuery = `SELECT COUNT(st.id) as total FROM stock_transfers st`;
        
        const whereClauses = ['st.is_deleted = FALSE'];
        const whereParams = [];

        if (from_branch_id) { whereClauses.push('st.from_branch_id = ?'); whereParams.push(from_branch_id); }
        if (to_branch_id) { whereClauses.push('st.to_branch_id = ?'); whereParams.push(to_branch_id); }
        if (status) { whereClauses.push('st.status = ?'); whereParams.push(status); }

        const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
        const finalQuery = `${baseQuery}${whereString} ORDER BY st.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
        const finalCountQuery = countQuery + whereString;

        const transfers = await executeQuery(finalQuery, whereParams);
        const [totalResult] = await executeQuery(finalCountQuery, whereParams);
        const totalTransfers = totalResult.total;

        res.status(200).json({
            success: true,
            count: transfers.length,
            pagination: {
                total: totalTransfers,
                limit: safeLimit,
                page: parseInt(page, 10),
                totalPages: Math.ceil(totalTransfers / safeLimit)
            },
            data: transfers
        });

    } catch (error) {
        logger.error('Error fetching stock transfers:', error);
        next(error);
    }
};

/**
 * @desc    Get a single stock transfer by ID, including its items
 * @route   GET /api/stock-transfers/:id
 * @access  Private
 */
const getStockTransferById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const transferQuery = `
            SELECT 
                st.*,
                from_b.name as from_branch_name,
                to_b.name as to_branch_name
            FROM stock_transfers st
            JOIN branches from_b ON st.from_branch_id = from_b.id
            JOIN branches to_b ON st.to_branch_id = to_b.id
            WHERE st.id = ? AND st.is_deleted = FALSE
        `;
        const [transfer] = await executeQuery(transferQuery, [id]);

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Stock Transfer not found.' });
        }

        const itemsQuery = `
            SELECT sti.*, p.name as product_name, pv.sku
            FROM stock_transfer_items sti 
            JOIN product_variants pv ON sti.variant_id = pv.id
            JOIN products p          ON pv.product_id = p.id
            WHERE sti.transfer_id = ?
        `;
        const items = await executeQuery(itemsQuery, [id]);

        transfer.items = items;

        res.status(200).json({ success: true, data: transfer });

    } catch (error) {
        logger.error(`Error fetching stock transfer with ID ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Update a stock transfer's status (e.g., dispatch, receive, cancel)
 * @route   PUT /api/stock-transfers/:id/status
 * @access  Private
 */
const updateTransferStatus = async (req, res, next) => {
    const { id: transferId } = req.params;
    const { status } = req.body; // Expecting 'in_transit' or 'received' or 'cancelled'
    const userId = req.user.id;
    const connection = getConnection();

    try {
        await connection.beginTransaction();

        const [transfers] = await connection.execute('SELECT * FROM stock_transfers WHERE id = ? FOR UPDATE', [transferId]);
        if (transfers.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Stock Transfer not found.' });
        }
        const transfer = transfers[0];

        // Logic for when stock is marked as "In Transit" (dispatched)
        if (status === 'in_transit' && transfer.status === 'pending') {
            await connection.execute('UPDATE stock_transfers SET status = ?, approved_by = ? WHERE id = ?', [status, userId, transferId]);
        } 
        // Logic for when stock is marked as "Received"
        else if (status === 'received' && transfer.status === 'in_transit') {
            const [items] = await connection.execute('SELECT * FROM stock_transfer_items WHERE transfer_id = ?', [transferId]);

            for (const item of items) {
                // 1. Deduct stock from the 'from' branch
                await connection.execute(
                    `UPDATE product_stock SET quantity_available = quantity_available - ?, quantity_reserved = quantity_reserved - ? WHERE id = ?`,
                    [item.quantity_requested, item.quantity_requested, item.stock_id]
                );

                // 2. Add stock to the 'to' branch
                await connection.execute(
                    `INSERT INTO product_stock (product_id, branch_id, batch_number, expiry_date, quantity_available, purchase_price, mrp, selling_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)`,
                    [item.product_id, transfer.to_branch_id, item.batch_number, item.expiry_date, item.quantity_requested, 0, 0, 0] // Assuming prices are managed per branch
                );
            }
            await connection.execute('UPDATE stock_transfers SET status = ?, received_by = ? WHERE id = ?', [status, userId, transferId]);
        } else {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Cannot change status from ${transfer.status} to ${status}.` });
        }

        await connection.commit();
        logger.info(`Stock Transfer ${transfer.transfer_number} status updated to ${status}.`);
        res.status(200).json({ success: true, message: `Transfer status updated to ${status}.` });

    } catch (error) {
        await connection.rollback();
        logger.error(`Error updating stock transfer status for ID ${transferId}:`, error);
        next(error);
    }
};


module.exports = {
    createStockTransfer,
    getAllStockTransfers,
    getStockTransferById,
    updateTransferStatus, // Export the new function
};
