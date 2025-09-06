'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function listPolicies() {
  return executeQuery('SELECT * FROM abac_policies ORDER BY id DESC');
}

async function createPolicy({ name, effect = 'allow', description = null, conditions = {}, is_active = 1 }, user) {
  const json = JSON.stringify(conditions || {});
  const created_by = user?.id || null;
  const r = await executeQuery(
    'INSERT INTO abac_policies (name,effect,description,conditions,is_active,created_by) VALUES (?,?,?,?,?,?)',
    [name, effect, description, json, is_active ? 1 : 0, created_by]
  );
  return { id: r.insertId };
}

async function updatePolicy(id, { name, effect, description, conditions, is_active }) {
  const parts = [];
  const vals = [];
  if (name != null) { parts.push('name=?'); vals.push(name); }
  if (effect != null) { parts.push('effect=?'); vals.push(effect); }
  if (description !== undefined) { parts.push('description=?'); vals.push(description); }
  if (conditions !== undefined) { parts.push('conditions=?'); vals.push(JSON.stringify(conditions || {})); }
  if (is_active !== undefined) { parts.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!parts.length) return 0;
  vals.push(id);
  await executeQuery(`UPDATE abac_policies SET ${parts.join(', ')} WHERE id = ?`, vals);
  return 1;
}

async function removePolicy(id) {
  await executeQuery('DELETE FROM abac_policies WHERE id = ?', [id]);
}

module.exports = { listPolicies, createPolicy, updatePolicy, removePolicy };

