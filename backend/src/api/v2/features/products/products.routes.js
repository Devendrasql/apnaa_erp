'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const { validate } = require('../../middleware/validate');
const Controller = require('./products.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// List products
router.get('/', abacEnforce({ anyPermissions: ['products:read', 'products:manage'] }), Controller.list);

// Lookups for product form
router.get('/lookups', abacEnforce({ anyPermissions: ['products:read', 'products:manage'] }), Controller.lookups);

// Ingredient search
router.get('/ingredients', abacEnforce({ anyPermissions: ['products:read', 'products:manage'] }), Controller.searchIngredients);

// Single product
router.get('/:id', abacEnforce({ anyPermissions: ['products:read', 'products:manage'] }), Controller.getOne);

// Create product
router.post('/', abacEnforce({ anyPermissions: ['products:create', 'products:manage'] }), validate([
  body('master.name').notEmpty().withMessage('Product name is required'),
  body('variants').isArray({ min: 1 }).withMessage('At least one product variant is required.')
]), Controller.create);

// Update product
router.put('/:id', abacEnforce({ anyPermissions: ['products:update', 'products:manage'] }), validate([ param('id').isInt({ min: 1 }) ]), Controller.update);

// Delete (soft)
router.delete('/:id', abacEnforce({ anyPermissions: ['products:delete', 'products:manage'] }), validate([ param('id').isInt({ min: 1 }) ]), Controller.remove);

module.exports = router;
