// backend/src/controllers/uiController.js
// UI-facing endpoints: menus, permissions, feature flags.

const { buildForUser } = require('../utils/menuBuilder');
const { executeQuery } = require('../utils/database');

/** GET /api/ui/menus — role-filtered menu tree */
async function getMenus(req, res, next) {
  try {
    const tree = await buildForUser(req.user);
    return res.json({ success: true, data: tree });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/ui/permissions — current user's permission names */
async function getPermissions(req, res, next) {
  try {
    const list = Array.from(req.user?.permissions || []);
    return res.json({ success: true, data: list });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/ui/features — feature flags (defaults + DB overrides)
 * If table `feature_flags` doesn't exist, returns defaults.
 */
async function getFeatures(req, res, next) {
  try {
    const { org_id, role_id } = req.user || {};

    // Phase-1 defaults
    const defaults = {
      enable_online_orders: true,
      enable_purchase_ocr: true,
      enable_delivery: true,
    };

    let rows = [];
    try {
      rows = await executeQuery(
        `
        SELECT \`key\`, is_enabled, org_id, role_id
        FROM feature_flags
        WHERE (org_id = ? OR org_id IS NULL)
          AND (role_id = ? OR role_id IS NULL)
        ORDER BY
          (CASE
             WHEN org_id IS NOT NULL AND role_id IS NOT NULL THEN 1
             WHEN org_id IS NOT NULL AND role_id IS NULL THEN 2
             WHEN org_id IS NULL AND role_id IS NOT NULL THEN 3
             ELSE 4
           END)
        `,
        [org_id ?? null, role_id ?? null]
      );
    } catch (_e) {
      // table may not exist yet → ignore and use defaults
    }

    const flags = { ...defaults };
    for (const r of rows) flags[r.key] = !!r.is_enabled;

    return res.json({ success: true, data: flags });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMenus,
  getPermissions,
  getFeatures,
};
