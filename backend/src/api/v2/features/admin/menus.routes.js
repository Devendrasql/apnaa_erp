'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./menus.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// Require capability to manage menu gates
const guard = abacEnforce({ anyPermissions: ['rbac.menu.manage'] });

router.get('/', guard, Controller.list);
router.put('/:id/permissions', guard, validate([param('id').isInt({ min: 1 }), body('permissions').isArray()]), Controller.setPermissions);

module.exports = router;
