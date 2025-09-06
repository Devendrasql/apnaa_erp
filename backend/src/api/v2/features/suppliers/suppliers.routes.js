'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./suppliers.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// GET /api/v2/suppliers
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('search').optional().isString()
], Controller.list);

// GET /api/v2/suppliers/gst/:gst_number
router.get('/gst/:gst_number', Controller.byGST);

// POST /api/v2/suppliers
router.post('/',
  abacEnforce({ anyPermissions: ['suppliers:create', 'masters:add'] }),
  [
    body('name').notEmpty().withMessage('Supplier name is required'),
    body('code').notEmpty().withMessage('Supplier code is required')
  ],
  Controller.create
);

// GET /api/v2/suppliers/:id
router.get('/:id', [param('id').isInt({ min: 1 })], Controller.getOne);

// PUT /api/v2/suppliers/:id
router.put('/:id',
  abacEnforce({ anyPermissions: ['suppliers:update', 'masters:modify'] }),
  [
    param('id').isInt({ min: 1 }),
    body('name').notEmpty().withMessage('Supplier name is required'),
    body('code').notEmpty().withMessage('Supplier code is required')
  ],
  Controller.update
);

// DELETE /api/v2/suppliers/:id
router.delete('/:id', abacEnforce({ anyPermissions: ['suppliers:delete', 'masters:delete'] }), [param('id').isInt({ min: 1 })], Controller.remove);

module.exports = router;

