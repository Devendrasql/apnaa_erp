'use strict';

const { executeQuery, getConnection } = require('../../../../../utils/database');

async function listDiscounts({ org_id, branch_id }) {
  if (branch_id) {
    return executeQuery(
      `SELECT id, org_id, branch_id, name, percentage, is_active
         FROM std_discounts
        WHERE org_id = ? AND branch_id = ?
        ORDER BY percentage`,
      [org_id, branch_id]
    );
  }
  return executeQuery(
    `SELECT id, org_id, branch_id, name, percentage, is_active
       FROM std_discounts
      WHERE org_id = ?
      ORDER BY branch_id, percentage`,
    [org_id]
  );
}

async function createDiscount({ org_id, branch_id, name, percentage, is_active = true }) {
  await executeQuery(
    `INSERT INTO std_discounts (org_id, branch_id, name, percentage, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [org_id, branch_id, String(name).trim(), Number(percentage), is_active ? 1 : 0]
  );
}

async function updateDiscount(id, org_id, { branch_id, name, percentage, is_active }) {
  const fields = [];
  const params = [];
  if (branch_id !== undefined)  { fields.push('branch_id = ?'); params.push(Number(branch_id)); }
  if (name !== undefined)       { fields.push('name = ?'); params.push(String(name).trim()); }
  if (percentage !== undefined) { fields.push('percentage = ?'); params.push(Number(percentage)); }
  if (is_active !== undefined)  { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (!fields.length) return 0;
  params.push(id, org_id);
  const r = await executeQuery(`UPDATE std_discounts SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`, params);
  return r.affectedRows;
}

async function deactivateDiscount(id, org_id) {
  const r = await executeQuery(`UPDATE std_discounts SET is_active = 0 WHERE id = ? AND org_id = ?`, [id, org_id]);
  return r.affectedRows;
}

module.exports = {
  listDiscounts,
  createDiscount,
  updateDiscount,
  deactivateDiscount,
};

