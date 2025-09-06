'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./brands.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// LIST manufacturers with brands
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString().trim(),
    query('include_inactive').optional().isBoolean()
  ],
  Controller.list
);

// GET one manufacturer (+ brands)
router.get('/:id', [param('id').isInt({ min: 1 })], Controller.get);

// CREATE manufacturer + nested brands
router.post(
  '/',
  abacEnforce({ anyPermissions: ['masters:add', 'brands:create', 'mfg:create'] }),
  [
    body('name').trim().notEmpty().withMessage('Manufacturer name is required'),
    body('category').optional().isString().trim(),
    body('is_active').optional().isBoolean(),
    body('brands').isArray().withMessage('brands must be an array'),
    body('brands.*.name').trim().notEmpty().withMessage('Brand name is required'),
    body('brands.*.is_active').optional().isBoolean()
  ],
  Controller.create
);

// UPDATE manufacturer + nested brands
router.put(
  '/:id',
  abacEnforce({ anyPermissions: ['masters:modify', 'brands:update', 'mfg:update'] }),
  [
    param('id').isInt({ min: 1 }),
    body('name').trim().notEmpty(),
    body('category').optional().isString().trim(),
    body('is_active').isBoolean(),
    body('brands').isArray(),
    body('brands.*.id').optional().isInt({ min: 1 }),
    body('brands.*.name').trim().notEmpty(),
    body('brands.*.is_active').isBoolean()
  ],
  Controller.update
);

// TOGGLE manufacturer
router.patch('/:id/active', abacEnforce({ anyPermissions: ['masters:modify', 'mfg:update'] }), [param('id').isInt({ min: 1 }), body('is_active').isBoolean()], Controller.toggleActive);

// IMPORT manufacturers + brands
router.post('/import', abacEnforce({ anyPermissions: ['masters:add', 'mfg:import'] }), Controller.import);

module.exports = router;

