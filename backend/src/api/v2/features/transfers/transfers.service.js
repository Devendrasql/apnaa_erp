'use strict';

const { executeQuery, getConnection } = require('../../../../../utils/database');

async function listTransfers({ page = 1, limit = 20, from_branch_id, to_branch_id, status }) {
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const offset = (p - 1) * l;
  let base = `
    SELECT st.id, st.transfer_number, st.from_branch_id, fb.name AS from_branch_name,
           st.to_branch_id, tb.name AS to_branch_name, st.status, st.total_items, st.created_at
      FROM stock_transfers st
      JOIN branches fb ON fb.id = st.from_branch_id
      JOIN branches tb ON tb.id = st.to_branch_id`;
  let count = `SELECT COUNT(st.id) AS total FROM stock_transfers st`;
  const where = ['st.is_deleted = FALSE'];
  const params = [];
  if (from_branch_id) { where.push('st.from_branch_id = ?'); params.push(from_branch_id); }
  if (to_branch_id) { where.push('st.to_branch_id = ?'); params.push(to_branch_id); }
  if (status) { where.push('st.status = ?'); params.push(status); }
  const w = ` WHERE ${where.join(' AND ')}`;
  const rows = await executeQuery(`${base}${w} ORDER BY st.created_at DESC LIMIT ${l} OFFSET ${offset}`, params);
  const [tot] = await executeQuery(count + w, params);
  return { rows, total: tot.total || 0, page: p, limit: l };
}

async function getTransferById(id) {
  const [transfer] = await executeQuery(
    `SELECT st.*, fb.name as from_branch_name, tb.name as to_branch_name
       FROM stock_transfers st
       JOIN branches fb ON st.from_branch_id = fb.id
       JOIN branches tb ON st.to_branch_id = tb.id
      WHERE st.id = ? AND st.is_deleted = FALSE`,
    [id]
  );
  if (!transfer) return null;
  const items = await executeQuery(
    `SELECT sti.*, p.name AS product_name, pv.sku
       FROM stock_transfer_items sti
       JOIN product_variants pv ON sti.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
      WHERE sti.transfer_id = ?`,
    [id]
  );
  transfer.items = items;
  return transfer;
}

async function createTransfer({ from_branch_id, to_branch_id, notes, items }, requested_by) {
  const conn = await getConnection();
  try {
    if (from_branch_id === to_branch_id) throw new Error('From and To branches cannot be the same.');
    await conn.beginTransaction();
    const transfer_number = `ST-${Date.now()}`;
    const [ins] = await conn.execute(
      `INSERT INTO stock_transfers (transfer_number, from_branch_id, to_branch_id, notes, total_items, requested_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [transfer_number, from_branch_id, to_branch_id, notes || null, items.length, requested_by]
    );
    const transferId = ins.insertId;
    const itemSql = `INSERT INTO stock_transfer_items (transfer_id, variant_id, stock_id, quantity_requested, batch_number, expiry_date) VALUES (?, ?, ?, ?, ?, ?)`;
    const reserveSql = `UPDATE product_stock SET quantity_reserved = quantity_reserved + ? WHERE id = ? AND quantity_available >= ?`;
    for (const it of items) {
      const [r] = await conn.execute(reserveSql, [it.quantity, it.stock_id, it.quantity]);
      if (!r.affectedRows) throw new Error('Insufficient stock to reserve');
      const exp = new Date(it.expiry_date).toISOString().split('T')[0];
      await conn.execute(itemSql, [transferId, it.variant_id || it.product_id, it.stock_id, it.quantity, it.batch_number, exp]);
    }
    await conn.commit();
    return { transfer_number };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

async function updateStatus(id, status, userId) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM stock_transfers WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) return { notFound: true };
    const transfer = rows[0];

    if (status === 'in_transit' && transfer.status === 'pending') {
      await conn.execute('UPDATE stock_transfers SET status = ?, approved_by = ? WHERE id = ?', [status, userId, id]);
    } else if (status === 'received' && transfer.status === 'in_transit') {
      const [items] = await conn.execute('SELECT * FROM stock_transfer_items WHERE transfer_id = ?', [id]);
      for (const item of items) {
        await conn.execute(
          `UPDATE product_stock SET quantity_available = quantity_available - ?, quantity_reserved = quantity_reserved - ? WHERE id = ?`,
          [item.quantity_requested, item.quantity_requested, item.stock_id]
        );
        await conn.execute(
          `INSERT INTO product_stock (variant_id, branch_id, batch_number, expiry_date, quantity_available, purchase_price, mrp, selling_price)
           VALUES (?, ?, ?, ?, ?, 0, 0, 0)
           ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)`,
          [item.variant_id || item.product_id, transfer.to_branch_id, item.batch_number, item.expiry_date, item.quantity_requested]
        );
      }
      await conn.execute('UPDATE stock_transfers SET status = ?, received_by = ? WHERE id = ?', [status, userId, id]);
    } else {
      return { invalid: true, from: transfer.status };
    }
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
  listTransfers,
  getTransferById,
  createTransfer,
  updateStatus,
};

