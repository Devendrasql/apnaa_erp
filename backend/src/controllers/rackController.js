const { executeQuery, getConnection } = require('../utils/database');
const { validationResult } = require('express-validator');

const ORG_ID = 1; // TODO: derive from auth/session

const listRacks = async (req, res, next) => {
  try {
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    let rows;
    if (branchId) {
      rows = await executeQuery(
        `SELECT id, org_id, branch_id, rack_code, rack_name, is_active
         FROM racks
         WHERE org_id = ? AND branch_id = ?
         ORDER BY rack_code`,
        [ORG_ID, branchId]
      );
    } else {
      rows = await executeQuery(
        `SELECT id, org_id, branch_id, rack_code, rack_name, is_active
         FROM racks
         WHERE org_id = ?
         ORDER BY branch_id, rack_code`,
        [ORG_ID]
      );
    }
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

const createRack = async (req, res, next) => {
  const conn = await getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { branch_id, rack_code, rack_name, is_active = true } = req.body;

    await conn.execute(
      `INSERT INTO racks (org_id, branch_id, rack_code, rack_name, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [ORG_ID, branch_id, String(rack_code).trim(), rack_name ? String(rack_name).trim() : null, is_active ? 1 : 0]
    );

    res.status(201).json({ success: true, message: 'Rack created' });
  } catch (e) {
    next(e);
  }
};

const updateRack = async (req, res, next) => {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);
    const { branch_id, rack_code, rack_name, is_active } = req.body;

    // Build dynamic update
    const fields = [];
    const params = [];

    if (branch_id !== undefined) { fields.push('branch_id = ?'); params.push(Number(branch_id)); }
    if (rack_code !== undefined)  { fields.push('rack_code = ?'); params.push(String(rack_code).trim()); }
    if (rack_name !== undefined)  { fields.push('rack_name = ?'); params.push(rack_name ? String(rack_name).trim() : null); }
    if (is_active !== undefined)  { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (!fields.length) return res.json({ success: true, message: 'No changes' });

    params.push(id, ORG_ID);

    await conn.execute(
      `UPDATE racks SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`,
      params
    );

    res.json({ success: true, message: 'Rack updated' });
  } catch (e) {
    next(e);
  }
};

const deleteRack = async (req, res, next) => {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);
    // soft delete: deactivate
    await conn.execute(
      `UPDATE racks SET is_active = 0 WHERE id = ? AND org_id = ?`,
      [id, ORG_ID]
    );
    res.json({ success: true, message: 'Rack deactivated' });
  } catch (e) {
    next(e);
  }
};

module.exports = { listRacks, createRack, updateRack, deleteRack };
