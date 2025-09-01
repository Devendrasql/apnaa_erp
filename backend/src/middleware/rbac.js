'use strict';

const { executeQuery } = require('../utils/database');

/**
 * Uses DB helper function has_permission(user_id, branch_id, code) → 0/1
 */
async function hasPermissionCode(userId, branchId, code) {
  const rows = await executeQuery(
    'SELECT has_permission(?, ?, ?) AS allowed',
    [userId, branchId, code]
  );
  return rows?.[0]?.allowed === 1;
}

/**
 * Express guard: require a specific permission code at the active branch.
 * Accepts branch from ?branchId= or header x-branch-id.
 *
 * Usage:
 *   router.post('/:id/approve',
 *     authMiddleware,
 *     requirePermissionCode('procurement.po.approve'),
 *     controller.approve)
 */
function requirePermissionCode(code) {
  return async (req, res, next) => {
    try {
      const userId = Number(req.user?.id);
      // prefer already parsed value (set in authMiddleware), else try header/query
      const branchId =
        req.branchId != null
          ? Number(req.branchId)
          : (req.headers['x-branch-id'] != null
              ? Number(req.headers['x-branch-id'])
              : (req.query.branchId != null ? Number(req.query.branchId) : NaN));

      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      if (!Number.isFinite(branchId)) {
        return res.status(400).json({ success: false, message: 'branchId required (query or x-branch-id)' });
      }

      const ok = await hasPermissionCode(userId, branchId, code);
      if (!ok) return res.status(403).json({ success: false, message: 'Forbidden', code });

      return next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'RBAC check failed', error: err.message });
    }
  };
}

module.exports = {
  hasPermissionCode,
  requirePermissionCode,
};
