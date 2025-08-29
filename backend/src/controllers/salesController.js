'use strict';

const { executeQuery, executeTransaction } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const { nextTxnNumber } = require('../utils/txnNumber');

const nf = (x, fallback = 0) => { const n = Number(x); return Number.isFinite(n) ? n : fallback; };
const ni = (x, fallback = 0) => { const n = parseInt(x, 10); return Number.isFinite(n) ? n : fallback; };
const nullify = (v) => (v === undefined ? null : v);

/**
 * Create a sale, then (if provided) attach the face log to the created sale_id.
 * Body supports: face_recognition_log_id (returned by /api/face/identify)
 */
const createSale = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const {
      branch_id, customer_id, doctor_id, items,
      total_amount, discount_amount, final_amount,
      face_recognition_log_id, // ← optional linkage
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required.' });
    }
    for (const [idx, it] of items.entries()) {
      if (!ni(it.quantity, 0)) {
        return res.status(400).json({ success: false, message: `Item #${idx + 1}: quantity must be a positive integer.` });
      }
      if (!ni(it.stock_id, 0)) {
        return res.status(400).json({ success: false, message: `Item #${idx + 1}: stock_id is required.` });
      }
    }

    const cashier_id = req.user?.id || null;

    // Find org_id for this branch (needed for per-org counters)
    const [b] = await executeQuery('SELECT org_id FROM branches WHERE id = ?', [ni(branch_id)]);
    if (!b) return res.status(400).json({ success: false, message: 'Invalid branch.' });
    const orgId = b.org_id;

    // Generate invoice number via txn_counters (continuous, customizable)
    const { number: invoice_number } = await nextTxnNumber('sale', orgId, ni(branch_id));

    // ---- Preload stock rows ----
    const stockIds = Array.from(new Set(items.map((it) => ni(it.stock_id, 0)).filter((id) => id > 0)));
    const placeholders = stockIds.map(() => '?').join(',');
    const stockRows = stockIds.length
      ? await executeQuery(
          `SELECT id, batch_number, expiry_date, selling_price, mrp, quantity_available
             FROM product_stock
            WHERE id IN (${placeholders})`,
          stockIds
        )
      : [];

    const stockById = new Map(stockRows.map((r) => [r.id, r]));
    const resolvedItems = [];
    for (const [idx, it] of items.entries()) {
      const stock = stockById.get(ni(it.stock_id));
      if (!stock) return res.status(400).json({ success: false, message: `Item #${idx + 1}: stock_id ${it.stock_id} not found.` });

      const quantity = ni(it.quantity, 0);
      if (stock.quantity_available < quantity) {
        return res.status(400).json({
          success: false,
          message: `Item #${idx + 1}: insufficient stock. Available: ${stock.quantity_available}, requested: ${quantity}`,
        });
      }

      const variantId = it.variant_id ?? it.product_id;
      if (!variantId) return res.status(400).json({ success: false, message: `Item #${idx + 1}: variant_id or product_id is required.` });

      const unitPrice =
        nf(it.selling_price, NaN) ||
        nf(stock.selling_price, NaN) ||
        nf(it.unit_price, NaN) ||
        nf(it.price, NaN) ||
        nf(it.mrp, NaN) ||
        nf(stock.mrp, 0);

      const mrp = nf(it.mrp, NaN) || nf(stock.mrp, unitPrice);
      const discountPct = nf(it.discount_percentage, 0);
      const taxPct = nf(it.tax_percentage, 12);
      const line_total = quantity * unitPrice * (1 - discountPct / 100);

      let batch = it.batch_number ?? stock.batch_number ?? '';
      if (!batch) batch = 'NA';                  // NOT NULL in schema

      const expiry = it.expiry_date
        ? new Date(it.expiry_date).toISOString().slice(0, 10)
        : stock.expiry_date
        ? new Date(stock.expiry_date).toISOString().slice(0, 10)
        : null;                                  // can be NULL in schema

      resolvedItems.push({
        variantId,
        stock_id: ni(it.stock_id),
        quantity,
        unitPrice,
        mrp,
        discountPct,
        taxPct,
        line_total,
        batch,
        expiry,
      });
    }

    // ---- Build transaction ----
    const queries = [];

    // 1) Sales row
    queries.push({
      query: `
        INSERT INTO sales (
          invoice_number, branch_id, customer_id, doctor_id,
          total_amount, discount_amount, tax_amount, final_amount, cashier_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        invoice_number,
        ni(branch_id),
        nullify(customer_id ?? null),
        nullify(doctor_id ?? null),
        nf(total_amount),
        nf(discount_amount),
        0, // tax placeholder
        nf(final_amount),
        nullify(cashier_id),
      ],
    });

    // 2) sale_items + stock decrement
    for (const it of resolvedItems) {
      queries.push({
        query: `
          INSERT INTO sale_items (
            sale_id, variant_id, stock_id, quantity, unit_price, mrp,
            discount_percentage, tax_percentage, line_total, batch_number, expiry_date
          )
          VALUES (LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          ni(it.variantId),
          ni(it.stock_id),
          ni(it.quantity),
          nf(it.unitPrice),
          nf(it.mrp),
          nf(it.discountPct),
          nf(it.taxPct),
          nf(it.line_total),
          it.batch,
          nullify(it.expiry),
        ],
      });

      queries.push({
        query: `UPDATE product_stock SET quantity_available = quantity_available - ? WHERE id = ?`,
        params: [ni(it.quantity), ni(it.stock_id)],
      });
    }

    // 3) Commit
    await executeTransaction(queries);

    // 4) Fetch the created sale_id by unique invoice_number (safe after commit)
    const [saleRow] = await executeQuery(`SELECT id FROM sales WHERE invoice_number = ?`, [invoice_number]);
    const saleId = saleRow?.id;

    // 5) If a recognition log id is passed, attach this sale_id (and invoice number)
    if (saleId && face_recognition_log_id) {
      await executeQuery(
        `UPDATE face_recognition_logs
            SET sale_id = ?, invoice_number = ?
          WHERE id = ?`,
        [saleId, invoice_number, face_recognition_log_id]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: { invoice_number, sale_id: saleId },
    });
  } catch (error) {
    logger.error('Error creating sale:', error);
    next(error);
  }
};

const getAllSales = async (req, res, next) => {
  try {
    // const { page = 1, limit = 20, branch_id, from_date, to_date, search } = req.query;
    const { page = 1, limit = 20, branch_id, from_date, to_date, search, customer_id } = req.query;


    const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeOffset = (safePage - 1) * safeLimit;

    let baseQuery = `
      SELECT s.*,
             CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
             c.phone AS customer_phone,
             b.name AS branch_name,
             CONCAT(u.first_name, ' ', u.last_name) AS cashier_name
        FROM sales s
   LEFT JOIN customers c ON s.customer_id = c.id
   LEFT JOIN branches  b ON s.branch_id = b.id
   LEFT JOIN users     u ON s.cashier_id = u.id
    `;

    let countQuery = `
      SELECT COUNT(s.id) AS total
        FROM sales s
   LEFT JOIN customers c ON s.customer_id = c.id
    `;

    const where = ['s.is_deleted = FALSE'];
    const params = [];

    if (branch_id) { where.push('s.branch_id = ?'); params.push(branch_id); }
    if (customer_id) { where.push('s.customer_id = ?'); params.push(customer_id); } // ← added
    if (from_date) { where.push('DATE(s.sale_date) >= ?'); params.push(from_date); }
    if (to_date)   { where.push('DATE(s.sale_date) <= ?'); params.push(to_date); }
    if (search) {
      where.push('(s.invoice_number LIKE ? OR c.phone LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereSql = ` WHERE ${where.join(' AND ')}`;

    const listSql = `${baseQuery}${whereSql} ORDER BY s.sale_date DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const countSql = `${countQuery}${whereSql}`;

    const sales = await executeQuery(listSql, params);
    const [countRow] = await executeQuery(countSql, params);
    const total = countRow?.total || 0;

    return res.status(200).json({
      success: true,
      count: sales.length,
      pagination: {
        total,
        limit: safeLimit,
        page: safePage,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
      data: sales,
    });
  } catch (error) {
    logger.error('Error fetching sales history:', error);
    next(error);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const saleSql = `
      SELECT s.*,
             CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
             c.phone AS customer_phone,
             b.name AS branch_name,
             CONCAT(u.first_name, ' ', u.last_name) AS cashier_name
        FROM sales s
   LEFT JOIN customers c ON s.customer_id = c.id
   LEFT JOIN branches  b ON s.branch_id = b.id
   LEFT JOIN users     u ON s.cashier_id = u.id
       WHERE s.id = ? AND s.is_deleted = FALSE
    `;
    const [sale] = await executeQuery(saleSql, [id]);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    const itemsSql = `
      SELECT
        si.*,
        p.name AS product_name,
        pv.sku,
        pv.strength_label,
        pv.pack_qty
      FROM sale_items si
      JOIN product_variants pv ON si.variant_id = pv.id
      JOIN products p         ON pv.product_id = p.id
     WHERE si.sale_id = ?
    `;
    const items = await executeQuery(itemsSql, [id]);

    sale.items = items;

    return res.status(200).json({ success: true, data: sale });
  } catch (error) {
    logger.error(`Error fetching sale with ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
};











// 'use strict';

// const { executeQuery, executeTransaction } = require('../utils/database');
// const logger = require('../utils/logger');
// const { validationResult } = require('express-validator');

// /* ----------------------------- helpers ----------------------------- */

// const nf = (x, fallback = 0) => {
//   const n = Number(x);
//   return Number.isFinite(n) ? n : fallback;
// };
// const ni = (x, fallback = 0) => {
//   const n = parseInt(x, 10);
//   return Number.isFinite(n) ? n : fallback;
// };
// const nullify = (v) => (v === undefined ? null : v);

// const makeInvoiceNumber = async (branch_id) => {
//   const [row] = await executeQuery(
//     'SELECT COUNT(*) AS count FROM sales WHERE branch_id = ? AND DATE(sale_date) = CURDATE()',
//     [branch_id]
//   );
//   const dailyCount = (row?.count || 0) + 1;
//   const now = new Date();
//   const yyyy = now.getFullYear();
//   const mm = String(now.getMonth() + 1).padStart(2, '0');
//   const dd = String(now.getDate()).padStart(2, '0');
//   const seq = String(dailyCount).padStart(4, '0');
//   return `INV-${branch_id}-${yyyy}${mm}${dd}-${seq}`;
// };

// /* ----------------------------- controller: create ----------------------------- */

// /**
//  * @desc    Create a new sale (transaction)
//  * @route   POST /api/sales
//  * @access  Private
//  *
//  * Body example:
//  * {
//  *   branch_id: 2,
//  *   customer_id: 1,              // optional
//  *   doctor_id: null,             // optional
//  *   items: [
//  *     {
//  *       stock_id: 5,             // required
//  *       product_id: 1,           // or variant_id
//  *       variant_id: null,        // (either product_id or variant_id must exist)
//  *       quantity: 1,             // required, > 0
//  *       selling_price: 33,       // preferred; falls back to stock.selling_price -> unit_price/price/mrp -> 0
//  *       mrp: 33,                 // optional
//  *       discount_percentage: 0,  // optional
//  *       tax_percentage: 12,      // optional (default 12)
//  *       batch_number: 'B123',    // optional; if missing, taken from product_stock; if still missing => 'NA'
//  *       expiry_date: '2025-12-31'// optional; if missing, taken from product_stock; may be NULL
//  *     }
//  *   ],
//  *   total_amount: 33,
//  *   discount_amount: 0,
//  *   final_amount: 33,
//  *   payment_method: 'cash'       // if used elsewhere
//  * }
//  */
// const createSale = async (req, res, next) => {
//   try {
//     // Top-level validation
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Validation failed', errors: errors.array() });
//     }

//     const {
//       branch_id,
//       customer_id,
//       doctor_id,
//       items,
//       total_amount,
//       discount_amount,
//       final_amount,
//     } = req.body;

//     // Per-item sanity checks
//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ success: false, message: 'At least one item is required.' });
//     }
//     for (const [idx, it] of items.entries()) {
//       if (!ni(it.quantity, 0)) {
//         return res.status(400).json({
//           success: false,
//           message: `Item #${idx + 1}: quantity must be a positive integer.`,
//         });
//       }
//       if (!ni(it.stock_id, 0)) {
//         return res.status(400).json({
//           success: false,
//           message: `Item #${idx + 1}: stock_id is required.`,
//         });
//       }
//     }

//     const cashier_id = req.user?.id || null;

//     // Generate invoice number
//     const invoice_number = await makeInvoiceNumber(ni(branch_id));

//     // -----------------------------------------------------------------
//     // PRELOAD stock rows for all involved stock_ids
//     // (to fill missing batch_number/expiry_date/selling_price and validate availability)
//     // -----------------------------------------------------------------
//     const stockIds = Array.from(
//       new Set(items.map((it) => ni(it.stock_id, 0)).filter((id) => id > 0))
//     );
//     const placeholders = stockIds.map(() => '?').join(',');
//     const stockRows = stockIds.length
//       ? await executeQuery(
//           `
//         SELECT id, batch_number, expiry_date, selling_price, mrp, quantity_available
//           FROM product_stock
//          WHERE id IN (${placeholders})
//       `,
//           stockIds
//         )
//       : [];

//     const stockById = new Map(stockRows.map((r) => [r.id, r]));

//     // Validate each item against stock; compute derived fields in advance
//     const resolvedItems = [];
//     for (const [idx, it] of items.entries()) {
//       const stock = stockById.get(ni(it.stock_id));
//       if (!stock) {
//         return res.status(400).json({
//           success: false,
//           message: `Item #${idx + 1}: stock_id ${it.stock_id} not found.`,
//         });
//       }
//       const quantity = ni(it.quantity, 0);
//       if (stock.quantity_available < quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Item #${idx + 1}: insufficient stock. Available: ${stock.quantity_available}, requested: ${quantity}`,
//         });
//       }

//       const variantId = it.variant_id ?? it.product_id;
//       if (!variantId) {
//         return res.status(400).json({
//           success: false,
//           message: `Item #${idx + 1}: variant_id or product_id is required.`,
//         });
//       }

//       // Prioritize client-sent selling_price, then stock.selling_price, then fallback chain
//       const unitPrice =
//         nf(it.selling_price, NaN) ||
//         nf(stock.selling_price, NaN) ||
//         nf(it.unit_price, NaN) ||
//         nf(it.price, NaN) ||
//         nf(it.mrp, NaN) ||
//         nf(stock.mrp, 0);

//       const mrp = nf(it.mrp, NaN) || nf(stock.mrp, unitPrice);
//       const discountPct = nf(it.discount_percentage, 0);
//       const taxPct = nf(it.tax_percentage, 12);
//       const line_total = quantity * unitPrice * (1 - discountPct / 100);

//       // Guarantee non-null batch_number (DB column is NOT NULL)
//       let batch = it.batch_number ?? stock.batch_number ?? '';
//       if (batch === null || batch === undefined || batch === '') batch = 'NA';

//       // expiry_date may be NULL in your schema; we keep NULL-safe conversion
//       const resolvedExpiry = it.expiry_date
//         ? new Date(it.expiry_date).toISOString().slice(0, 10)
//         : stock.expiry_date
//         ? new Date(stock.expiry_date).toISOString().slice(0, 10)
//         : null;

//       resolvedItems.push({
//         variantId,
//         stock_id: ni(it.stock_id),
//         quantity,
//         unitPrice,
//         mrp,
//         discountPct,
//         taxPct,
//         line_total,
//         batch,
//         expiry: resolvedExpiry,
//       });
//     }

//     // -----------------------------------------------------------------
//     // Build the transaction queries
//     // -----------------------------------------------------------------
//     const queries = [];

//     // 1) Insert main sales record
//     queries.push({
//       query: `
//         INSERT INTO sales (
//           invoice_number,
//           branch_id,
//           customer_id,
//           doctor_id,
//           total_amount,
//           discount_amount,
//           tax_amount,
//           final_amount,
//           cashier_id
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       params: [
//         invoice_number,
//         ni(branch_id),
//         nullify(customer_id ?? null),
//         nullify(doctor_id ?? null),
//         nf(total_amount),
//         nf(discount_amount),
//         0, // tax placeholder (kept from your code)
//         nf(final_amount),
//         nullify(cashier_id),
//       ],
//     });

//     // 2) Insert sale_items and decrement stock
//     for (const it of resolvedItems) {
//       queries.push({
//         query: `
//           INSERT INTO sale_items (
//             sale_id,
//             variant_id,
//             stock_id,
//             quantity,
//             unit_price,
//             mrp,
//             discount_percentage,
//             tax_percentage,
//             line_total,
//             batch_number,
//             expiry_date
//           )
//           VALUES (LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         params: [
//           ni(it.variantId),
//           ni(it.stock_id),
//           ni(it.quantity),
//           nf(it.unitPrice),
//           nf(it.mrp),
//           nf(it.discountPct),
//           nf(it.taxPct),
//           nf(it.line_total),
//           it.batch,                 // guaranteed non-null
//           nullify(it.expiry),       // may be null
//         ],
//       });

//       // Guarded stock decrement (you already validated availability)
//       queries.push({
//         query: `
//           UPDATE product_stock
//              SET quantity_available = quantity_available - ?
//            WHERE id = ?
//         `,
//         params: [ni(it.quantity), ni(it.stock_id)],
//       });
//     }

//     // 3) Commit
//     await executeTransaction(queries);

//     return res.status(201).json({
//       success: true,
//       message: 'Sale completed successfully',
//       data: { invoice_number },
//     });
//   } catch (error) {
//     logger.error('Error creating sale:', error);
//     next(error);
//   }
// };

// /* ----------------------------- controller: list ----------------------------- */

// const getAllSales = async (req, res, next) => {
//   try {
//     const { page = 1, limit = 20, branch_id, from_date, to_date, search } = req.query;

//     const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
//     const safePage = Math.max(1, parseInt(page, 10) || 1);
//     const safeOffset = (safePage - 1) * safeLimit;

//     let baseQuery = `
//       SELECT s.*,
//              CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
//              c.phone AS customer_phone,
//              b.name AS branch_name,
//              CONCAT(u.first_name, ' ', u.last_name) AS cashier_name
//         FROM sales s
//    LEFT JOIN customers c ON s.customer_id = c.id
//    LEFT JOIN branches  b ON s.branch_id = b.id
//    LEFT JOIN users     u ON s.cashier_id = u.id
//     `;

//     let countQuery = `
//       SELECT COUNT(s.id) AS total
//         FROM sales s
//    LEFT JOIN customers c ON s.customer_id = c.id
//     `;

//     const where = ['s.is_deleted = FALSE'];
//     const params = [];

//     if (branch_id) { where.push('s.branch_id = ?'); params.push(branch_id); }
//     if (from_date) { where.push('DATE(s.sale_date) >= ?'); params.push(from_date); }
//     if (to_date)   { where.push('DATE(s.sale_date) <= ?'); params.push(to_date); }
//     if (search) {
//       where.push('(s.invoice_number LIKE ? OR c.phone LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ?)');
//       const like = `%${search}%`;
//       params.push(like, like, like);
//     }

//     const whereSql = ` WHERE ${where.join(' AND ')}`;

//     const listSql = `${baseQuery}${whereSql} ORDER BY s.sale_date DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
//     const countSql = `${countQuery}${whereSql}`;

//     const sales = await executeQuery(listSql, params);
//     const [countRow] = await executeQuery(countSql, params);
//     const total = countRow?.total || 0;

//     return res.status(200).json({
//       success: true,
//       count: sales.length,
//       pagination: {
//         total,
//         limit: safeLimit,
//         page: safePage,
//         totalPages: Math.ceil(total / safeLimit) || 1,
//       },
//       data: sales,
//     });
//   } catch (error) {
//     logger.error('Error fetching sales history:', error);
//     next(error);
//   }
// };

// /* ----------------------------- controller: details ----------------------------- */

// const getSaleById = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const saleSql = `
//       SELECT s.*,
//              CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
//              c.phone AS customer_phone,
//              b.name AS branch_name,
//              CONCAT(u.first_name, ' ', u.last_name) AS cashier_name
//         FROM sales s
//    LEFT JOIN customers c ON s.customer_id = c.id
//    LEFT JOIN branches  b ON s.branch_id = b.id
//    LEFT JOIN users     u ON s.cashier_id = u.id
//        WHERE s.id = ? AND s.is_deleted = FALSE
//     `;
//     const [sale] = await executeQuery(saleSql, [id]);

//     if (!sale) {
//       return res.status(404).json({ success: false, message: 'Sale not found.' });
//     }

//     const itemsSql = `
//       SELECT
//         si.*,
//         p.name AS product_name,
//         pv.sku,
//         pv.strength_label,
//         pv.pack_qty
//       FROM sale_items si
//       JOIN product_variants pv ON si.variant_id = pv.id
//       JOIN products p         ON pv.product_id = p.id
//      WHERE si.sale_id = ?
//     `;
//     const items = await executeQuery(itemsSql, [id]);

//     sale.items = items;

//     return res.status(200).json({ success: true, data: sale });
//   } catch (error) {
//     logger.error(`Error fetching sale with ID ${req.params.id}:`, error);
//     next(error);
//   }
// };

// module.exports = {
//   createSale,
//   getAllSales,
//   getSaleById,
// };










// // // In backend/src/controllers/salesController.js

// // const { executeQuery, executeTransaction } = require('../utils/database');
// // const logger = require('../utils/logger');
// // const { validationResult } = require('express-validator');

// // /**
// //  * @desc    Create a new sale using a transaction
// //  * @route   POST /api/sales
// //  * @access  Private
// //  */
// // const createSale = async (req, res, next) => {
// //     try {
// //         const errors = validationResult(req);
// //         if (!errors.isEmpty()) {
// //             return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
// //         }

// //         const {
// //             branch_id, customer_id, doctor_id, items,
// //             total_amount, discount_amount, final_amount
// //         } = req.body;
// //         const cashier_id = req.user.id;

// //         // --- Invoice Number Generation ---
// //         const [invoiceResult] = await executeQuery(
// //             'SELECT COUNT(*) as count FROM sales WHERE branch_id = ? AND DATE(sale_date) = CURDATE()',
// //             [branch_id]
// //         );
// //         const dailyCount = invoiceResult.count + 1;
// //         const date = new Date();
// //         const invoice_number = `INV-${branch_id}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(dailyCount).padStart(4, '0')}`;

// //         // --- Build Transaction Queries ---
// //         const queries = [];

// //         // 1. Insert the main sales record
// //         queries.push({
// //             query: `
// //                 INSERT INTO sales (invoice_number, branch_id, customer_id, doctor_id, total_amount, discount_amount, tax_amount, final_amount, cashier_id)
// //                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
// //             `,
// //             params: [
// //                 invoice_number, branch_id, customer_id || null, doctor_id || null,
// //                 parseFloat(total_amount || 0), 
// //                 parseFloat(discount_amount || 0), 
// //                 0, // tax placeholder
// //                 parseFloat(final_amount || 0), 
// //                 cashier_id
// //             ]
// //         });

// //         // 2. Insert each sale item and update stock
// //         for (const item of items) {
// //             const quantity = parseInt(item.quantity || 0, 10);
// //             const unitPrice = parseFloat(item.unit_price || item.mrp || 0);
// //             const mrp = parseFloat(item.mrp || 0);
// //             const discountPercentage = parseFloat(item.discount_percentage || 0);
// //             const taxPercentage = parseFloat(item.tax_percentage || 12);
            
// //             const line_total = quantity * unitPrice * (1 - (discountPercentage / 100));
            
// //             const variantId = item.variant_id || item.product_id;
// //             if (!variantId) {
// //                 throw new Error('Each sale item must have a variant_id or product_id.');
// //             }

// //             const formattedExpiryDate = item.expiry_date ? new Date(item.expiry_date).toISOString().slice(0, 10) : null;

// //             // === FINAL FIX: Use LAST_INSERT_ID() directly in the SQL query ===
// //             // This is the most reliable way to link sale items to the sale and avoids transaction helper issues.
// //             queries.push({
// //                 query: `
// //                     INSERT INTO sale_items (sale_id, variant_id, stock_id, quantity, unit_price, mrp, discount_percentage, tax_percentage, line_total, batch_number, expiry_date) 
// //                     VALUES (LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
// //                 `,
// //                 params: [
// //                     variantId,
// //                     item.stock_id, 
// //                     quantity, 
// //                     unitPrice,
// //                     mrp,
// //                     discountPercentage, 
// //                     taxPercentage,
// //                     line_total, 
// //                     item.batch_number, 
// //                     formattedExpiryDate
// //                 ]
// //             });

// //             queries.push({
// //                 query: `UPDATE product_stock SET quantity_available = quantity_available - ? WHERE id = ?`,
// //                 params: [quantity, item.stock_id]
// //             });
// //         }

// //         await executeTransaction(queries);

// //         res.status(201).json({
// //             success: true,
// //             message: 'Sale completed successfully',
// //             data: { invoice_number }
// //         });

// //     } catch (error) {
// //         logger.error('Error creating sale:', error);
// //         next(error);
// //     }
// // };

// // /**
// //  * @desc    Get sales history with filtering and pagination
// //  * @route   GET /api/sales
// //  * @access  Private
// //  */
// // const getAllSales = async (req, res, next) => {
// //     try {
// //         const { page = 1, limit = 20, branch_id, from_date, to_date, search } = req.query;
        
// //         const safeLimit = parseInt(limit, 10);
// //         const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

// //         let baseQuery = `
// //             SELECT s.*, 
// //                    CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
// //                    c.phone as customer_phone,
// //                    b.name as branch_name, 
// //                    CONCAT(u.first_name, ' ', u.last_name) as cashier_name
// //             FROM sales s
// //             LEFT JOIN customers c ON s.customer_id = c.id
// //             LEFT JOIN branches b ON s.branch_id = b.id
// //             LEFT JOIN users u ON s.cashier_id = u.id
// //         `;
        
// //         let countQuery = `
// //             SELECT COUNT(s.id) as total 
// //             FROM sales s
// //             LEFT JOIN customers c ON s.customer_id = c.id
// //         `;

// //         const whereClauses = ['s.is_deleted = FALSE'];
// //         const whereParams = [];

// //         if (branch_id) { whereClauses.push('s.branch_id = ?'); whereParams.push(branch_id); }
// //         if (from_date) { whereClauses.push('DATE(s.sale_date) >= ?'); whereParams.push(from_date); }
// //         if (to_date) { whereClauses.push('DATE(s.sale_date) <= ?'); whereParams.push(to_date); }
// //         if (search) {
// //              whereClauses.push('(s.invoice_number LIKE ? OR c.phone LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ?)');
// //              const searchParam = `%${search}%`;
// //              whereParams.push(searchParam, searchParam, searchParam);
// //         }
        
// //         const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
// //         const finalQuery = `${baseQuery}${whereString} ORDER BY s.sale_date DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
        
// //         const finalCountQuery = countQuery + whereString;

// //         const sales = await executeQuery(finalQuery, whereParams);
// //         const [totalResult] = await executeQuery(finalCountQuery, whereParams);
// //         const totalSales = totalResult.total;

// //         res.status(200).json({
// //             success: true,
// //             count: sales.length,
// //             pagination: {
// //                 total: totalSales,
// //                 limit: safeLimit,
// //                 page: parseInt(page, 10),
// //                 totalPages: Math.ceil(totalSales / safeLimit)
// //             },
// //             data: sales
// //         });

// //     } catch (error) {
// //         logger.error('Error fetching sales history:', error);
// //         next(error);
// //     }
// // };

// // /**
// //  * @desc    Get details of a single sale by ID
// //  * @route   GET /api/sales/:id
// //  * @access  Private
// //  */
// // const getSaleById = async (req, res, next) => {
// //     try {
// //         const { id } = req.params;

// //         const saleQuery = `
// //             SELECT s.*, 
// //                    CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
// //                    c.phone as customer_phone,
// //                    b.name as branch_name, 
// //                    CONCAT(u.first_name, ' ', u.last_name) as cashier_name
// //             FROM sales s
// //             LEFT JOIN customers c ON s.customer_id = c.id
// //             LEFT JOIN branches b ON s.branch_id = b.id
// //             LEFT JOIN users u ON s.cashier_id = u.id
// //             WHERE s.id = ? AND s.is_deleted = FALSE
// //         `;
// //         const [sale] = await executeQuery(saleQuery, [id]);

// //         if (!sale) {
// //             return res.status(404).json({ success: false, message: 'Sale not found.' });
// //         }

// //         const itemsQuery = `
// //             SELECT 
// //                 si.*, 
// //                 p.name as product_name, 
// //                 pv.sku,
// //                 pv.strength_label,
// //                 pv.pack_qty
// //             FROM sale_items si
// //             JOIN product_variants pv ON si.variant_id = pv.id
// //             JOIN products p ON pv.product_id = p.id
// //             WHERE si.sale_id = ?
// //         `;
// //         const items = await executeQuery(itemsQuery, [id]);

// //         sale.items = items;

// //         res.status(200).json({ success: true, data: sale });

// //     } catch (error) {
// //         logger.error(`Error fetching sale with ID ${req.params.id}:`, error);
// //         next(error);
// //     }
// // };

// // module.exports = {
// //     createSale,
// //     getAllSales,
// //     getSaleById,
// // };
