'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./discounts.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// GET /api/v2/discounts?branch_id=#
router.get('/', abacEnforce({ anyPermissions: ['discounts:read', 'masters:view', 'masters'] }), validate([ query('branch_id').optional().isInt({ min: 1 }) ]), Controller.list);

// POST /api/v2/discounts
router.post('/',
  abacEnforce({ anyPermissions: ['discounts:create', 'masters:add'] }),
  validate([
    body('branch_id').isInt({ min: 1 }).withMessage('branch_id is required'),
    body('name').notEmpty().withMessage('name is required'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('percentage must be 0-100')
  ]),
  Controller.create
);

// PUT /api/v2/discounts/:id
router.put('/:id',
  abacEnforce({ anyPermissions: ['discounts:update', 'masters:modify'] }),
  validate([
    param('id').isInt({ min: 1 }),
    body('branch_id').optional().isInt({ min: 1 }),
    body('name').optional().isString(),
    body('percentage').optional().isFloat({ min: 0, max: 100 }),
    body('is_active').optional().isBoolean()
  ]),
  Controller.update
);

// DELETE /api/v2/discounts/:id
router.delete('/:id', abacEnforce({ anyPermissions: ['discounts:delete', 'masters:delete'] }), validate([ param('id').isInt({ min: 1 }) ]), Controller.remove);

module.exports = router;
