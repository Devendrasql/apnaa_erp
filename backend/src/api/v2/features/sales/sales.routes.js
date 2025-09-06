'use strict';

const express = require('express');
const { query, param, body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./sales.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// GET /api/v2/sales
router.get('/',
  abacEnforce({ anyPermissions: ['sales:read', 'sales:manage'] }),
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString(),
    query('branch_id').optional().isInt({ min: 1 }),
    query('customer_id').optional().isInt({ min: 1 }),
  ]),
  Controller.list
);

// GET /api/v2/sales/:id
router.get('/:id', abacEnforce({ anyPermissions: ['sales:read', 'sales:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.getOne);

// Create sale (POS)
router.post('/', abacEnforce({ anyPermissions: ['sales:create', 'pos:create', 'sales:manage'] }), validate([
  body('branch_id').isInt(),
  body('items').isArray({ min: 1 })
]), Controller.create);

// Cancel sale
router.post('/:id/cancel', abacEnforce({ anyPermissions: ['sales:cancel', 'sales:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.cancel);

module.exports = router;
