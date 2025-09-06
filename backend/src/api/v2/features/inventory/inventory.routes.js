'use strict';

const express = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./inventory.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// GET /api/v2/inventory/stock
router.get('/stock',
  abacEnforce({ anyPermissions: ['inventory:view', 'inventory:manage'] }),
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString(),
    query('branch_id').optional().isInt({ min: 1 }),
    query('expiring_soon').optional().isBoolean(),
  ]),
  Controller.stock
);

// POST /api/v2/inventory/add-stock
router.post('/add-stock',
  abacEnforce({ anyPermissions: ['inventory:addStock', 'purchases:post', 'inventory:manage'] }),
  validate([
    body('variant_id').isInt().withMessage('Valid variant ID required'),
    body('branch_id').isInt().withMessage('Valid branch ID required'),
    body('quantity').isInt({ min: 1 }).withMessage('Valid quantity required'),
    body('batch_number').notEmpty().withMessage('Batch number required'),
    body('expiry_date').isISO8601().withMessage('Valid expiry date required'),
    body('purchase_price').isFloat({ min: 0 }).withMessage('Valid purchase price required'),
    body('mrp').isFloat({ min: 0 }).withMessage('Valid MRP required'),
    body('selling_price').isFloat({ min: 0 }).withMessage('Valid selling price required')
  ]),
  Controller.addStock
);

// POST /api/v2/inventory/adjust-stock
router.post('/adjust-stock',
  abacEnforce({ anyPermissions: ['inventory:adjust', 'inventory:manage'] }),
  validate([
    body('stock_id').isInt().withMessage('A valid stock item ID is required'),
    body('quantity_change').isNumeric().withMessage('Quantity change must be a number'),
    body('reason').notEmpty().withMessage('A reason for the adjustment is required'),
  ]),
  Controller.adjustStock
);

module.exports = router;
