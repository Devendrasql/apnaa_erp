'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./dashboard.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

router.get('/stats', abacEnforce({ anyPermissions: ['dashboard:view'] }), Controller.stats);
router.get('/sales-over-time', abacEnforce({ anyPermissions: ['dashboard:view'] }), Controller.salesOverTime);
router.get('/top-selling', abacEnforce({ anyPermissions: ['dashboard:view'] }), Controller.topSelling);
router.get('/recent-sales', abacEnforce({ anyPermissions: ['dashboard:view'] }), Controller.recentSales);

module.exports = router;

