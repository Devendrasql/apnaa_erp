'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./purchases.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// List
router.get('/',
  abacEnforce({ anyPermissions: ['purchases:read', 'purchases:manage'] }),
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString(),
    query('branch_id').optional().isInt({ min: 1 }),
    query('supplier_id').optional().isInt({ min: 1 }),
  ]),
  Controller.list
);

// Create
router.post('/',
  abacEnforce({ anyPermissions: ['purchases:create', 'purchases:manage'] }),
  validate([
    body('invoice_number').notEmpty(),
    body('invoice_date').isISO8601(),
    body('branch_id').isInt(),
    body('supplier_id').isInt(),
    body('items').isArray({ min: 1 })
  ]),
  Controller.create
);

// Read One
router.get('/:id', abacEnforce({ anyPermissions: ['purchases:read', 'purchases:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.getOne);

// Post to stock
router.post('/:id/post', abacEnforce({ anyPermissions: ['purchases:post', 'purchases:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.postToStock);

module.exports = router;
