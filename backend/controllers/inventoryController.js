'use strict';

const { executeQuery, getConnection } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Get current stock levels with advanced filtering and pagination
 * @route   GET /api/inventory/stock
 * @access  Private
 *
 * Pricing / GST logic:
 * - MRP:
 *     ps.mrp (if non-zero) →
 *     last purchase_items.mrp for same (variant_id, batch_number) →
 *     0
 * - Selling price:
 *     ps.selling_price (if non-zero) →
 *     latest product_prices.price for 'Retail'/'Default' (if any) →
 *     ps.mrp (if non-zero) →
 *     last purchase_items.mrp →
 *     0
 * - GST %:
 *     gst_slabs.percentage via variant.default_gst_slab_id →
 *     12
 */
const getStockLevels = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, branch_id, expiring_soon } = req.query;

    const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeOffset = (safePage - 1) * safeLimit;

    const baseQuery = `
      SELECT
        ps.id                  AS stock_id,
        p.id                   AS product_id,
        pv.id                  AS variant_id,
        p.name                 AS product_name,
        pv.sku                 AS sku,
        ps.branch_id           AS branch_id,
        b.name                 AS branch_name,
        ps.batch_number,
        ps.expiry_date,
        ps.quantity_available,

        /* MRP with fallback from last purchase for same (variant, batch) */
        COALESCE(
          NULLIF(ps.mrp, 0),
          (
            SELECT pi.mrp
              FROM purchase_items pi
             WHERE pi.variant_id   = ps.variant_id
               AND pi.batch_number = ps.batch_number
          ORDER BY pi.created_at DESC
             LIMIT 1
          ),
          0
        ) AS mrp,

        /* Selling price with multi-stage fallback */
        COALESCE(
          NULLIF(ps.selling_price, 0),
          (
            SELECT pp.price
              FROM product_prices pp
              LEFT JOIN price_lists pl ON pl.id = pp.price_list_id
             WHERE pp.variant_id = ps.variant_id
               AND (pl.name = 'Retail' OR pl.name = 'Default' OR pl.name IS NULL)
          ORDER BY IFNULL(pp.effective_from, '1970-01-01') DESC, pp.id DESC
             LIMIT 1
          ),
          NULLIF(ps.mrp, 0),
          (
            SELECT pi.mrp
              FROM purchase_items pi
             WHERE pi.variant_id   = ps.variant_id
               AND pi.batch_number = ps.batch_number
          ORDER BY pi.created_at DESC
             LIMIT 1
          ),
          0
        ) AS selling_price,

        /* GST percentage: from gst_slabs via variant.default_gst_slab_id; fallback 12 */
        COALESCE(gs.percentage, 12) AS gst_percentage,

        DATEDIFF(ps.expiry_date, CURDATE()) AS days_to_expire
      FROM product_stock ps
      JOIN product_variants pv ON pv.id = ps.variant_id
      JOIN products         p  ON p.id  = pv.product_id
      JOIN branches         b  ON b.id  = ps.branch_id
      LEFT JOIN gst_slabs   gs ON gs.id = pv.default_gst_slab_id
    `;

    const countQuery = `
      SELECT COUNT(ps.id) AS total
        FROM product_stock ps
        JOIN product_variants pv ON pv.id = ps.variant_id
        JOIN products         p  ON p.id  = pv.product_id
    `;

    const where = [
      'ps.is_deleted = FALSE',
      'pv.is_deleted = FALSE',
      'p.is_deleted  = FALSE',
      'ps.quantity_available > 0',
    ];
    const params = [];

    if (branch_id) {
      where.push('ps.branch_id = ?');
      params.push(branch_id);
    }

    if (search) {
      where.push('(p.name LIKE ? OR pv.sku LIKE ? OR ps.batch_number LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (expiring_soon === 'true') {
      where.push('ps.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
    }

    const whereSql = ` WHERE ${where.join(' AND ')}`;
    const listSql =
      `${baseQuery}${whereSql} ORDER BY ps.expiry_date ASC, ps.quantity_available ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const countSql = `${countQuery}${whereSql}`;

    const rows = await executeQuery(listSql, params);
    const [cnt] = await executeQuery(countSql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      pagination: {
        total: cnt?.total || 0,
        limit: safeLimit,
        page: safePage,
        totalPages: Math.max(1, Math.ceil((cnt?.total || 0) / safeLimit)),
      },
      data: rows,
    });
  } catch (error) {
    logger.error('Error fetching stock levels:', error);
    next(error);
  }
};

/**
 * @desc    Add stock (receive purchase)
 * @route   POST /api/inventory/add-stock
 * @access  Private (Admin/Manager)
 *
 * Expected body:
 * {
 *   variant_id, branch_id, batch_number, expiry_date,
 *   manufacturing_date?, supplier_id?,
 *   quantity, purchase_price, mrp, selling_price
 * }
 */
const addStock = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const s = req.body;

    if (!s.variant_id) {
      return res
        .status(400)
        .json({ success: false, message: 'variant_id is required (product_stock is variant-based).' });
    }

    const query = `
      INSERT INTO product_stock
        (variant_id, branch_id, batch_number, expiry_date, manufacturing_date,
         supplier_id, quantity_available, purchase_price, mrp, selling_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity_available = quantity_available + VALUES(quantity_available),
        purchase_price     = VALUES(purchase_price),
        mrp                = VALUES(mrp),
        selling_price      = VALUES(selling_price),
        updated_at         = NOW()
    `;

    const params = [
      s.variant_id,
      s.branch_id,
      s.batch_number,
      s.expiry_date,
      s.manufacturing_date || null,
      s.supplier_id || null,
      s.quantity,
      s.purchase_price,
      s.mrp,
      s.selling_price,
    ];

    const result = await executeQuery(query, params);

    return res.json({
      success: true,
      message: 'Stock updated successfully',
      data: { affectedRows: result.affectedRows },
    });
  } catch (error) {
    logger.error('Error adding stock:', error);
    next(error);
  }
};

/**
 * @desc    Manually adjust stock for a specific batch
 * @route   POST /api/inventory/adjust-stock
 * @access  Private (Manager/Admin)
 */
const adjustStock = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  const connection = await getConnection();
  try {
    const { stock_id, quantity_change, reason, notes } = req.body;
    const adjusted_by = req.user.id;

    await connection.beginTransaction();

    const [stockItems] = await connection.execute(
      'SELECT * FROM product_stock WHERE id = ? FOR UPDATE',
      [stock_id]
    );
    if (stockItems.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Stock item not found.' });
    }

    await connection.execute(
      'UPDATE product_stock SET quantity_available = quantity_available + ? WHERE id = ?',
      [quantity_change, stock_id]
    );

    // If you add a stock_movements table later, insert a row here.

    await connection.commit();

    logger.info(`Stock ID ${stock_id} adjusted by ${quantity_change} for reason: ${reason}`);
    return res.status(200).json({ success: true, message: 'Stock adjusted successfully.' });
  } catch (error) {
    await connection.rollback();
    logger.error('Error adjusting stock:', error);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getStockLevels,
  addStock,
  adjustStock,
};










// // In backend/src/controllers/inventoryController.js

// const { executeQuery, getConnection } = require('../utils/database');
// const logger = require('../utils/logger');
// const { validationResult } = require('express-validator');

// /**
//  * @desc    Get current stock levels with advanced filtering and pagination
//  * @route   GET /api/inventory/stock
//  * @access  Private
//  */
// const getStockLevels = async (req, res, next) => {
//   try {
//     const { page = 1, limit = 20, search, branch_id, low_stock, expiring_soon } = req.query;

//     const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
//     const safePage = Math.max(1, parseInt(page, 10) || 1);
//     const safeOffset = (safePage - 1) * safeLimit;

//     // IMPORTANT:
//     // - MRP / selling_price come from product_stock (batch-level), NOT product_variants.
//     // - GST% comes from gst_slabs via product_variants.default_gst_slab_id.
//     let baseQuery = `
//       SELECT
//         ps.id                AS stock_id,
//         p.id                 AS product_id,
//         pv.id                AS variant_id,
//         p.name               AS product_name,
//         pv.sku               AS sku,
//         ps.branch_id,
//         b.name               AS branch_name,
//         ps.batch_number,
//         ps.expiry_date,
//         ps.quantity_available,
//         ps.mrp,
//         -- If selling_price is zero/null, fall back to MRP (typical retail behavior)
//         COALESCE(NULLIF(ps.selling_price, 0), ps.mrp, 0) AS selling_price,
//         COALESCE(gs.percentage, 12.00) AS gst_percentage,
//         DATEDIFF(ps.expiry_date, CURDATE()) AS days_to_expire
//       FROM product_stock ps
//       JOIN product_variants pv   ON ps.variant_id = pv.id
//       JOIN products        p     ON pv.product_id = p.id
//       JOIN branches        b     ON ps.branch_id = b.id
//       LEFT JOIN gst_slabs  gs    ON pv.default_gst_slab_id = gs.id
//     `;

//     let countQuery = `
//       SELECT COUNT(ps.id) AS total
//       FROM product_stock ps
//       JOIN product_variants pv   ON ps.variant_id = pv.id
//       JOIN products        p     ON pv.product_id = p.id
//       LEFT JOIN gst_slabs  gs    ON pv.default_gst_slab_id = gs.id
//     `;

//     const where = [
//       'ps.is_deleted = FALSE',
//       'p.is_deleted  = FALSE',
//       'pv.is_deleted = FALSE',
//       'ps.quantity_available > 0'
//     ];
//     const params = [];

//     if (branch_id) {
//       where.push('ps.branch_id = ?');
//       params.push(branch_id);
//     }

//     if (search) {
//       where.push('(p.name LIKE ? OR pv.sku LIKE ? OR ps.batch_number LIKE ?)');
//       const q = `%${search}%`;
//       params.push(q, q, q);
//     }

//     if (expiring_soon === 'true') {
//       // 30-day window; tweak as needed
//       where.push('ps.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
//     }

//     const whereSql = ` WHERE ${where.join(' AND ')}`;

//     const listSql =
//       `${baseQuery}${whereSql} ` +
//       `ORDER BY ps.expiry_date ASC, ps.quantity_available ASC ` +
//       `LIMIT ${safeLimit} OFFSET ${safeOffset}`;

//     const countSql = `${countQuery}${whereSql}`;

//     const rows = await executeQuery(listSql, params);
//     const [cnt] = await executeQuery(countSql, params);

//     return res.status(200).json({
//       success: true,
//       count: rows.length,
//       pagination: {
//         total: cnt?.total || 0,
//         limit: safeLimit,
//         page: safePage,
//         totalPages: Math.max(1, Math.ceil((cnt?.total || 0) / safeLimit)),
//       },
//       data: rows,
//     });
//   } catch (error) {
//     logger.error('Error fetching stock levels:', error);
//     next(error);
//   }
// };

// /**
//  * @desc    Add stock (receive purchase)
//  * @route   POST /api/inventory/add-stock
//  * @access  Private (Admin/Manager)
//  */
// const addStock = async (req, res, next) => {
//     try {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
//         }

//         const stockData = req.body;

//         // === CORRECTED QUERY ===
//         // Now inserts using `variant_id` instead of the old `product_id`.
//         const query = `
//             INSERT INTO product_stock 
//                 (variant_id, branch_id, batch_number, expiry_date, manufacturing_date, 
//                 supplier_id, quantity_available, purchase_price, mrp, selling_price)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//             ON DUPLICATE KEY UPDATE 
//                 quantity_available = quantity_available + VALUES(quantity_available),
//                 updated_at = NOW()
//         `;
        
//         const params = [
//             stockData.variant_id, // Changed from product_id
//             stockData.branch_id, stockData.batch_number,
//             stockData.expiry_date, stockData.manufacturing_date || null, stockData.supplier_id || null,
//             stockData.quantity, stockData.purchase_price, stockData.mrp, stockData.selling_price
//         ];

//         const result = await executeQuery(query, params);

//         res.json({
//             success: true,
//             message: 'Stock updated successfully',
//             data: { affectedRows: result.affectedRows }
//         });
//     } catch (error) {
//         logger.error('Error adding stock:', error);
//         next(error);
//     }
// };

// /**
//  * @desc    Manually adjust stock for a specific batch
//  * @route   POST /api/inventory/adjust-stock
//  * @access  Private (Manager/Admin)
//  */
// const adjustStock = async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
//     }

//     const connection = await getConnection(); // Assumes getConnection provides a transaction-capable connection
//     try {
//         const { stock_id, quantity_change, reason, notes } = req.body;
//         const adjusted_by = req.user.id;

//         await connection.beginTransaction();

//         const [stockItems] = await connection.execute('SELECT * FROM product_stock WHERE id = ? FOR UPDATE', [stock_id]);
//         if (stockItems.length === 0) {
//             await connection.rollback();
//             return res.status(404).json({ success: false, message: 'Stock item not found.' });
//         }
//         const stockItem = stockItems[0];

//         await connection.execute(
//             'UPDATE product_stock SET quantity_available = quantity_available + ? WHERE id = ?',
//             [quantity_change, stock_id]
//         );

//         // NOTE: The stock_movements table was not part of the final schema.
//         // If you add it back, this query will need to be updated to use variant_id.
//         /*
//         await connection.execute(
//             `INSERT INTO stock_movements 
//             (variant_id, branch_id, stock_id, movement_type, quantity_change, reference_type, notes, created_by, batch_number, expiry_date)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//             [
//                 stockItem.variant_id, // Corrected from product_id
//                 stockItem.branch_id, stock_id, 
//                 reason,
//                 quantity_change, 
//                 'adjustment',
//                 notes || null, 
//                 adjusted_by,
//                 stockItem.batch_number,
//                 stockItem.expiry_date
//             ]
//         );
//         */

//         await connection.commit();

//         logger.info(`Stock ID ${stock_id} adjusted by ${quantity_change} for reason: ${reason}`);
//         res.status(200).json({ success: true, message: 'Stock adjusted successfully.' });

//     } catch (error) {
//         await connection.rollback();
//         logger.error('Error adjusting stock:', error);
//         next(error);
//     } finally {
//         if (connection) connection.release(); // Release connection back to the pool
//     }
// };


// module.exports = {
//     getStockLevels,
//     addStock,
//     adjustStock
// };
