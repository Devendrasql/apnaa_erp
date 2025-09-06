'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function listMenusWithGates() {
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
  for (const g of gates) {
    if (!permMap.has(g.menu_id)) permMap.set(g.menu_id, []);
    permMap.get(g.menu_id).push(g.permission_name);
  }
  return menus.map(m => ({ ...m, permissions: permMap.get(m.id) || [] }));
}

async function setMenuPermissions(menuId, permissionNames = []) {
  // Resolve name -> id
  const all = await executeQuery('SELECT id, name FROM permissions');
  const byName = new Map(all.map(r => [r.name, r.id]));
  const ids = [];
  for (const name of permissionNames) {
    const pid = byName.get(name);
    if (!pid) {
      const err = new Error(`Unknown permission: ${name}`);
      err.status = 400; throw err;
    }
    ids.push(pid);
  }
  await executeQuery('DELETE FROM menu_permissions WHERE menu_id = ?', [menuId]);
  if (ids.length) {
    const values = ids.map(pid => [menuId, pid]);
    // Bulk insert using VALUES (...),(...)
    const placeholders = values.map(() => '(?, ?)').join(',');
    await executeQuery(`INSERT INTO menu_permissions (menu_id, permission_id) VALUES ${placeholders}`, values.flat());
  }
}

module.exports = { listMenusWithGates, setMenuPermissions };

