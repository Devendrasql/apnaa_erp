'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./settings.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// GET /api/v2/settings
router.get('/', abacEnforce({ anyPermissions: ['settings:read', 'settings:view'] }), Controller.list);

// PUT /api/v2/settings
router.put('/', abacEnforce({ anyPermissions: ['settings:update'] }), Controller.update);

module.exports = router;

