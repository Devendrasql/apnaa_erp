'use strict';

const { loadPolicies, evaluate } = require('../src/api/v2/services/policy.engine');

/**
 * ABAC enforcement middleware that composes with RBAC.
 * Options:
 *  - anyPermissions: string[] (permission names) -> requires ANY in req.user.permissions
 *  - allPermissions: string[] -> requires ALL in req.user.permissions
 *  - getResource: (req) => any  -> optional resource resolver to enrich context
 */
function abacEnforce(options = {}) {
  const anyPerms = Array.isArray(options.anyPermissions) ? options.anyPermissions : [];
  const allPerms = Array.isArray(options.allPermissions) ? options.allPermissions : [];
  const getResource = typeof options.getResource === 'function' ? options.getResource : () => null;

  return async (req, res, next) => {
    try {
      // Elevation bypass for admins/managers (mirrors frontend AuthContext logic)
      const roleName = String(req.user?.role || '').toLowerCase().replace(/\s+/g, '_');
      const elevated = ['super_admin', 'admin', 'manager', 'system_admin', 'sa'].includes(roleName);
      if (elevated) return next();

      const user = req.user || {};
      const perms = user.permissions instanceof Set ? user.permissions : new Set(Array.isArray(user.permissions) ? user.permissions : []);

      if (anyPerms.length && !anyPerms.some(p => perms.has(p))) {
        return res.status(403).json({ success: false, message: 'Forbidden (RBAC any)', need_any: anyPerms });
      }
      if (allPerms.length && !allPerms.every(p => perms.has(p))) {
        return res.status(403).json({ success: false, message: 'Forbidden (RBAC all)', need_all: allPerms });
      }

      const policies = await loadPolicies();
      const resource = await Promise.resolve(getResource(req));
      const ctx = {
        user,
        branchId: req.branchId ?? (req.headers['x-branch-id'] != null ? Number(req.headers['x-branch-id']) : undefined),
        resource,
        params: req.params,
        query: req.query,
        body: req.body,
      };
      const result = evaluate(policies, ctx);
      if (result.decision === 'deny') {
        return res.status(403).json({ success: false, message: 'Forbidden (ABAC)', policy: result.policy?.name || null });
      }
      return next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'ABAC evaluation failed', error: err.message });
    }
  };
}

module.exports = { abacEnforce };
