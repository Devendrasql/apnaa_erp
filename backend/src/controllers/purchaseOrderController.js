// backend/src/controllers/purchaseOrderController.js

const { getConnection, executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/* --------------------------------- Helpers -------------------------------- */

function toNumber(n, fallback = 0) {
  if (n === null || n === undefined || n === '') return fallback;
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Resolve a single active, non-deleted variant for the given item.
 * Item may contain variant_id OR product_id.
 */
async function resolveVariantId(conn, item) {
  if (item.variant_id) return item.variant_id;

  if (!item.product_id) {
    throw new Error('Each item must include variant_id or product_id.');
  }

  const [rows] = await conn.execute(
    `SELECT id
       FROM product_variants
      WHERE product_id = ?
        AND (is_deleted = 0 OR is_deleted IS NULL)
        AND (is_active = 1 OR is_active IS NULL)
      ORDER BY id
      LIMIT 2`,
    [item.product_id]
  );

  if (rows.length === 0) {
    throw new Error(`No active variant found for product_id=${item.product_id}.`);
  }
  if (rows.length > 1) {
    throw new Error(
      `Multiple variants found for product_id=${item.product_id}. Please send variant_id.`
    );
  }
  return rows[0].id;
}

/**
 * Recompute PO totals from item rows.
 */
async function recomputePoTotals(conn, poId) {
  const [sumRows] = await conn.query(
    `SELECT
       COALESCE(SUM(quantity_ordered * unit_price), 0) AS gross,
       COALESCE(SUM((quantity_ordered * unit_price) * (discount_percentage/100)), 0) AS discount,
       COALESCE(SUM((quantity_ordered * unit_price) * (1 - discount_percentage/100) * (tax_percentage/100)), 0) AS tax,
       COALESCE(SUM(line_total), 0) AS final_amount
     FROM purchase_order_items
     WHERE po_id = ?`,
    [poId]
  );

  const t = sumRows[0] || { gross: 0, discount: 0, tax: 0, final_amount: 0 };

  await conn.execute(
    `UPDATE purchase_orders
        SET total_amount   = ?,
            discount_amount = ?,
            tax_amount      = ?,
            final_amount    = ?
      WHERE id = ?`,
    [t.gross, t.discount, t.tax, t.final_amount, poId]
  );
}

/* -------------------------- Create Purchase Order ------------------------- */
/**
 * @desc    Create a new purchase order (accepts variant_id OR product_id)
 * @route   POST /api/purchase-orders
 * @access  Private (Manager/Admin)
 */
const createPurchaseOrder = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  const connection = await getConnection(); // IMPORTANT: await a real connection

  try {
    const {
      branch_id,
      supplier_id,
      expected_delivery_date,
      notes,
      items = [], // [{ variant_id?, product_id?, quantity_ordered, unit_price, discount_percentage?, tax_percentage?, batch_number?, expiry_date?, manufacturing_date? }]
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items array is required.' });
    }

    const created_by = req.user?.id || 0;

    await connection.beginTransaction();

    const po_number = `PO-${Date.now()}`;

    // Basic provisional totals from payload
    let total_amount = 0;
    for (const it of items) {
      const qty = toNumber(it.quantity_ordered);
      // handle strings like "0112"
      const price = toNumber(String(it.unit_price).replace(/^0+/, ''));
      total_amount += qty * price;
    }

    const [poRes] = await connection.execute(
      `INSERT INTO purchase_orders
         (po_number, branch_id, supplier_id, expected_delivery_date, notes,
          total_amount, discount_amount, tax_amount, final_amount, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [
        po_number,
        branch_id,
        supplier_id,
        expected_delivery_date ? expected_delivery_date : null,
        notes || null,
        total_amount,
        total_amount, // provisional; recomputed after items insert
        created_by,
      ]
    );
    const poId = poRes.insertId;

    // Insert items (store by variant_id)
    const insertItemSql = `
      INSERT INTO purchase_order_items
        (po_id, variant_id, quantity_ordered, quantity_received, unit_price,
         discount_percentage, tax_percentage, line_total,
         batch_number, expiry_date, manufacturing_date)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const it of items) {
      const variantId = await resolveVariantId(connection, it);

      const qty   = toNumber(it.quantity_ordered);
      const price = toNumber(String(it.unit_price).replace(/^0+/, ''));
      const discP = toNumber(it.discount_percentage);
      const taxP  = toNumber(it.tax_percentage, 12); // default 12% if that's your standard

      const gross    = qty * price;
      const discAmt  = gross * (discP / 100);
      const net      = gross - discAmt;
      const taxAmt   = net * (taxP / 100);
      const lineTotal = +(net + taxAmt).toFixed(2);

      await connection.execute(insertItemSql, [
        poId,
        variantId,
        qty,
        price,
        discP,
        taxP,
        lineTotal,
        it.batch_number || null,
        it.expiry_date || null,
        it.manufacturing_date || null,
      ]);
    }

    // Accurate totals from DB
    await recomputePoTotals(connection, poId);

    await connection.commit();

    logger.info(`New purchase order created: ${po_number}`);
    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully.',
      data: { id: poId, po_number },
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    logger.error('Error creating purchase order:', error);
    if (/variant_id|product_id|variant found/i.test(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    if (connection?.release) connection.release();
  }
};

/* -------------------------- List Purchase Orders -------------------------- */
/**
 * @desc    Get all purchase orders
 * @route   GET /api/purchase-orders
 * @access  Private
 */
const getAllPurchaseOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, branch_id, supplier_id, status } = req.query;

    const safeLimit = Math.max(1, parseInt(limit, 10));
    const safePage = Math.max(1, parseInt(page, 10));
    const safeOffset = (safePage - 1) * safeLimit;

    let baseQuery = `
      SELECT po.*, b.name AS branch_name, s.name AS supplier_name
      FROM purchase_orders po
      LEFT JOIN branches b ON po.branch_id = b.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
    `;
    let countQuery = `
      SELECT COUNT(po.id) AS total
      FROM purchase_orders po
      LEFT JOIN branches b ON po.branch_id = b.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
    `;

    const whereClauses = ['po.is_deleted = FALSE'];
    const whereParams = [];

    if (branch_id) { whereClauses.push('po.branch_id = ?'); whereParams.push(branch_id); }
    if (supplier_id) { whereClauses.push('po.supplier_id = ?'); whereParams.push(supplier_id); }
    if (status) { whereClauses.push('po.status = ?'); whereParams.push(status); }
    if (search) { whereClauses.push('po.po_number LIKE ?'); whereParams.push(`%${search}%`); }

    const whereString = ` WHERE ${whereClauses.join(' AND ')}`;

    const finalQuery = `${baseQuery}${whereString} ORDER BY po.order_date DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const finalCountQuery = countQuery + whereString;

    const purchaseOrders = await executeQuery(finalQuery, whereParams);
    const [totalResult] = await executeQuery(finalCountQuery, whereParams);
    const totalPOs = totalResult?.total ?? 0;

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      pagination: {
        total: totalPOs,
        limit: safeLimit,
        page: safePage,
        totalPages: Math.ceil(totalPOs / safeLimit),
      },
      data: purchaseOrders,
    });
  } catch (error) {
    logger.error('Error fetching purchase orders:', error);
    next(error);
  }
};

/* --------------------------- Get Purchase Order --------------------------- */
/**
 * @desc    Get a single purchase order by ID, including items
 * @route   GET /api/purchase-orders/:id
 * @access  Private
 */
const getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const poQuery = `
      SELECT po.*, b.name AS branch_name, s.name AS supplier_name
      FROM purchase_orders po
      JOIN branches b ON po.branch_id = b.id
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ? AND po.is_deleted = FALSE
    `;
    const [purchaseOrder] = await executeQuery(poQuery, [id]);

    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
    }

    const itemsQuery = `
      SELECT
        poi.*,
        v.sku,
        v.strength_label,
        v.pack_qty,
        p.name AS product_name
      FROM purchase_order_items poi
      JOIN product_variants v ON poi.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE poi.po_id = ?
    `;
    const items = await executeQuery(itemsQuery, [id]);

    purchaseOrder.items = items;

    res.status(200).json({ success: true, data: purchaseOrder });
  } catch (error) {
    logger.error(`Error fetching purchase order with ID ${req.params.id}:`, error);
    next(error);
  }
};

/* ------------------------ Receive / Update Inventory ---------------------- */
/**
 * @desc    Receive stock from a purchase order (variant-level stock)
 * @route   POST /api/purchase-orders/:id/receive
 * @access  Private (Manager/Admin)
 *
 * Payload: { poItems: [
 *   {
 *     id: <poi.id>,                 // required
 *     quantity_to_receive: <num>,   // required (>0)
 *     // optional (auto-resolved if omitted):
 *     variant_id?: <bigint>,
 *     product_id?: <bigint>,        // not used for stock insert; only for resolving variant if needed
 *     // stock metadata:
 *     branch_id?: <id>,             // defaults to PO.branch_id if omitted
 *     supplier_id?: <id>,           // defaults to PO.supplier_id if omitted
 *     batch_number?: <string>,
 *     expiry_date?: <yyyy-mm-dd>,
 *     purchase_price?: <num>,
 *     mrp?: <num>,
 *     selling_price?: <num>
 *   }
 * ] }
 */
const receivePurchaseOrder = async (req, res, next) => {
  const { id: po_id } = req.params;
  const { poItems } = req.body;

  const connection = await getConnection();

  try {
    if (!Array.isArray(poItems) || poItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Received items must be a non-empty array.' });
    }

    await connection.beginTransaction();

    // Defaults for branch/supplier if not provided per item
    const [poMetaRows] = await connection.execute(
      `SELECT supplier_id, branch_id FROM purchase_orders WHERE id = ?`,
      [po_id]
    );
    if (!poMetaRows.length) {
      throw new Error(`Purchase Order not found for id=${po_id}`);
    }
    const poDefaults = poMetaRows[0];

    for (const item of poItems) {
      const qtyRecv = toNumber(item.quantity_to_receive);
      if (!item.id || qtyRecv <= 0) {
        throw new Error('Each received item must include id (poi.id) and a positive quantity_to_receive.');
      }

      // Resolve variant_id if not provided: fetch from PO item -> variant
      let variantId = item.variant_id || null;

      if (!variantId) {
        const [row] = await connection.execute(
          `SELECT poi.variant_id
             FROM purchase_order_items poi
            WHERE poi.id = ? AND poi.po_id = ?
            LIMIT 1`,
          [item.id, po_id]
        );
        if (!row.length || !row[0].variant_id) {
          throw new Error(`Cannot resolve variant for item_id=${item.id} (does it belong to PO ${po_id}?).`);
        }
        variantId = row[0].variant_id;
      }

      // 1) Update received qty on the PO item
      await connection.execute(
        `UPDATE purchase_order_items
            SET quantity_received = quantity_received + ?
          WHERE id = ?`,
        [qtyRecv, item.id]
      );

      // 2) Upsert stock at VARIANT level (product_stock.variant_id)
      const effectiveBranchId = item.branch_id || poDefaults.branch_id;
      const effectiveSupplierId = item.supplier_id || poDefaults.supplier_id;

      await connection.execute(
        `
          INSERT INTO product_stock
            (variant_id, branch_id, batch_number, expiry_date, supplier_id, quantity_available, purchase_price, mrp, selling_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)
        `,
        [
          variantId,
          effectiveBranchId,
          item.batch_number || null,
          item.expiry_date || null,
          effectiveSupplierId || null,
          qtyRecv,
          toNumber(item.purchase_price),
          toNumber(item.mrp),
          toNumber(item.selling_price),
        ]
      );
    }

    // 3) Recompute PO status
    const [rows] = await connection.execute(
      `SELECT quantity_ordered, quantity_received
         FROM purchase_order_items
        WHERE po_id = ?`,
      [po_id]
    );

    let totalOrdered = 0;
    let totalReceived = 0;
    for (const r of rows) {
      totalOrdered += toNumber(r.quantity_ordered);
      totalReceived += toNumber(r.quantity_received);
    }

    let newStatus = 'partially_received';
    if (totalOrdered > 0 && totalReceived >= totalOrdered) {
      newStatus = 'received';
    }

    await connection.execute(
      `UPDATE purchase_orders SET status = ? WHERE id = ?`,
      [newStatus, po_id]
    );

    await connection.commit();

    logger.info(`Stock received for Purchase Order ID: ${po_id}`);
    res.status(200).json({ success: true, message: 'Stock received and inventory updated successfully.' });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    logger.error(`Error receiving stock for PO ID ${po_id}:`, error);
    if (/non-empty array|positive quantity|not found|resolve variant|variant/i.test(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    if (connection?.release) connection.release();
  }
};

/* --------------------------------- Exports -------------------------------- */

module.exports = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrder,
};





// // In backend/src/controllers/purchaseOrderController.js

// const { getConnection, executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');
// const { validationResult } = require('express-validator');

// /**
//  * @desc    Create a new purchase order using a manual transaction
//  * @route   POST /api/purchase-orders
//  * @access  Private (Manager/Admin)
//  */
// const createPurchaseOrder = async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
//     }

//     const connection = getConnection(); 

//     try {
//         const { branch_id, supplier_id, expected_delivery_date, notes, items } = req.body;
//         const created_by = req.user.id;

//         await connection.beginTransaction();

//         const po_number = `PO-${Date.now()}`;
        
//         let total_amount = 0;
//         items.forEach(item => {
//             total_amount += (Number(item.quantity_ordered) || 0) * (Number(item.unit_price) || 0);
//         });
//         const final_amount = total_amount;

//         const poQuery = `
//             INSERT INTO purchase_orders (po_number, branch_id, supplier_id, expected_delivery_date, notes, total_amount, final_amount, created_by)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `;
//         const poParams = [po_number, branch_id, supplier_id, expected_delivery_date || null, notes || null, total_amount, final_amount, created_by];
        
//         const [poResult] = await connection.execute(poQuery, poParams);
//         const purchaseOrderId = poResult.insertId;

//         const itemQuery = `
//             INSERT INTO purchase_order_items (po_id, product_id, quantity_ordered, unit_price, line_total)
//             VALUES (?, ?, ?, ?, ?)
//         `;
//         for (const item of items) {
//             const lineTotal = (Number(item.quantity_ordered) || 0) * (Number(item.unit_price) || 0);
//             await connection.execute(itemQuery, [purchaseOrderId, item.product_id, item.quantity_ordered, item.unit_price, lineTotal]);
//         }

//         await connection.commit();
        
//         logger.info(`New purchase order created: ${po_number}`);
//         res.status(201).json({ success: true, message: 'Purchase order created successfully.', data: { po_number } });

//     } catch (error) {
//         await connection.rollback();
//         logger.error('Error creating purchase order:', error);
//         next(error);
//     } 
// };

// /**
//  * @desc    Get all purchase orders
//  * @route   GET /api/purchase-orders
//  * @access  Private
//  */
// const getAllPurchaseOrders = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20, search, branch_id, supplier_id, status } = req.query;
        
//         const safeLimit = parseInt(limit, 10);
//         const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

//         let baseQuery = `
//             SELECT po.*, b.name as branch_name, s.name as supplier_name
//             FROM purchase_orders po
//             LEFT JOIN branches b ON po.branch_id = b.id
//             LEFT JOIN suppliers s ON po.supplier_id = s.id
//         `;
//         let countQuery = `
//             SELECT COUNT(po.id) as total 
//             FROM purchase_orders po
//             LEFT JOIN branches b ON po.branch_id = b.id
//             LEFT JOIN suppliers s ON po.supplier_id = s.id
//         `;
        
//         const whereClauses = ['po.is_deleted = FALSE'];
//         const whereParams = [];

//         if (branch_id) { whereClauses.push('po.branch_id = ?'); whereParams.push(branch_id); }
//         if (supplier_id) { whereClauses.push('po.supplier_id = ?'); whereParams.push(supplier_id); }
//         if (status) { whereClauses.push('po.status = ?'); whereParams.push(status); }
//         if (search) { whereClauses.push('po.po_number LIKE ?'); whereParams.push(`%${search}%`); }

//         const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
//         const finalQuery = `${baseQuery}${whereString} ORDER BY po.order_date DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
//         const finalCountQuery = countQuery + whereString;

//         const purchaseOrders = await executeQuery(finalQuery, whereParams);
//         const [totalResult] = await executeQuery(finalCountQuery, whereParams);
//         const totalPOs = totalResult.total;

//         res.status(200).json({
//             success: true,
//             count: purchaseOrders.length,
//             pagination: {
//                 total: totalPOs,
//                 limit: safeLimit,
//                 page: parseInt(page, 10),
//                 totalPages: Math.ceil(totalPOs / safeLimit)
//             },
//             data: purchaseOrders
//         });

//     } catch (error) {
//         logger.error('Error fetching purchase orders:', error);
//         next(error);
//     }
// };

// /**
//  * @desc    Get a single purchase order by ID, including its items
//  * @route   GET /api/purchase-orders/:id
//  * @access  Private
//  */
// const getPurchaseOrderById = async (req, res, next) => {
//     try {
//         const { id } = req.params;

//         const poQuery = `
//             SELECT po.*, b.name as branch_name, s.name as supplier_name
//             FROM purchase_orders po
//             JOIN branches b ON po.branch_id = b.id
//             JOIN suppliers s ON po.supplier_id = s.id
//             WHERE po.id = ? AND po.is_deleted = FALSE
//         `;
//         const [purchaseOrder] = await executeQuery(poQuery, [id]);

//         if (!purchaseOrder) {
//             return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
//         }

//         const itemsQuery = `
//             SELECT poi.*, p.name as product_name, p.sku, p.mrp, p.selling_price
//             FROM purchase_order_items poi
//             JOIN products p ON poi.product_id = p.id
//             WHERE poi.po_id = ?
//         `;
//         const items = await executeQuery(itemsQuery, [id]);

//         purchaseOrder.items = items;

//         res.status(200).json({ success: true, data: purchaseOrder });

//     } catch (error) {
//         logger.error(`Error fetching purchase order with ID ${req.params.id}:`, error);
//         next(error);
//     }
// };

// /**
//  * @desc    Receive stock from a purchase order
//  * @route   POST /api/purchase-orders/:id/receive
//  * @access  Private (Manager/Admin)
//  */
// const receivePurchaseOrder = async (req, res, next) => {
//     const { id: po_id } = req.params;
//     const { poItems } = req.body; 
//     const connection = getConnection();

//     try {
//         if (!Array.isArray(poItems)) {
//             return res.status(400).json({ success: false, message: 'Received items must be an array.' });
//         }

//         await connection.beginTransaction();

//         for (const item of poItems) {
//             await connection.execute(
//                 `UPDATE purchase_order_items SET quantity_received = quantity_received + ? WHERE id = ?`,
//                 [item.quantity_to_receive, item.id]
//             );

//             await connection.execute(
//                 `
//                     INSERT INTO product_stock (product_id, branch_id, batch_number, expiry_date, supplier_id, quantity_available, purchase_price, mrp, selling_price)
//                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//                     ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)
//                 `,
//                 [
//                     item.product_id, item.branch_id, item.batch_number, item.expiry_date,
//                     item.supplier_id || null, item.quantity_to_receive, item.purchase_price || 0,
//                     item.mrp || 0, item.selling_price || 0
//                 ]
//             );
//         }

//         const [poItemsFromDb] = await connection.execute('SELECT quantity_ordered, quantity_received FROM purchase_order_items WHERE po_id = ?', [po_id]);
        
//         let totalQuantityOrdered = 0;
//         let totalQuantityReceived = 0;
//         poItemsFromDb.forEach(item => {
//             totalQuantityOrdered += item.quantity_ordered;
//             totalQuantityReceived += item.quantity_received;
//         });

//         let newStatus = 'partially_received';
//         if (totalQuantityReceived >= totalQuantityOrdered) {
//             newStatus = 'received';
//         }

//         await connection.execute('UPDATE purchase_orders SET status = ? WHERE id = ?', [newStatus, po_id]);

//         await connection.commit();

//         logger.info(`Stock received for Purchase Order ID: ${po_id}`);
//         res.status(200).json({ success: true, message: 'Stock received and inventory updated successfully.' });

//     } catch (error) {
//         await connection.rollback();
//         logger.error(`Error receiving stock for PO ID ${req.params.id}:`, error);
//         next(error);
//     }
// };


// module.exports = {
//     createPurchaseOrder,
//     getAllPurchaseOrders,
//     getPurchaseOrderById,
//     receivePurchaseOrder
// };
