// In backend/src/routes/payments.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    recordPayment,
    getOutstandingSales
} = require('../controllers/paymentController');

// @route   GET /api/payments/outstanding
// @desc    Get all sales with an outstanding balance
// @access  Private
router.get('/outstanding', getOutstandingSales);

// @route   POST /api/payments
// @desc    Record a new payment for a sale
// @access  Private
router.post('/',
    authorize(['super_admin', 'admin', 'manager', 'pharmacist', 'staff']),
    [
        body('sale_id').isInt().withMessage('A valid Sale ID is required'),
        body('amount_paid').isFloat({ gt: 0 }).withMessage('Amount paid must be a positive number'),
        body('payment_method').notEmpty().withMessage('Payment method is required'),
        body('payment_date').isISO8601().withMessage('A valid payment date is required')
    ],
    recordPayment
);

module.exports = router;
