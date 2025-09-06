'use strict';

const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./racks.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// GET /api/v2/racks?branch_id=#
router.get('/', Controller.list);

// POST /api/v2/racks
router.post(
  '/',
  abacEnforce({ anyPermissions: ['masters:add', 'rack:create', 'category:manage'] }),
  [
    body('branch_id').isInt({ min: 1 }).withMessage('branch_id is required'),
    body('rack_code').notEmpty().withMessage('rack_code is required')
  ],
  Controller.create
);

// PUT /api/v2/racks/:id
router.put(
  '/:id',
  abacEnforce({ anyPermissions: ['masters:modify', 'rack:update', 'category:manage'] }),
  [
    body('branch_id').optional().isInt({ min: 1 }),
    body('rack_code').optional().isString(),
    body('rack_name').optional().isString(),
    body('is_active').optional().isBoolean()
  ],
  Controller.update
);

// DELETE /api/v2/racks/:id (soft deactivate)
router.delete(
  '/:id',
  abacEnforce({ anyPermissions: ['masters:delete', 'rack:delete', 'category:manage'] }),
  Controller.remove
);

module.exports = router;
