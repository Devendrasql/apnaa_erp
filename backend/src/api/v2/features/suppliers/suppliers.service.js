'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function createSupplier({ org_id, name, code, contact_person, email, phone, address, city, state, pincode, gst_number }) {
  const query = `
    INSERT INTO suppliers (org_id, name, code, contact_person, email, phone, address, city, state, pincode, gst_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [org_id, name, code, contact_person || null, email || null, phone || null, address || null, city || null, state || null, pincode || null, gst_number || null];
  const result = await executeQuery(query, params);
  return { id: result.insertId };
}

async function listSuppliers({ org_id, page = 1, limit = 20, search }) {
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const offset = (p - 1) * l;
  let base = `SELECT * FROM suppliers`;
  let count = `SELECT COUNT(id) as total FROM suppliers`;
  const where = ['is_deleted = FALSE', 'org_id = ?'];
  const params = [org_id];
  if (search) {
    where.push('(name LIKE ? OR code LIKE ? OR phone LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  const w = ` WHERE ${where.join(' AND ')}`;
  const rows = await executeQuery(`${base}${w} ORDER BY name ASC LIMIT ${l} OFFSET ${offset}`, params);
  const [tot] = await executeQuery(count + w, params);
  return { rows, total: tot.total || 0, page: p, limit: l };
}

async function getSupplier({ org_id, id }) {
  const [row] = await executeQuery('SELECT * FROM suppliers WHERE id = ? AND org_id = ? AND is_deleted = FALSE', [id, org_id]);
  return row || null;
}

async function updateSupplier({ org_id, id, name, code, contact_person, email, phone, address, city, state, pincode, gst_number, is_active }) {
  const query = `
    UPDATE suppliers SET
      name = ?, code = ?, contact_person = ?, email = ?, phone = ?, address = ?,
      city = ?, state = ?, pincode = ?, gst_number = ?, is_active = ?
    WHERE id = ? AND org_id = ? AND is_deleted = FALSE
  `;
  const params = [name, code, contact_person, email, phone, address, city, state, pincode, gst_number, is_active ? 1 : 0, id, org_id];
  const result = await executeQuery(query, params);
  return result.affectedRows;
}

async function softDeleteSupplier({ org_id, id }) {
  const r = await executeQuery('UPDATE suppliers SET is_deleted = TRUE, is_active = FALSE WHERE id = ? AND org_id = ?', [id, org_id]);
  return r.affectedRows;
}

async function getSupplierByGST({ org_id, gst_number }) {
  const [row] = await executeQuery('SELECT * FROM suppliers WHERE org_id = ? AND gst_number = ? AND is_deleted = FALSE', [org_id, gst_number]);
  return row || null;
}

module.exports = {
  createSupplier,
  listSuppliers,
  getSupplier,
  updateSupplier,
  softDeleteSupplier,
  getSupplierByGST,
};
