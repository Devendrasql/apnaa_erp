'use strict';

const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./categories.controller');

const router = express.Router();

// All routes here are protected and load permissions
router.use(authMiddleware, loadPermissions);

// GET /api/v2/categories
router.get('/', Controller.list);

// POST /api/v2/categories
router.post(
  '/',
  abacEnforce({ anyPermissions: ['category:create', 'masters:add', 'category:manage'] }),
  [
    body('name').notEmpty().withMessage('Category name is required')
  ],
  Controller.create
);

// PUT /api/v2/categories/:id
router.put(
  '/:id',
  abacEnforce({ anyPermissions: ['category:update', 'masters:modify', 'category:manage'] }),
  [
    body('name').notEmpty().withMessage('Category name is required')
  ],
  Controller.update
);

// DELETE /api/v2/categories/:id
router.delete(
  '/:id',
  abacEnforce({ anyPermissions: ['category:delete', 'masters:delete', 'category:manage'] }),
  Controller.remove
);

module.exports = router;
