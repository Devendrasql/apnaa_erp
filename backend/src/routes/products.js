const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductLookups,
  searchIngredients
} = require('../controllers/productController');

// GET all products
router.get('/', getAllProducts);

// Lookups for product form
router.get('/lookups', getProductLookups);

// Ingredient search
router.get('/ingredients', searchIngredients);

// Single product
router.get('/:id', getProductById);

// Create product
router.post(
  '/',
  authorize(['super_admin', 'admin', 'manager']),
  [
    body('master.name').notEmpty().withMessage('Product name is required'),
    body('master.category_id').notEmpty().withMessage('Category is required'),
    body('master.manufacturer_id').notEmpty().withMessage('Manufacturer is required'),
    body('master.product_type').isIn(['PHARMA', 'GENERAL']).withMessage('Product Type must be PHARMA or GENERAL'),
    body('variants').isArray({ min: 1 }).withMessage('At least one product variant is required.')
  ],
  createProduct
);

// Update product
router.put(
  '/:id',
  authorize(['super_admin', 'admin', 'manager']),
  [
    body('master.name').notEmpty().withMessage('Product name is required'),
    body('master.product_type').isIn(['PHARMA', 'GENERAL']).withMessage('Product Type must be PHARMA or GENERAL')
  ],
  updateProduct
);

// Delete (soft)
router.delete('/:id', authorize(['super_admin', 'admin', 'manager']), deleteProduct);

module.exports = router;
