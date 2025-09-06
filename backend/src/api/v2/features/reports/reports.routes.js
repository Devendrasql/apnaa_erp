'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./reports.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

router.get('/daily-sales', abacEnforce({ anyPermissions: ['reports:view', 'sales:view'] }), Controller.dailySales);
router.get('/inventory', abacEnforce({ anyPermissions: ['reports:view', 'inventory:view'] }), Controller.inventory);
router.get('/product-performance', abacEnforce({ anyPermissions: ['reports:view'] }), Controller.productPerformance);

module.exports = router;

