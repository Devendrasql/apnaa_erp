'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./transfers.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// List
router.get('/',
  abacEnforce({ anyPermissions: ['transfers:read', 'inventory:manage'] }),
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('from_branch_id').optional().isInt({ min: 1 }),
    query('to_branch_id').optional().isInt({ min: 1 }),
    query('status').optional().isString(),
  ]),
  Controller.list
);

// Create
router.post('/',
  abacEnforce({ anyPermissions: ['transfers:create', 'inventory:manage'] }),
  validate([
    body('from_branch_id').isInt(),
    body('to_branch_id').isInt(),
    body('items').isArray({ min: 1 })
  ]),
  Controller.create
);

// Read One
router.get('/:id', abacEnforce({ anyPermissions: ['transfers:read', 'inventory:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.getOne);

// Update status
router.put('/:id/status',
  abacEnforce({ anyPermissions: ['transfers:update', 'inventory:manage'] }),
  validate([param('id').isInt({ min: 1 }), body('status').isIn(['in_transit', 'received', 'cancelled'])]),
  Controller.updateStatus
);

module.exports = router;
