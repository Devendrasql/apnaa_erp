// In backend/src/routes/inventory.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    getStockLevels,
    addStock,
    adjustStock // 1. Import the new function
} = require('../controllers/inventoryController');

// @route   GET /api/inventory/stock
// @desc    Get current stock levels with advanced filtering and pagination
// @access  Private
router.get('/stock', getStockLevels);

// @route   POST /api/inventory/add-stock
// @desc    Add stock to a branch (e.g., from a purchase)
// @access  Private (Admin/Manager)
router.post('/add-stock',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('variant_id').isInt().withMessage('Valid variant ID required'),
        body('branch_id').isInt().withMessage('Valid branch ID required'),
        body('quantity').isInt({ min: 1 }).withMessage('Valid quantity required'),
        body('batch_number').notEmpty().withMessage('Batch number required'),
        body('expiry_date').isISO8601().withMessage('Valid expiry date required'),
        body('purchase_price').isFloat({ min: 0 }).withMessage('Valid purchase price required'),
        body('mrp').isFloat({ min: 0 }).withMessage('Valid MRP required'),
        body('selling_price').isFloat({ min: 0 }).withMessage('Valid selling price required')
    ],
    addStock
);

// @route   POST /api/inventory/adjust-stock
// @desc    Manually adjust stock for a specific batch
// @access  Private (Manager/Admin)
router.post('/adjust-stock',
    authorize(['super_admin', 'admin', 'manager']),
    [ // 2. Add validation for the new route
        body('stock_id').isInt().withMessage('A valid stock item ID is required'),
        body('quantity_change').isNumeric().withMessage('Quantity change must be a number'),
        body('reason').notEmpty().withMessage('A reason for the adjustment is required')
    ],
    adjustStock // 3. Add the new route
);


module.exports = router;
