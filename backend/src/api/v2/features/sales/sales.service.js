'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function listSales({ page = 1, limit = 20, search, branch_id, customer_id }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (p - 1) * l;

  let base = `
    SELECT s.id, s.invoice_number, s.sale_date, s.final_amount,
           s.branch_id, b.name AS branch_name,
           s.customer_id, CONCAT(c.first_name, ' ', c.last_name) AS customer_name
      FROM sales s
 LEFT JOIN customers c ON s.customer_id = c.id
 LEFT JOIN branches b  ON s.branch_id = b.id`;
  let count = `SELECT COUNT(s.id) AS total FROM sales s`;

  const where = ['s.is_deleted = FALSE'];
  const params = [];
  if (branch_id) { where.push('s.branch_id = ?'); params.push(Number(branch_id)); }
  if (customer_id) { where.push('s.customer_id = ?'); params.push(Number(customer_id)); }
  if (search) { where.push('s.invoice_number LIKE ?'); params.push(`%${search}%`); }
  const w = ` WHERE ${where.join(' AND ')}`;

  const rows = await executeQuery(`${base}${w} ORDER BY s.sale_date DESC LIMIT ${l} OFFSET ${offset}`, params);
  const [tot] = await executeQuery(count + w, params);
  return { rows, total: tot.total || 0, page: p, limit: l };
}

async function getSaleById(id) {
  const [sale] = await executeQuery(
    `SELECT s.*, b.name AS branch_name, CONCAT(c.first_name,' ',c.last_name) AS customer_name, u.username AS cashier_name
       FROM sales s
  LEFT JOIN branches  b ON b.id = s.branch_id
  LEFT JOIN customers c ON c.id = s.customer_id
  LEFT JOIN users     u ON u.id = s.cashier_id
      WHERE s.id = ? AND s.is_deleted = FALSE`,
    [id]
  );
  if (!sale) return null;

  const items = await executeQuery(
    `SELECT si.*,
            pv.sku,
            p.name AS product_name
       FROM sale_items si
  LEFT JOIN product_variants pv ON pv.id = si.variant_id
  LEFT JOIN products p ON p.id = COALESCE(pv.product_id, si.product_id)
      WHERE si.sale_id = ?
      ORDER BY si.id ASC`,
    [id]
  );
  sale.items = items;
  return sale;
}

'use strict';

const { getConnection } = require('../../../../../utils/database');

async function makeInvoiceNumber(branch_id) {
  const [{ count }] = await executeQuery(
    'SELECT COUNT(*) as count FROM sales WHERE branch_id = ? AND DATE(sale_date) = CURDATE()',
    [branch_id]
  );
  const daily = (count || 0) + 1;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `INV-${branch_id}-${yyyy}${mm}${dd}-${String(daily).padStart(4, '0')}`;
}

async function createSale({ branch_id, customer_id, doctor_id, items = [], payment_method, discount_amount = 0 }, cashier_id) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one item is required.'); err.status = 400; throw err;
  }

  const stockIds = [...new Set(items.map(it => Number(it.stock_id || 0)).filter(n => n > 0))];
  const placeholders = stockIds.map(() => '?').join(',');
  const stockRows = stockIds.length
    ? await executeQuery(
        `SELECT ps.id, ps.variant_id, pv.product_id, ps.batch_number, ps.expiry_date, ps.selling_price, ps.mrp, ps.quantity_available
           FROM product_stock ps
           JOIN product_variants pv ON pv.id = ps.variant_id
          WHERE ps.id IN (${placeholders})`,
        stockIds
      )
    : [];
  const stockById = new Map(stockRows.map(r => [r.id, r]));

  // Compute totals and validate
  let total_amount = 0;
  let tax_amount = 0;
  const resolved = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const s = stockById.get(Number(it.stock_id));
    if (!s) { const err = new Error(`Item #${i + 1}: stock_id ${it.stock_id} not found.`); err.status = 400; throw err; }
    const qty = Number(it.quantity || 0);
    if (!(qty > 0)) { const err = new Error(`Item #${i + 1}: quantity must be > 0.`); err.status = 400; throw err; }
    if (Number(s.quantity_available) < qty) { const err = new Error(`Item #${i + 1}: insufficient stock.`); err.status = 400; throw err; }

    const unitPrice = Number(it.selling_price ?? s.selling_price ?? it.mrp ?? s.mrp ?? 0) || 0;
    const mrp = Number(it.mrp ?? s.mrp ?? unitPrice) || 0;
    const discPct = Number(it.discount_percentage ?? 0) || 0;
    const taxPct = Number(it.tax_percentage ?? 12) || 12;
    const lineBase = qty * unitPrice * (1 - discPct / 100);
    const lineTax = lineBase * (taxPct / 100);
    total_amount += lineBase;
    tax_amount += lineTax;

    const batch = it.batch_number ?? s.batch_number ?? 'NA';
    const expiry = it.expiry_date ?? s.expiry_date ?? null;

    resolved.push({
      stock_id: s.id,
      product_id: s.product_id,
      quantity: qty,
      unit_price: unitPrice,
      mrp,
      discount_percentage: discPct,
      tax_percentage: taxPct,
      line_total: lineBase,
      batch_number: batch,
      expiry_date: expiry,
    });
  }
  const final_amount = total_amount + tax_amount - Number(discount_amount || 0);

  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const invoice_number = await makeInvoiceNumber(Number(branch_id));
    const [ins] = await conn.execute(
      `INSERT INTO sales (invoice_number, branch_id, customer_id, doctor_id, total_items, total_amount, discount_amount, tax_amount, final_amount, payment_method, cashier_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_number, branch_id, customer_id || null, doctor_id || null, items.length, total_amount, Number(discount_amount || 0), tax_amount, final_amount, payment_method || null, cashier_id]
    );
    const saleId = ins.insertId;

    for (const r of resolved) {
      await conn.execute(
        `INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price, mrp, discount_percentage, tax_percentage, line_total, batch_number, expiry_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, r.product_id, r.stock_id, r.quantity, r.unit_price, r.mrp, r.discount_percentage, r.tax_percentage, r.line_total, r.batch_number, r.expiry_date]
      );
      await conn.execute(
        `UPDATE product_stock SET quantity_available = quantity_available - ? WHERE id = ? AND quantity_available >= ?`,
        [r.quantity, r.stock_id, r.quantity]
      );
    }

    await conn.commit();
    return { id: saleId, invoice_number };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

async function cancelSale(id, userId) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT id, is_cancelled FROM sales WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) return { notFound: true };
    const sale = rows[0];
    if (sale.is_cancelled) return { alreadyCancelled: true };
    const [items] = await conn.execute('SELECT stock_id, quantity FROM sale_items WHERE sale_id = ?', [id]);
    for (const it of items) {
      await conn.execute('UPDATE product_stock SET quantity_available = quantity_available + ? WHERE id = ?', [it.quantity, it.stock_id]);
    }
    await conn.execute('UPDATE sales SET is_cancelled = 1, cancelled_by = ? WHERE id = ?', [userId || null, id]);
    await conn.commit();
    return { ok: true };
  } catch (e) { try { await conn.rollback(); } catch {} throw e; } finally { try { conn.release(); } catch {} }
}

module.exports = { listSales, getSaleById, createSale, cancelSale };
