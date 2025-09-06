'use strict';

const { executeQuery, getConnection } = require('../../../../../utils/database');

async function listPO({ page = 1, limit = 20, search, branch_id, supplier_id }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (p - 1) * l;
  let base = `
    SELECT po.id, po.po_number, po.branch_id, b.name AS branch_name,
           po.supplier_id, s.name AS supplier_name,
           po.final_amount, po.status, po.created_at
      FROM purchase_orders po
      JOIN branches b ON b.id = po.branch_id
      JOIN suppliers s ON s.id = po.supplier_id`;
  let count = `SELECT COUNT(po.id) AS total FROM purchase_orders po`;
  const where = ['po.is_deleted = FALSE'];
  const params = [];
  if (branch_id) { where.push('po.branch_id = ?'); params.push(Number(branch_id)); }
  if (supplier_id) { where.push('po.supplier_id = ?'); params.push(Number(supplier_id)); }
  if (search) { where.push('po.po_number LIKE ?'); params.push(`%${search}%`); }
  const w = ` WHERE ${where.join(' AND ')}`;
  const rows = await executeQuery(`${base}${w} ORDER BY po.created_at DESC LIMIT ${l} OFFSET ${offset}`, params);
  const [tot] = await executeQuery(count + w, params);
  return { rows, total: tot.total || 0, page: p, limit: l };
}

async function getPO(id) {
  const [po] = await executeQuery(
    `SELECT po.*, b.name AS branch_name, s.name AS supplier_name, u.username AS creator_name
       FROM purchase_orders po
       JOIN branches b ON b.id = po.branch_id
       JOIN suppliers s ON s.id = po.supplier_id
  LEFT JOIN users u ON u.id = po.created_by
      WHERE po.id = ? AND po.is_deleted = FALSE`,
    [id]
  );
  if (!po) return null;
  const items = await executeQuery(
    `SELECT poi.*,
            pv.sku,
            p.name AS product_name
       FROM purchase_order_items poi
  LEFT JOIN product_variants pv ON pv.id = poi.variant_id
  LEFT JOIN products p ON p.id = COALESCE(pv.product_id, poi.product_id)
      WHERE poi.po_id = ?
      ORDER BY poi.id ASC`,
    [id]
  );
  po.items = items;
  return po;
}

async function createPO({ branch_id, supplier_id, expected_delivery_date, notes, items = [] }, created_by) {
  if (!Array.isArray(items) || items.length === 0) { const e = new Error('Items array is required'); e.status = 400; throw e; }
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const po_number = `PO-${Date.now()}`;
    let total_amount = 0;
    for (const it of items) {
      const qty = Number(it.quantity_ordered || 0);
      const price = Number(String(it.unit_price || 0).replace(/^0+/, ''));
      total_amount += qty * price;
    }
    const final_amount = total_amount; // simplified; taxes/discounts can be added later
    const [poRes] = await conn.execute(
      `INSERT INTO purchase_orders (po_number, branch_id, supplier_id, expected_delivery_date, notes, total_amount, discount_amount, tax_amount, final_amount, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [po_number, branch_id, supplier_id, expected_delivery_date || null, notes || null, total_amount, final_amount, created_by || null]
    );
    const poId = poRes.insertId;
    const itemSql = `INSERT INTO purchase_order_items (po_id, product_id, variant_id, quantity_ordered, unit_price, discount_percentage, tax_percentage, line_total, batch_number, expiry_date, manufacturing_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    for (const it of items) {
      const qty = Number(it.quantity_ordered || it.quantity || 0);
      const price = Number(String(it.unit_price || 0).replace(/^0+/, ''));
      const disc = Number(it.discount_percentage || 0);
      const tax = Number(it.tax_percentage || 0);
      const line_total = qty * price * (1 - disc/100) * (1 + tax/100);
      await conn.execute(itemSql, [poId, it.product_id || null, it.variant_id || null, qty, price, disc, tax, line_total, it.batch_number || null, it.expiry_date || null, it.manufacturing_date || null]);
    }
    await conn.commit();
    return { id: poId, po_number };
  } catch (e) { try { await conn.rollback(); } catch {} throw e; } finally { try { conn.release(); } catch {} }
}

async function receivePO(id, { items = [] }, received_by) {
  if (!Array.isArray(items) || items.length === 0) { const e = new Error('At least one received item is required'); e.status = 400; throw e; }
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM purchase_orders WHERE id = ? AND is_deleted = FALSE FOR UPDATE', [id]);
    if (!rows.length) { await conn.rollback(); return { notFound: true }; }
    const po = rows[0];
    for (const it of items) {
      const qty = Number(it.quantity_received || it.quantity || 0);
      if (!(qty > 0)) continue;
      await conn.execute(
        `INSERT INTO product_stock (variant_id, branch_id, batch_number, expiry_date, supplier_id, quantity_available, purchase_price, mrp, selling_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)`,
        [it.variant_id || it.product_id, po.branch_id, it.batch_number || null, it.expiry_date || null, po.supplier_id, qty, it.purchase_price || 0, it.mrp || 0, it.selling_price || it.mrp || 0]
      );
    }
    await conn.execute('UPDATE purchase_orders SET status = ?, received_by = ?, received_at = NOW() WHERE id = ?', ['received', received_by || null, id]);
    await conn.commit();
    return { ok: true };
  } catch (e) { try { await conn.rollback(); } catch {} throw e; } finally { try { conn.release(); } catch {} }
}

module.exports = { listPO, getPO, createPO, receivePO };

