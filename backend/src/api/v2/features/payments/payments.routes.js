'use strict';

const express = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./payments.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// GET /api/v2/payments/outstanding
router.get('/outstanding', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('search').optional().isString()
]), abacEnforce({ anyPermissions: ['payments:read', 'sales:view'] }), Controller.outstanding);

// POST /api/v2/payments
router.post('/',
  abacEnforce({ anyPermissions: ['payments:create', 'sales:receivePayment', 'pos:collectPayment'] }),
  validate([
    body('sale_id').isInt().withMessage('A valid Sale ID is required'),
    body('amount_paid').isFloat({ gt: 0 }).withMessage('Amount paid must be a positive number'),
    body('payment_method').notEmpty().withMessage('Payment method is required'),
    body('payment_date').isISO8601().withMessage('A valid payment date is required')
  ]),
  Controller.create
);

module.exports = router;
