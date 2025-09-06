'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./ui.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

router.get('/menus', abacEnforce({ anyPermissions: ['menus:view', 'ui:read'] }), Controller.menus);
router.get('/permissions', abacEnforce({ anyPermissions: ['permissions:view', 'ui:read'] }), Controller.permissions);
router.get('/features', abacEnforce({ anyPermissions: ['features:view', 'ui:read'] }), Controller.features);
router.get('/bootstrap', abacEnforce({ anyPermissions: ['ui:read'] }), Controller.bootstrap);

module.exports = router;
