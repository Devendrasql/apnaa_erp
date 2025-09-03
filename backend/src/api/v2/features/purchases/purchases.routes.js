// In backend/src/routes/purchases.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    createPurchase,
    getAllPurchases,
    getPurchaseById, // 1. Import the new function
    postPurchaseToStock,
} = require('../controllers/purchaseController');

// @route   GET /api/purchases
// @desc    Get a paginated list of all purchase entries
// @access  Private
router.get('/', getAllPurchases);

// @route   POST /api/purchases
// @desc    Create a new purchase entry
// @access  Private (Manager/Admin roles)
router.post('/',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('invoice_number').notEmpty().withMessage('Invoice number is required'),
        body('invoice_date').isISO8601().withMessage('A valid invoice date is required'),
        body('branch_id').isInt().withMessage('A valid branch is required'),
        body('supplier_id').isInt().withMessage('A valid supplier is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required for the purchase')
    ],
    createPurchase
);

// @route   GET /api/purchases/:id
// @desc    Get a single purchase by its ID
// @access  Private
router.get('/:id', getPurchaseById); // 2. Add the new route

// @route   POST /api/purchases/:id/post
// @desc    Post a purchase to stock, updating inventory levels
// @access  Private (Manager/Admin roles)
router.post(
    '/:id/post',
    authorize(['super_admin', 'admin', 'manager']),
    postPurchaseToStock
);


module.exports = router;
