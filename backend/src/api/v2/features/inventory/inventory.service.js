'use strict';

const { executeQuery, getConnection } = require('../../../../../utils/database');

async function getStockLevels({ page = 1, limit = 20, search, branch_id, expiring_soon }) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeOffset = (safePage - 1) * safeLimit;

  const where = [];
  const params = [];
  if (branch_id) { where.push('ps.branch_id = ?'); params.push(Number(branch_id)); }
  if (search) { where.push('(p.name LIKE ? OR pv.sku LIKE ? OR ps.batch_number LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
  if (String(expiring_soon || '').toLowerCase() === 'true') { where.push('ps.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)'); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await executeQuery(
    `SELECT
        ps.id AS stock_id,
        p.id AS product_id,
        pv.id AS variant_id,
        p.name AS product_name,
        pv.sku AS sku,
        ps.branch_id AS branch_id,
        b.name AS branch_name,
        ps.batch_number,
        ps.expiry_date,
        ps.quantity_available,
        COALESCE(NULLIF(ps.mrp, 0), 0) AS mrp,
        COALESCE(NULLIF(ps.selling_price, 0), COALESCE(NULLIF(ps.mrp, 0), 0)) AS selling_price,
        COALESCE(gs.percentage, 12) AS gst_percentage
     FROM product_stock ps
     JOIN product_variants pv ON pv.id = ps.variant_id
     JOIN products p ON p.id = pv.product_id
     JOIN branches b ON b.id = ps.branch_id
LEFT JOIN gst_slabs gs ON gs.id = pv.default_gst_slab_id
     ${whereSql}
 ORDER BY ps.expiry_date IS NULL, ps.expiry_date ASC, p.name ASC
    LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  const [cnt] = await executeQuery(
    `SELECT COUNT(*) AS total
       FROM product_stock ps
       JOIN product_variants pv ON pv.id = ps.variant_id
       JOIN products p ON p.id = pv.product_id
       JOIN branches b ON b.id = ps.branch_id
     ${whereSql}`,
    params
  );

  return { rows, total: cnt?.total || 0, page: safePage, limit: safeLimit };
}

async function addStock({ variant_id, branch_id, quantity, batch_number, expiry_date, manufacturing_date, supplier_id, purchase_price, mrp, selling_price }) {
  const sql = `
    INSERT INTO product_stock (variant_id, branch_id, batch_number, expiry_date, manufacturing_date, supplier_id, quantity_available, purchase_price, mrp, selling_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available), updated_at = NOW()`;
  const params = [variant_id, branch_id, batch_number, expiry_date, manufacturing_date || null, supplier_id || null, quantity, purchase_price, mrp, selling_price];
  const result = await executeQuery(sql, params);
  return result.affectedRows;
}

async function adjustStock({ stock_id, quantity_change }) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT id FROM product_stock WHERE id = ? FOR UPDATE', [stock_id]);
    if (!rows.length) {
      await conn.rollback();
      return { notFound: true };
    }
    await conn.execute('UPDATE product_stock SET quantity_available = quantity_available + ? WHERE id = ?', [quantity_change, stock_id]);
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
  getStockLevels,
  addStock,
  adjustStock,
};

