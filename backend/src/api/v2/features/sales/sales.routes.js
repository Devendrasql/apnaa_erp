'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
  createSale,
  getAllSales,
  getSaleById,
} = require('../controllers/salesController');

/**
 * @route   POST /api/sales
 * @desc    Create a new sale
 * @access  Private (Pharmacist/Manager/Admin/Staff roles)
 */
router.post(
  '/',
  authorize(['super_admin', 'admin', 'manager', 'pharmacist', 'staff']),
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('branch_id').isInt().withMessage('Valid branch ID required'),
  ],
  createSale
);

/**
 * @route   GET /api/sales
 * @desc    Get sales history (paginated + filterable)
 * @access  Private
 */
router.get('/', getAllSales);

/**
 * @route   GET /api/sales/:id
 * @desc    Get details of a single sale
 * @access  Private
 */
router.get('/:id', getSaleById);

module.exports = router;











// const express = require('express');
// const { body, validationResult } = require('express-validator');
// const { executeQuery, executeTransaction } = require('../utils/database');
// const router = express.Router();

// // Create new sale
// router.post('/', [
//   body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
//   body('branch_id').isInt().withMessage('Valid branch ID required')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }

//     const { branch_id, customer_id, doctor_id, items, payment_method, discount_amount } = req.body;
//     const cashier_id = req.user.id;

//     // Generate invoice number
//     const invoiceResult = await executeQuery(
//       'SELECT COUNT(*) as count FROM sales WHERE branch_id = ? AND DATE(sale_date) = CURDATE()',
//       [branch_id]
//     );
//     const dailyCount = invoiceResult[0].count + 1;
//     const invoice_number = `INV-${branch_id}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(dailyCount).padStart(4, '0')}`;

//     // Calculate totals
//     let total_amount = 0;
//     let tax_amount = 0;

//     for (const item of items) {
//       const line_total = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
//       total_amount += line_total;
//       tax_amount += line_total * (item.tax_percentage / 100);
//     }

//     const final_amount = total_amount + tax_amount - (discount_amount || 0);

//     // Create transaction queries
//     const queries = [
//       // Insert sale
//       {
//         query: `INSERT INTO sales (invoice_number, branch_id, customer_id, doctor_id, 
//                 total_items, total_amount, discount_amount, tax_amount, final_amount, 
//                 payment_method, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         params: [invoice_number, branch_id, customer_id, doctor_id, items.length,
//                 total_amount, discount_amount || 0, tax_amount, final_amount, payment_method, cashier_id]
//       }
//     ];

//     // Add sale items
//     for (const item of items) {
//       const line_total = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
//       queries.push({
//         query: `INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price, 
//                 mrp, discount_percentage, tax_percentage, line_total, batch_number, expiry_date) 
//                 VALUES (LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         params: [item.product_id, item.stock_id, item.quantity, item.unit_price,
//                 item.mrp, item.discount_percentage || 0, item.tax_percentage || 12,
//                 line_total, item.batch_number, item.expiry_date]
//       });
//     }

//     await executeTransaction(queries);

//     res.status(201).json({
//       success: true,
//       message: 'Sale completed successfully',
//       data: { invoice_number, final_amount }
//     });

//   } catch (error) {
//     next(error);
//   }
// });

// // Get sales history
// router.get('/', async (req, res, next) => {
//   try {
//     const { page = 1, limit = 50, branch_id, from_date, to_date } = req.query;
//     const offset = (page - 1) * limit;

//     let whereClause = 'WHERE s.is_cancelled = false';
//     let params = [];

//     if (branch_id) {
//       whereClause += ' AND s.branch_id = ?';
//       params.push(branch_id);
//     }

//     if (from_date) {
//       whereClause += ' AND DATE(s.sale_date) >= ?';
//       params.push(from_date);
//     }

//     if (to_date) {
//       whereClause += ' AND DATE(s.sale_date) <= ?';
//       params.push(to_date);
//     }

//     const sales = await executeQuery(
//       `SELECT s.*, c.first_name, c.last_name, c.phone, 
//               b.name as branch_name, u.first_name as cashier_name
//        FROM sales s
//        LEFT JOIN customers c ON s.customer_id = c.id
//        LEFT JOIN branches b ON s.branch_id = b.id
//        LEFT JOIN users u ON s.cashier_id = u.id
//        ${whereClause}
//        ORDER BY s.sale_date DESC
//        LIMIT ? OFFSET ?`,
//       [...params, parseInt(limit), offset]
//     );

//     res.json({
//       success: true,
//       data: sales
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// module.exports = router;

