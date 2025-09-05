const { executeQuery, getConnection } = require('../utils/database');
const { validationResult } = require('express-validator');

const ORG_ID = 1; // TODO: derive from auth/session

const listStdDiscounts = async (req, res, next) => {
  try {
    const branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
    let rows;
    if (branchId) {
      rows = await executeQuery(
        `SELECT id, org_id, branch_id, name, percentage, is_active
         FROM std_discounts
         WHERE org_id = ? AND branch_id = ?
         ORDER BY percentage`,
        [ORG_ID, branchId]
      );
    } else {
      rows = await executeQuery(
        `SELECT id, org_id, branch_id, name, percentage, is_active
         FROM std_discounts
         WHERE org_id = ?
         ORDER BY branch_id, percentage`,
        [ORG_ID]
      );
    }
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

const createStdDiscount = async (req, res, next) => {
  const conn = await getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { branch_id, name, percentage, is_active = true } = req.body;

    await conn.execute(
      `INSERT INTO std_discounts (org_id, branch_id, name, percentage, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [ORG_ID, branch_id, String(name).trim(), Number(percentage), is_active ? 1 : 0]
    );

    res.status(201).json({ success: true, message: 'Standard discount created' });
  } catch (e) {
    next(e);
  }
};

const updateStdDiscount = async (req, res, next) => {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);
    const { branch_id, name, percentage, is_active } = req.body;

    const fields = [];
    const params = [];

    if (branch_id !== undefined)  { fields.push('branch_id = ?'); params.push(Number(branch_id)); }
    if (name !== undefined)       { fields.push('name = ?'); params.push(String(name).trim()); }
    if (percentage !== undefined) { fields.push('percentage = ?'); params.push(Number(percentage)); }
    if (is_active !== undefined)  { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (!fields.length) return res.json({ success: true, message: 'No changes' });

    params.push(id, ORG_ID);

    await conn.execute(
      `UPDATE std_discounts SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`,
      params
    );

    res.json({ success: true, message: 'Standard discount updated' });
  } catch (e) {
    next(e);
  }
};

const deleteStdDiscount = async (req, res, next) => {
  const conn = await getConnection();
  try {
    const id = Number(req.params.id);
    await conn.execute(
      `UPDATE std_discounts SET is_active = 0 WHERE id = ? AND org_id = ?`,
      [id, ORG_ID]
    );
    res.json({ success: true, message: 'Standard discount deactivated' });
  } catch (e) {
    next(e);
  }
};

module.exports = { listStdDiscounts, createStdDiscount, updateStdDiscount, deleteStdDiscount };
