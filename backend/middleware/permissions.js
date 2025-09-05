// backend/src/middleware/permissions.js
// Loads role permissions and exposes RBAC guards

const { executeQuery } = require('../utils/database');

// very small cache to avoid repetitive DB hits per role for 60s
const CACHE = new Map(); // role_id -> { at:number, perms:Set<string> }
const TTL_MS = 60 * 1000;

async function fetchRolePermissions(roleId) {
    const hit = CACHE.get(roleId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.perms;

    const rows = await executeQuery(
        `SELECT p.name
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?`,
        [roleId]
    );
    const perms = new Set(rows.map(r => r.name));
    CACHE.set(roleId, { at: Date.now(), perms });
    return perms;
}


async function loadPermissions(req, _res, next) {
    try {
        // add at top of loadPermissions()
        if (req.user?.permissions instanceof Set) return next();
        if (!req.user?.role_id) return next();
        req.user.permissions = await fetchRolePermissions(req.user.role_id);
        next();
    } catch (err) { next(err); }
}

function requirePermission(name) {
    return (req, res, next) => {
        if (!req.user?.permissions?.has(name)) {
            return res.status(403).json({ error: 'Forbidden', need: name });
        }
        next();
    };
}

function requireAllPermissions(list = []) {
    return (req, res, next) => {
        const perms = req.user?.permissions || new Set();
        const missing = list.filter(n => !perms.has(n));
        if (missing.length) return res.status(403).json({ error: 'Forbidden', missing });
        next();
    };
}

function requireAnyPermission(list = []) {
    return (req, res, next) => {
        const perms = req.user?.permissions || new Set();
        const ok = list.some(n => perms.has(n));
        if (!ok) return res.status(403).json({ error: 'Forbidden', need_any: list });
        next();
    };
}

module.exports = {
    loadPermissions,
    requirePermission,
    requireAllPermissions,
    requireAnyPermission
};
