'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function listCustomers({ page = 1, limit = 20, search, org_id }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (p - 1) * l;
  let base = `SELECT id, org_id, first_name, last_name, phone, email, address, city, state, pincode, is_active
                FROM customers`;
  let count = `SELECT COUNT(id) as total FROM customers`;
  const where = ['is_deleted = FALSE'];
  const params = [];
  if (org_id) { where.push('org_id = ?'); params.push(org_id); }
  if (search) {
    where.push('(first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  const w = ` WHERE ${where.join(' AND ')}`;
  const rows = await executeQuery(`${base}${w} ORDER BY first_name, last_name ASC LIMIT ${l} OFFSET ${offset}`, params);
  const [tot] = await executeQuery(count + w, params);
  return { rows, total: tot.total || 0, page: p, limit: l };
}

async function getCustomer(id, org_id) {
  const whereOrg = org_id ? ' AND org_id = ?' : '';
  const params = org_id ? [id, org_id] : [id];
  const [row] = await executeQuery(`SELECT * FROM customers WHERE id = ?${whereOrg} AND is_deleted = FALSE`, params);
  return row || null;
}

async function createCustomer({ org_id, first_name, last_name, phone, email, address, city, state, pincode }) {
  const [result] = await executeQuery(
    `INSERT INTO customers (org_id, first_name, last_name, phone, email, address, city, state, pincode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [org_id, first_name, last_name, phone, email || null, address || null, city || null, state || null, pincode || null]
  );
  return { id: result.insertId };
}

async function updateCustomer(id, org_id, { first_name, last_name, phone, email, address, city, state, pincode, is_active }) {
  const [result] = await executeQuery(
    `UPDATE customers SET
       first_name = ?, last_name = ?, phone = ?,
       email = COALESCE(?, email), address = COALESCE(?, address), city = COALESCE(?, city), state = COALESCE(?, state), pincode = COALESCE(?, pincode),
       is_active = COALESCE(?, is_active)
     WHERE id = ? AND is_deleted = FALSE` + (org_id ? ' AND org_id = ?' : ''),
    [first_name, last_name, phone, email ?? null, address ?? null, city ?? null, state ?? null, pincode ?? null, (is_active === undefined ? null : (is_active ? 1 : 0)), id].concat(org_id ? [org_id] : [])
  );
  return result.affectedRows;
}

async function softDeleteCustomer(id, org_id) {
  const whereOrg = org_id ? ' AND org_id = ?' : '';
  const params = org_id ? [id, org_id] : [id];
  const result = await executeQuery(`UPDATE customers SET is_deleted = TRUE, is_active = FALSE WHERE id = ?${whereOrg}`, params);
  return result.affectedRows;
}

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  softDeleteCustomer,
};

