'use strict';

const { executeQuery } = require('../utils/database');

async function listPolicies(_req, res, next) {
  try {
    const rows = await executeQuery('SELECT * FROM abac_policies ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

async function createPolicy(req, res, next) {
  try {
    const { name, effect='allow', description=null, conditions={}, is_active=1 } = req.body || {};
    const json = JSON.stringify(conditions || {});
    const created_by = req.user?.id || null;
    const r = await executeQuery(
      'INSERT INTO abac_policies (name,effect,description,conditions,is_active,created_by) VALUES (?,?,?,?,?,?)',
      [name, effect, description, json, is_active ? 1 : 0, created_by]
    );
    res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (e) { next(e); }
}

async function updatePolicy(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, effect, description, conditions, is_active } = req.body || {};
    const parts = [];
    const vals = [];

    if (name != null) { parts.push('name=?'); vals.push(name); }
    if (effect != null) { parts.push('effect=?'); vals.push(effect); }
    if (description !== undefined) { parts.push('description=?'); vals.push(description); }
    if (conditions !== undefined) { parts.push('conditions=?'); vals.push(JSON.stringify(conditions || {})); }
    if (is_active !== undefined) { parts.push('is_active=?'); vals.push(is_active ? 1 : 0); }

    if (!parts.length) return res.json({ success: true, message: 'No changes' });

    vals.push(id);
    await executeQuery(`UPDATE abac_policies SET ${parts.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
}

async function removePolicy(req, res, next) {
  try {
    const id = Number(req.params.id);
    await executeQuery('DELETE FROM abac_policies WHERE id = ?', [id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
}

module.exports = { listPolicies, createPolicy, updatePolicy, removePolicy };
