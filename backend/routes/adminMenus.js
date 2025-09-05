'use strict';

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { loadPermissions } = require('../middleware/permissions');
const { requirePermissionCode } = require('../middleware/rbac');
const { listMenusWithGates, setMenuPermissions } = require('../controllers/adminMenusController');

// admin-only (or anyone with rbac.menu.manage)
router.use(authMiddleware, loadPermissions, requirePermissionCode('rbac.menu.manage'));

router.get('/', listMenusWithGates);
router.put('/:id/permissions', setMenuPermissions);

module.exports = router;
