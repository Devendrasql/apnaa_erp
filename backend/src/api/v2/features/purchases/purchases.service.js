'use strict';

const { executeQuery, getConnection } = require('../../../../../utils/database');

function calcTotals(items = []) {
  let total_amount = 0;
  let total_tax = 0;
  let total_discount = 0;
  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.purchase_price) || 0;
    const base = qty * price;
    const scheme = base * ((Number(item.scheme_discount_percentage) || 0) / 100);
    const cash = (base - scheme) * ((Number(item.cash_discount_percentage) || 0) / 100);
    const taxable = base - scheme - cash;
    const tax = taxable * ((Number(item.gst_percentage) || 0) / 100);
    total_amount += base;
    total_discount += (scheme + cash);
    total_tax += tax;
  }
  const net_amount = total_amount - total_discount + total_tax;
  return { total_amount, total_discount, total_tax, net_amount };
}

async function listPurchases({ page = 1, limit = 20, search, branch_id, supplier_id }) {
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const offset = (p - 1) * l;
  let baseQuery = `
    SELECT p.id, p.invoice_number, p.invoice_date, p.branch_id, b.name AS branch_name,
           p.supplier_id, s.name AS supplier_name, p.net_amount, p.is_posted
      FROM purchases p
      JOIN branches b ON p.branch_id = b.id
      JOIN suppliers s ON p.supplier_id = s.id`;
  let countQuery = `SELECT COUNT(p.id) as total FROM purchases p`;
  const where = ['p.is_deleted = FALSE'];
  const params = [];
  if (branch_id) { where.push('p.branch_id = ?'); params.push(branch_id); }
  if (supplier_id) { where.push('p.supplier_id = ?'); params.push(supplier_id); }
  if (search) { where.push('p.invoice_number LIKE ?'); params.push(`%${search}%`); }
  const whereSql = ` WHERE ${where.join(' AND ')}`;
  const rows = await executeQuery(`${baseQuery}${whereSql} ORDER BY p.invoice_date DESC LIMIT ${l} OFFSET ${offset}`, params);
  const [tot] = await executeQuery(countQuery + whereSql, params);
  return { rows, total: tot.total || 0, page: p, limit: l };
}

async function getPurchaseById(id) {
  const [purchase] = await executeQuery(
    `SELECT p.*, b.name as branch_name, s.name as supplier_name, u.username as creator_name
       FROM purchases p
       JOIN branches b ON p.branch_id = b.id
       JOIN suppliers s ON p.supplier_id = s.id
       JOIN users u ON p.created_by = u.id
      WHERE p.id = ? AND p.is_deleted = FALSE`,
    [id]
  );
  if (!purchase) return null;
  const items = await executeQuery(
    `SELECT pi.*, pr.name as product_name, pr.sku
       FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?`,
    [id]
  );
  purchase.items = items;
  return purchase;
}

async function createPurchase({ invoice_number, invoice_date, branch_id, supplier_id, notes, items = [] }, created_by) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const t = calcTotals(items);
    const [ins] = await conn.execute(
      `INSERT INTO purchases (invoice_number, invoice_date, branch_id, supplier_id, total_amount, total_discount, total_tax, net_amount, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_number, invoice_date, branch_id, supplier_id, t.total_amount, t.total_discount, t.total_tax, t.net_amount, notes || null, created_by]
    );
    const purchaseId = ins.insertId;
    const itemSql = `
      INSERT INTO purchase_items (purchase_id, product_id, batch_number, expiry_date, quantity, free_qty, mrp, purchase_price, scheme_discount_percentage, cash_discount_percentage, gst_percentage, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    for (const it of items) {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.purchase_price) || 0;
      const base = qty * price;
      const scheme = base * ((Number(it.scheme_discount_percentage) || 0) / 100);
      const cash = (base - scheme) * ((Number(it.cash_discount_percentage) || 0) / 100);
      const taxable = base - scheme - cash;
      const tax = taxable * ((Number(it.gst_percentage) || 0) / 100);
      const lineTotal = taxable + tax;
      await conn.execute(itemSql, [
        purchaseId, it.product_id, it.batch_number, it.expiry_date,
        qty, it.free_qty || 0, it.mrp, price,
        it.scheme_discount_percentage || 0, it.cash_discount_percentage || 0, it.gst_percentage || 0, lineTotal
      ]);
    }
    await conn.commit();
    return { id: purchaseId };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

async function postToStock(purchaseId, posted_by) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const [purchases] = await conn.execute('SELECT * FROM purchases WHERE id = ? AND is_posted = FALSE FOR UPDATE', [purchaseId]);
    if (!purchases.length) return { notFoundOrPosted: true };
    const purchase = purchases[0];
    const [items] = await conn.execute('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
    for (const item of items) {
      const totalQuantity = Number(item.quantity) + Number(item.free_qty || 0);
      await conn.execute(
        `INSERT INTO product_stock (product_id, branch_id, batch_number, expiry_date, supplier_id, quantity_available, purchase_price, mrp, selling_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)`,
        [item.product_id, purchase.branch_id, item.batch_number, item.expiry_date, purchase.supplier_id, totalQuantity, item.purchase_price, item.mrp, item.mrp]
      );
    }
    await conn.execute('UPDATE purchases SET is_posted = TRUE, posted_by = ?, posted_at = NOW() WHERE id = ?', [posted_by, purchaseId]);
    await conn.commit();
    return { ok: true };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

module.exports = {
  listPurchases,
  getPurchaseById,
  createPurchase,
  postToStock,
};

