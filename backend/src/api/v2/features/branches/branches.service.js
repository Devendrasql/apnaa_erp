'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function listBranches() {
  return executeQuery('SELECT * FROM branches WHERE is_deleted = FALSE ORDER BY name ASC');
}

async function getBranch(id) {
  const [row] = await executeQuery('SELECT * FROM branches WHERE id = ? AND is_deleted = FALSE', [id]);
  return row || null;
}

async function createBranch({ name, code, address, city, state, pincode, phone, email, license_number, gst_number, manager_id }) {
  const [result] = await executeQuery(
    `INSERT INTO branches (name, code, address, city, state, pincode, phone, email, license_number, gst_number, manager_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, code, address, city, state, pincode, phone || null, email || null, license_number, gst_number || null, manager_id || null]
  );
  return { id: result.insertId };
}

async function updateBranch(id, { name, code, address, city, state, pincode, phone, email, license_number, gst_number, manager_id, is_active }) {
  const [result] = await executeQuery(
    `UPDATE branches SET name = ?, code = ?, address = ?, city = ?, state = ?, pincode = ?, phone = ?, email = ?, license_number = ?, gst_number = ?, manager_id = ?, is_active = ?
      WHERE id = ? AND is_deleted = FALSE`,
    [name, code, address, city, state, pincode, phone || null, email || null, license_number, gst_number || null, manager_id || null, is_active ? 1 : 0, id]
  );
  return result.affectedRows;
}

async function softDeleteBranch(id) {
  const result = await executeQuery('UPDATE branches SET is_deleted = TRUE, is_active = FALSE WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  softDeleteBranch,
};

