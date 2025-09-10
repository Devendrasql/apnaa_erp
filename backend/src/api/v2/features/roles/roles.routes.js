'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./roles.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// Permissions listing/creation (admin)
router.get('/permissions', abacEnforce({ anyPermissions: ['roles:manage', 'permissions:view'] }), Controller.listPermissions);
router.post('/permissions', abacEnforce({ anyPermissions: ['roles:manage', 'permissions:create'] }), validate([
  body('name').notEmpty().withMessage('name is required'),
]), Controller.createPermission);

// Roles
router.get('/', abacEnforce({ anyPermissions: ['roles:read', 'roles:manage'] }), Controller.listRoles);
router.get('/:id', abacEnforce({ anyPermissions: ['roles:read', 'roles:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.getRole);
router.put('/:id', abacEnforce({ anyPermissions: ['roles:manage'] }), validate([
  param('id').isInt({ min: 1 }),
  body('name').notEmpty().withMessage('name is required'),
  body('permissions').isArray().withMessage('permissions must be an array'),
]), Controller.update);

router.get('/:id/features', abacEnforce({ anyPermissions: ['roles:read', 'roles:manage'] }),
  validate([param('id').isInt({ min: 1 })]), Controller.getFeatures);
router.put('/:id/features', abacEnforce({ anyPermissions: ['roles:manage'] }),
  validate([param('id').isInt({ min: 1 })]), Controller.updateFeatures);

module.exports = router;
