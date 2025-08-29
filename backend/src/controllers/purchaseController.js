// In backend/src/controllers/purchaseController.js

const { getConnection, executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new purchase entry
 * @route   POST /api/purchases
 * @access  Private (Manager/Admin)
 */
const createPurchase = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const connection = getConnection();
    try {
        const {
            invoice_number,
            invoice_date,
            branch_id,
            supplier_id,
            notes,
            items
        } = req.body;
        const created_by = req.user.id;

        await connection.beginTransaction();

        let total_amount = 0;
        let total_tax = 0;
        let total_discount = 0;

        items.forEach(item => {
            const basePrice = (Number(item.quantity) || 0) * (Number(item.purchase_price) || 0);
            const schemeDiscount = basePrice * ((Number(item.scheme_discount_percentage) || 0) / 100);
            const cashDiscount = (basePrice - schemeDiscount) * ((Number(item.cash_discount_percentage) || 0) / 100);
            const taxableAmount = basePrice - schemeDiscount - cashDiscount;
            const taxOnItem = taxableAmount * ((Number(item.gst_percentage) || 0) / 100);
            
            total_amount += basePrice;
            total_discount += schemeDiscount + cashDiscount;
            total_tax += taxOnItem;
        });

        const net_amount = total_amount - total_discount + total_tax;

        const purchaseQuery = `
            INSERT INTO purchases (invoice_number, invoice_date, branch_id, supplier_id, total_amount, total_discount, total_tax, net_amount, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [purchaseResult] = await connection.execute(purchaseQuery, [
            invoice_number, invoice_date, branch_id, supplier_id, total_amount,
            total_discount, total_tax, net_amount, notes || null, created_by
        ]);
        const purchaseId = purchaseResult.insertId;

        const itemQuery = `
            INSERT INTO purchase_items (purchase_id, product_id, batch_number, expiry_date, quantity, free_qty, mrp, purchase_price, scheme_discount_percentage, cash_discount_percentage, gst_percentage, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        for (const item of items) {
            const basePrice = (Number(item.quantity) || 0) * (Number(item.purchase_price) || 0);
            const schemeDiscount = basePrice * ((Number(item.scheme_discount_percentage) || 0) / 100);
            const cashDiscount = (basePrice - schemeDiscount) * ((Number(item.cash_discount_percentage) || 0) / 100);
            const taxableAmount = basePrice - schemeDiscount - cashDiscount;
            const taxOnItem = taxableAmount * ((Number(item.gst_percentage) || 0) / 100);
            const lineTotal = taxableAmount + taxOnItem;

            await connection.execute(itemQuery, [
                purchaseId, item.product_id, item.batch_number, item.expiry_date,
                item.quantity, item.free_qty || 0, item.mrp, item.purchase_price,
                item.scheme_discount_percentage || 0, item.cash_discount_percentage || 0,
                item.gst_percentage, lineTotal
            ]);
        }

        await connection.commit();
        
        logger.info(`New purchase created with ID: ${purchaseId}`);
        res.status(201).json({ success: true, message: 'Purchase entry created successfully.', data: { purchaseId } });

    } catch (error) {
        await connection.rollback();
        logger.error('Error creating purchase:', error);
        next(error);
    }
};

/**
 * @desc    Get all purchase entries
 * @route   GET /api/purchases
 * @access  Private
 */
const getAllPurchases = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, branch_id, supplier_id } = req.query;
        
        const safeLimit = parseInt(limit, 10);
        const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

        let baseQuery = `
            SELECT p.*, b.name as branch_name, s.name as supplier_name
            FROM purchases p
            JOIN branches b ON p.branch_id = b.id
            JOIN suppliers s ON p.supplier_id = s.id
        `;
        let countQuery = `SELECT COUNT(p.id) as total FROM purchases p`;
        
        const whereClauses = ['p.is_deleted = FALSE'];
        const whereParams = [];

        if (branch_id) { whereClauses.push('p.branch_id = ?'); whereParams.push(branch_id); }
        if (supplier_id) { whereClauses.push('p.supplier_id = ?'); whereParams.push(supplier_id); }
        if (search) { whereClauses.push('p.invoice_number LIKE ?'); whereParams.push(`%${search}%`); }

        const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
        const finalQuery = `${baseQuery}${whereString} ORDER BY p.invoice_date DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
        const finalCountQuery = countQuery + whereString;

        const purchases = await executeQuery(finalQuery, whereParams);
        const [totalResult] = await executeQuery(finalCountQuery, whereParams);
        const totalPurchases = totalResult.total;

        res.status(200).json({
            success: true,
            pagination: { total: totalPurchases, limit: safeLimit, page: parseInt(page, 10) },
            data: purchases
        });
    } catch (error) {
        logger.error('Error fetching purchases:', error);
        next(error);
    }
};

/**
 * @desc    Get a single purchase by ID
 * @route   GET /api/purchases/:id
 * @access  Private
 */
const getPurchaseById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const purchaseQuery = `
            SELECT p.*, b.name as branch_name, s.name as supplier_name, u.username as creator_name
            FROM purchases p
            JOIN branches b ON p.branch_id = b.id
            JOIN suppliers s ON p.supplier_id = s.id
            JOIN users u ON p.created_by = u.id
            WHERE p.id = ? AND p.is_deleted = FALSE
        `;
        const [purchase] = await executeQuery(purchaseQuery, [id]);

        if (!purchase) {
            return res.status(404).json({ success: false, message: 'Purchase not found.' });
        }

        const itemsQuery = `
            SELECT pi.*, p.name as product_name, p.sku
            FROM purchase_items pi
            JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = ?
        `;
        const items = await executeQuery(itemsQuery, [id]);
        purchase.items = items;

        res.status(200).json({ success: true, data: purchase });
    } catch (error) {
        logger.error(`Error fetching purchase with ID ${req.params.id}:`, error);
        next(error);
    }
};


/**
 * @desc    Post a purchase to stock inventory
 * @route   POST /api/purchases/:id/post
 * @access  Private (Manager/Admin)
 */
const postPurchaseToStock = async (req, res, next) => {
    const { id: purchaseId } = req.params;
    const posted_by = req.user.id;
    const connection = getConnection();

    try {
        await connection.beginTransaction();

        const [purchases] = await connection.execute('SELECT * FROM purchases WHERE id = ? AND is_posted = FALSE FOR UPDATE', [purchaseId]);
        if (purchases.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Purchase not found or already posted.' });
        }
        const purchase = purchases[0];

        const [items] = await connection.execute('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]);

        for (const item of items) {
            const totalQuantity = item.quantity + item.free_qty;
            await connection.execute(
                `
                INSERT INTO product_stock (product_id, branch_id, batch_number, expiry_date, supplier_id, quantity_available, purchase_price, mrp, selling_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)
                `,
                [
                    item.product_id, purchase.branch_id, item.batch_number, item.expiry_date,
                    purchase.supplier_id, totalQuantity, item.purchase_price, item.mrp, item.mrp
                ]
            );
        }

        await connection.execute('UPDATE purchases SET is_posted = TRUE, posted_by = ?, posted_at = NOW() WHERE id = ?', [posted_by, purchaseId]);

        await connection.commit();
        
        logger.info(`Purchase ID ${purchaseId} posted to stock.`);
        res.status(200).json({ success: true, message: 'Purchase posted to stock successfully.' });

    } catch (error) {
        await connection.rollback();
        logger.error(`Error posting purchase ID ${purchaseId} to stock:`, error);
        next(error);
    }
};


module.exports = {
    createPurchase,
    getAllPurchases,
    getPurchaseById, // Export the new function
    postPurchaseToStock,
};
