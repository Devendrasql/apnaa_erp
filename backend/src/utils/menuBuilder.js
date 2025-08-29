// backend/src/utils/menuBuilder.js
// Build a permission-gated menu tree from DB tables without introducing a new "services" dir.
//
// Tables used:
//   - menus (id, parent_id, code, label, route_path, icon, sort_order, is_active)
//   - menu_permissions (menu_id, permission_id)
//   - permissions (id, name)
//   - role_permissions (role_id, permission_id)
//
// Policy:
//   • A menu is visible if it has NO permission gates OR the user has AT LEAST ONE of
//     the permissions linked to that menu.
//   • Parents auto-include if any child is allowed.
//   • Output is a clean tree the frontend can render directly.
//
// This file exports:
//   - buildForUser(user)  → returns a filtered tree using user.role_id
//   - (internally uses a small per-role cache to reduce DB hits)

const { executeQuery } = require('./database');

// very small cache to avoid pounding DB on every request (per role_id)
const CACHE = new Map(); // key: `role:${roleId}` -> { at:number, data:Array }
const TTL_MS = 60 * 1000;

/** Load all active menus (flat list) */
async function fetchMenus() {
  const rows = await executeQuery(
    `
    SELECT id, parent_id, code, label, route_path, icon, sort_order, is_active
    FROM menus
    WHERE is_active = 1
    ORDER BY COALESCE(sort_order,0), id
    `
  );
  return rows;
}

/** Build a map: menu_id -> [permission_name, ...] */
async function fetchMenuPermMap() {
  const rows = await executeQuery(
    `
    SELECT mp.menu_id, p.name AS permission_name
    FROM menu_permissions mp
    JOIN permissions p ON p.id = mp.permission_id
    `
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.menu_id)) map.set(r.menu_id, []);
    map.get(r.menu_id).push(r.permission_name);
  }
  return map;
}

/** Permissions granted to role_id (as Set<string>) */
async function fetchRolePerms(roleId) {
  const rows = await executeQuery(
    `
    SELECT p.name
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    `,
    [roleId]
  );
  return new Set(rows.map(r => r.name));
}

/** ANY-of required permissions policy for a single menu */
function isMenuAllowed(requiredPerms, rolePerms) {
  if (!requiredPerms || requiredPerms.length === 0) return true; // no gates → visible
  return requiredPerms.some(p => rolePerms.has(p)); // visible if at least one matches
}

/**
 * Convert flat menus → tree, compute allowed flags, then prune disallowed nodes.
 * Parents are kept if they or ANY child is allowed.
 */
function buildTreeAndFilter({ menus, menuPermMap, rolePerms }) {
  const byId = new Map();
  const roots = [];

  // 1) Create nodes
  for (const m of menus) {
    const node = {
      id: m.id,
      parent_id: m.parent_id,
      key: m.code,
      label: m.label,
      path: m.route_path || null,
      icon: m.icon || null,
      sort_order: m.sort_order ?? 0,
      requiredPerms: menuPermMap.get(m.id) || [],
      children: [],
      _selfAllowed: false,
      _allowed: false,
    };
    byId.set(m.id, node);
  }

  // 2) Link parent/children
  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id).children.push(n);
    } else {
      roots.push(n);
    }
  }

  // 3) Check self-allowed
  for (const n of byId.values()) {
    n._selfAllowed = isMenuAllowed(n.requiredPerms, rolePerms);
  }

  // 4) Post-order traversal to compute allowed = self OR any child
  function markAllowed(n) {
    let childAllowed = false;
    for (const c of n.children) {
      childAllowed = markAllowed(c) || childAllowed;
    }
    n._allowed = n._selfAllowed || childAllowed;
    return n._allowed;
  }
  for (const r of roots) markAllowed(r);

  // 5) Prune disallowed & sort by sort_order
  function prune(n) {
    if (!n._allowed) return null;
    const kept = [];
    for (const c of n.children) {
      const p = prune(c);
      if (p) kept.push(p);
    }
    kept.sort((a, b) => (a.sort_order - b.sort_order) || a.key.localeCompare(b.key));
    return {
      key: n.key,
      label: n.label,
      path: n.path,
      icon: n.icon,
      sort_order: n.sort_order,
      children: kept,
    };
  }

  const out = [];
  for (const r of roots) {
    const p = prune(r);
    if (p) out.push(p);
  }
  out.sort((a, b) => (a.sort_order - b.sort_order) || a.key.localeCompare(b.key));
  return out;
}

/** Public API: build menus for the given user (uses small per-role cache) */
async function buildForUser(user) {
  const roleId = user?.role_id;
  if (!roleId) return [];

  const cacheKey = `role:${roleId}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.data;
  }

  const [menus, menuPermMap, rolePerms] = await Promise.all([
    fetchMenus(),
    fetchMenuPermMap(),
    fetchRolePerms(roleId),
  ]);

  const tree = buildTreeAndFilter({ menus, menuPermMap, rolePerms });
  CACHE.set(cacheKey, { at: Date.now(), data: tree });
  return tree;
}

module.exports = {
  buildForUser,
};
