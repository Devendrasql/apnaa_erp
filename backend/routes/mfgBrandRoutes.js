const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authorize } = require('../middleware/auth');
const ctrl = require('../controllers/mfgBrandController');

// LIST manufacturers with brands (comma search, pagination)
router.get(
  '/',
  authorize(['super_admin', 'admin', 'manager', 'user']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString().trim(),
    query('include_inactive').optional().isBoolean()
  ],
  ctrl.listMfgWithBrands
);

// GET one manufacturer (+ brands)
router.get(
  '/:id',
  authorize(['super_admin', 'admin', 'manager', 'user']),
  [param('id').isInt({ min: 1 })],
  ctrl.getMfgWithBrandsById
);

// CREATE manufacturer + nested brands
router.post(
  '/',
  authorize(['super_admin', 'admin', 'manager']),
  [
    body('name').trim().notEmpty().withMessage('Manufacturer name is required'),
    body('category').optional().isString().trim(),
    body('is_active').optional().isBoolean(),
    body('brands').isArray().withMessage('brands must be an array'),
    body('brands.*.name').trim().notEmpty().withMessage('Brand name is required'),
    body('brands.*.is_active').optional().isBoolean()
  ],
  ctrl.createMfgWithBrands
);

// UPDATE manufacturer + nested brands (no delete; only upsert/toggle)
router.put(
  '/:id',
  authorize(['super_admin', 'admin', 'manager']),
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
  ctrl.updateMfgWithBrands
);

// TOGGLE manufacturer (cascade to brands & products)
router.patch(
  '/:id/active',
  authorize(['super_admin', 'admin', 'manager']),
  [
    param('id').isInt({ min: 1 }),
    body('is_active').isBoolean()
  ],
  ctrl.toggleManufacturerActive
);

// IMPORT manufacturers + brands (CSV-parsed rows from frontend)
router.post(
  '/import',
  authorize(['super_admin', 'admin', 'manager']),
  ctrl.importManufacturers
);

module.exports = router;