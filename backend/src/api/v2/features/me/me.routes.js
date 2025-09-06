'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { hasPermissionCode } = require('../../../../../middleware/rbac');
const { executeQuery } = require('../../../../../utils/database');

const router = express.Router();

// GET /api/v2/me/can?code=perm.code&branchId=#
router.get('/can', authMiddleware, async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const branchId = Number(req.query.branchId ?? req.headers['x-branch-id']);
    if (!code) return res.status(400).json({ success: false, message: 'code is required' });
    if (!Number.isFinite(branchId)) return res.status(400).json({ success: false, message: 'branchId required' });
    const allowed = await hasPermissionCode(Number(req.user.id), branchId, code);
    return res.json({ success: true, allowed });
  } catch (e) { return res.status(500).json({ success: false, message: 'failed', error: e.message }); }
});

// GET /api/v2/me/permissions?branchId=#
router.get('/permissions', authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const branchId = Number(req.query.branchId ?? req.headers['x-branch-id']);
    if (!Number.isFinite(branchId)) return res.status(400).json({ success: false, message: 'branchId required' });
    const rows = await executeQuery(
      `SELECT p.code
         FROM v_user_effective_perms v
         JOIN permissions p ON p.id = v.permission_id
        WHERE v.user_id = ? AND v.branch_id = ?
        ORDER BY p.code`,
      [userId, branchId]
    );
    return res.json({ success: true, codes: rows.map(r => r.code) });
  } catch (e) { return res.status(500).json({ success: false, message: 'failed', error: e.message }); }
});

module.exports = router;

