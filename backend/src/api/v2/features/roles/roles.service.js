'use strict';

const { executeQuery, getConnection } = require('../../../../../utils/database');
const { revokeSessionsByRoleId } = require('../../../../../repositories/sessions');

function groupPermissionsByCategory(rows) {
  const out = {};
  for (const r of rows) {
    const cat = r.category || 'General';
    if (!out[cat]) out[cat] = [];
    out[cat].push({ id: r.id, name: r.name, description: r.description, category: r.category || null });
  }
  return out;
}

async function listPermissions() {
  const rows = await executeQuery(
    `SELECT id, name, description, category
       FROM permissions
      ORDER BY COALESCE(category, 'General'), name`
  );
  return groupPermissionsByCategory(rows);
}

async function createPermission({ name, description = null, category = null }) {
  const sql = `INSERT INTO permissions (name, description, category) VALUES (?, ?, ?)`;
  await executeQuery(sql, [String(name).trim(), description, category]);
}

async function listRoles() {
  return executeQuery(
    `SELECT id, name, description, is_system_role FROM roles ORDER BY id ASC`
  );
}

async function getRole(roleId) {
  const [role] = await executeQuery(
    `SELECT id, name, description, is_system_role FROM roles WHERE id = ?`,
    [roleId]
  );
  if (!role) return null;
  const permissions = await executeQuery(
    `SELECT p.id, p.name, p.description, p.category
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY COALESCE(p.category, 'General'), p.name`,
    [roleId]
  );
  role.permissions = permissions;
  return role;
}

async function updateRolePermissions(roleId, { name, description, permissions = [] }) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`UPDATE roles SET name = ?, description = ? WHERE id = ?`, [String(name).trim(), description || null, roleId]);
    await conn.execute(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
    const ids = Array.isArray(permissions) ? permissions.map(Number).filter(Number.isFinite) : [];
    if (ids.length) {
      const values = ids.map(() => '(?, ?)').join(', ');
      const params = ids.flatMap((pid) => [roleId, pid]);
      await conn.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`, params);
    }
    await conn.commit();
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

function parseJson(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

async function getRoleFeatures(roleId) {
  const rows = await executeQuery(
    `SELECT f.feature_key, f.default_value, f.description, o.value AS override
       FROM features f
       LEFT JOIN role_feature_overrides o
         ON o.feature_key = f.feature_key AND o.role_id = ?
      ORDER BY f.feature_key`,
    [roleId]
  );
  return rows.map(r => ({
    key: r.feature_key,
    description: r.description,
    default_value: parseJson(r.default_value, false),
    override: r.override != null ? parseJson(r.override, null) : null,
  }));
}

async function updateRoleFeatures(roleId, features = {}) {
  const conn = await getConnection();
  let changed = false;
  try {
    await conn.beginTransaction();
    for (const [key, val] of Object.entries(features)) {
      if (val === null || typeof val === 'undefined') {
        const [res] = await conn.execute(
          `DELETE FROM role_feature_overrides WHERE role_id = ? AND feature_key = ?`,
          [roleId, key]
        );
        if (res.affectedRows) changed = true;
      } else {
        const jsonVal = JSON.stringify(val);
        const [res] = await conn.execute(
          `INSERT INTO role_feature_overrides (role_id, feature_key, value)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE value = VALUES(value)`,
          [roleId, key, jsonVal]
        );
        if (res.affectedRows) changed = true;
      }
    }
    await conn.commit();
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
  if (changed) {
    try { await revokeSessionsByRoleId(roleId, 'Role features updated'); } catch {}
  }
}

module.exports = {
  listPermissions,
  createPermission,
  listRoles,
  getRole,
  updateRolePermissions,
  getRoleFeatures,
  updateRoleFeatures,
};

