// In backend/src/routes/purchaseOrders.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    receivePurchaseOrder // 1. Import the new function
} = require('../controllers/purchaseOrderController');

// @route   GET /api/purchase-orders
// @desc    Get a paginated list of all purchase orders
// @access  Private
router.get('/', getAllPurchaseOrders);

// @route   POST /api/purchase-orders
// @desc    Create a new purchase order
// @access  Private (Manager/Admin roles)
router.post('/',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('branch_id').isInt().withMessage('A valid branch is required'),
        body('supplier_id').isInt().withMessage('A valid supplier is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required for the purchase order')
    ],
    createPurchaseOrder
);

// @route   GET /api/purchase-orders/:id
// @desc    Get a single purchase order by its ID
// @access  Private
router.get('/:id', getPurchaseOrderById);

// @route   POST /api/purchase-orders/:id/receive
// @desc    Receive stock against a purchase order
// @access  Private (Manager/Admin roles)
router.post('/:id/receive',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('items').isArray({ min: 1 }).withMessage('At least one received item is required')
    ],
    receivePurchaseOrder // 2. Add the new route
);

module.exports = router;
