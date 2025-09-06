'use strict';

const express = require('express');
const { body, query, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./customers.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// List
router.get('/',
  abacEnforce({ anyPermissions: ['customers:read', 'customers:manage'] }),
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString()
  ]),
  Controller.list
);

// Create
router.post('/',
  abacEnforce({ anyPermissions: ['customers:create', 'customers:manage'] }),
  validate([
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').notEmpty().withMessage('Phone number is required')
  ]),
  Controller.create
);

// Read one
router.get('/:id', abacEnforce({ anyPermissions: ['customers:read', 'customers:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.getOne);

// Update
router.put('/:id',
  abacEnforce({ anyPermissions: ['customers:update', 'customers:manage'] }),
  validate([
    param('id').isInt({ min: 1 }),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').notEmpty().withMessage('Phone number is required')
  ]),
  Controller.update
);

// Delete
router.delete('/:id', abacEnforce({ anyPermissions: ['customers:delete', 'customers:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.remove);

module.exports = router;
