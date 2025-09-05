'use strict';

const { executeQuery } = require('../utils/database');

/**
 * GET /api/admin/menus
 * Return all active menus + attached permission names
 */
async function listMenusWithGates(_req, res, next) {
  try {
    const menus = await executeQuery(
      `SELECT id, parent_id, code, label, route_path, icon, sort_order, is_active
         FROM menus WHERE is_active = 1 ORDER BY COALESCE(sort_order,0), id`
    );

    const gates = await executeQuery(
      `SELECT mp.menu_id, p.name AS permission_name
         FROM menu_permissions mp
         JOIN permissions p ON p.id = mp.permission_id`
    );

    const permMap = new Map();
    gates.forEach(g => {
      if (!permMap.has(g.menu_id)) permMap.set(g.menu_id, []);
      permMap.get(g.menu_id).push(g.permission_name);
    });

    const data = menus.map(m => ({
      ...m,
      permissions: permMap.get(m.id) || []
    }));

    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * PUT /api/admin/menus/:id/permissions
 * Body: { permissions: ["foo.bar","x.y"...] }
 */
async function setMenuPermissions(req, res, next) {
  try {
    const id = Number(req.params.id);
    const perms = Array.isArray(req.body?.permissions) ? req.body.permissions : [];

    // resolve current permission ids map
    const all = await executeQuery('SELECT id, name FROM permissions');
    const byName = new Map(all.map(r => [r.name, r.id]));

    // validate names exist
    const ids = [];
    for (const name of perms) {
      const pid = byName.get(name);
      if (!pid) {
        return res.status(400).json({ success: false, message: `Unknown permission: ${name}` });
      }
      ids.push(pid);
    }

    // rewrite mapping in a tx
    await executeQuery('DELETE FROM menu_permissions WHERE menu_id = ?', [id]);
    if (ids.length) {
      const values = ids.map(pid => [id, pid]);
      const sql = 'INSERT INTO menu_permissions (menu_id, permission_id) VALUES ?';
      // mysql2 bulk insert via "query"
      await executeQuery(sql, [values]);
    }

    res.json({ success: true, message: 'Menu permissions updated' });
  } catch (err) { next(err); }
}

module.exports = { listMenusWithGates, setMenuPermissions };
