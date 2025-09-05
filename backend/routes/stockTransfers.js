// In backend/src/routes/stockTransfers.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    createStockTransfer,
    getAllStockTransfers,
    getStockTransferById,
    updateTransferStatus // 1. Import the new function
} = require('../controllers/stockTransferController');

// @route   GET /api/stock-transfers
// @desc    Get a paginated list of all stock transfers
// @access  Private
router.get('/', getAllStockTransfers);

// @route   POST /api/stock-transfers
// @desc    Create a new stock transfer request
// @access  Private (Manager/Admin roles)
router.post('/',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('from_branch_id').isInt().withMessage('A valid "from" branch is required'),
        body('to_branch_id').isInt().withMessage('A valid "to" branch is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required for the transfer')
    ],
    createStockTransfer
);

// @route   GET /api/stock-transfers/:id
// @desc    Get a single stock transfer by its ID
// @access  Private
router.get('/:id', getStockTransferById);

// @route   PUT /api/stock-transfers/:id/status
// @desc    Update the status of a stock transfer (e.g., dispatch, receive)
// @access  Private
router.put('/:id/status',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('status').isIn(['in_transit', 'received', 'cancelled']).withMessage('Invalid status provided')
    ],
    updateTransferStatus // 2. Add the new route
);


module.exports = router;
