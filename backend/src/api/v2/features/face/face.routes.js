'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./face.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

router.post('/customers/:id/enroll', abacEnforce({ anyPermissions: ['face:enroll', 'customers:update'] }), Controller.enroll);
router.post('/identify', abacEnforce({ anyPermissions: ['face:identify', 'customers:read'] }), Controller.identify);

module.exports = router;

