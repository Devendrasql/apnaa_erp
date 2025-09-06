'use strict';

const { executeQuery, getConnection } = require('../../../../../utils/database');

async function listRacks({ orgId, branchId = null }) {
  if (branchId) {
    return executeQuery(
      `SELECT id, org_id, branch_id, rack_code, rack_name, is_active
         FROM racks
        WHERE org_id = ? AND branch_id = ?
        ORDER BY rack_code`,
      [orgId, branchId]
    );
  }
  return executeQuery(
    `SELECT id, org_id, branch_id, rack_code, rack_name, is_active
       FROM racks
      WHERE org_id = ?
      ORDER BY branch_id, rack_code`,
    [orgId]
  );
}

async function createRack({ orgId, branch_id, rack_code, rack_name = null, is_active = true }) {
  await executeQuery(
    `INSERT INTO racks (org_id, branch_id, rack_code, rack_name, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [orgId, branch_id, String(rack_code).trim(), rack_name ? String(rack_name).trim() : null, is_active ? 1 : 0]
  );
}

async function updateRack(id, { orgId, branch_id, rack_code, rack_name, is_active }) {
  const fields = [];
  const params = [];
  if (branch_id !== undefined) { fields.push('branch_id = ?'); params.push(Number(branch_id)); }
  if (rack_code !== undefined)  { fields.push('rack_code = ?'); params.push(String(rack_code).trim()); }
  if (rack_name !== undefined)  { fields.push('rack_name = ?'); params.push(rack_name ? String(rack_name).trim() : null); }
  if (is_active !== undefined)  { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (!fields.length) return 0;
  params.push(id, orgId);
  const result = await executeQuery(
    `UPDATE racks SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`,
    params
  );
  return result.affectedRows;
}

async function deactivateRack(id, { orgId }) {
  const result = await executeQuery(
    `UPDATE racks SET is_active = 0 WHERE id = ? AND org_id = ?`,
    [id, orgId]
  );
  return result.affectedRows;
}

module.exports = {
  listRacks,
  createRack,
  updateRack,
  deactivateRack,
};

