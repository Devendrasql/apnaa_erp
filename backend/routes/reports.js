// In backend/src/routes/reports.js

const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    getDailySalesReport,
    getInventoryReport,
    getProductPerformanceReport // 1. Import the new function
} = require('../controllers/reportController');

// @route   GET /api/reports/daily-sales
// @desc    Generate a daily sales report
// @access  Private (Manager/Admin roles)
router.get(
    '/daily-sales',
    authorize(['super_admin', 'admin', 'manager']),
    getDailySalesReport
);

// @route   GET /api/reports/inventory
// @desc    Generate an inventory report
// @access  Private (Manager/Admin roles)
router.get(
    '/inventory',
    authorize(['super_admin', 'admin', 'manager']),
    getInventoryReport
);

// @route   GET /api/reports/product-performance
// @desc    Generate a product performance report
// @access  Private (Manager/Admin roles)
router.get(
    '/product-performance',
    authorize(['super_admin', 'admin', 'manager']),
    getProductPerformanceReport // 2. Add the new route
);


module.exports = router;
