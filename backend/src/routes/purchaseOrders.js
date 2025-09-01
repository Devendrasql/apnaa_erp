// backend/src/routes/purchaseOrders.js

'use strict';

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { requirePermissionCode } = require('../middleware/rbac');

// Controller functions
const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrder
} = require('../controllers/purchaseOrderController');

/** Normalizer: accept legacy body.poItems and map to body.items */
function normalizePoItems(req, _res, next) {
  if (!req.body) req.body = {};
  if (!req.body.items && Array.isArray(req.body.poItems)) {
    req.body.items = req.body.poItems;
  }
  next();
}

/**
 * IMPORTANT:
 * These routes expect the active branch in either:
 *   - query: ?branchId=#
 *   - header: x-branch-id: #
 * The RBAC guard enforces permission codes at that branch scope.
 */

// @route   GET /api/purchase-orders
// @desc    Get a paginated list of purchase orders (scoped by branch if provided)
// @access  Private (perm: procurement.po.view)
router.get(
  '/',
  authMiddleware,
  requirePermissionCode('procurement.po.view'),
  getAllPurchaseOrders
);

// @route   POST /api/purchase-orders
// @desc    Create a new purchase order (branch_id must match active branch)
// @access  Private (perm: procurement.po.create)
router.post(
  '/',
  authMiddleware,
  requirePermissionCode('procurement.po.create'),
  [
    body('branch_id').isInt().withMessage('A valid branch is required'),
    body('supplier_id').isInt().withMessage('A valid supplier is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required for the purchase order')
  ],
  createPurchaseOrder
);

// @route   GET /api/purchase-orders/:id
// @desc    Get a single purchase order by its ID (scoped read)
// @access  Private (perm: procurement.po.view)
router.get(
  '/:id',
  authMiddleware,
  requirePermissionCode('procurement.po.view'),
  [param('id').isInt().toInt()],
  getPurchaseOrderById
);

// @route   POST /api/purchase-orders/:id/receive
// @desc    Receive stock against a purchase order
// @access  Private (perm: inventory.grn.post)
router.post(
  '/:id/receive',
  authMiddleware,
  requirePermissionCode('inventory.grn.post'),
  [
    param('id').isInt().toInt(),
    body('items').isArray({ min: 1 }).withMessage('At least one received item is required')
    // Note: controller also accepts legacy `poItems`
  ],
  receivePurchaseOrder
);

module.exports = router;







// // In backend/src/routes/purchaseOrders.js

// const express = require('express');
// const router = express.Router();
// const { body } = require('express-validator');
// const { authorize } = require('../middleware/auth');

// // Import the controller functions
// const {
//     createPurchaseOrder,
//     getAllPurchaseOrders,
//     getPurchaseOrderById,
//     receivePurchaseOrder // 1. Import the new function
// } = require('../controllers/purchaseOrderController');

// // @route   GET /api/purchase-orders
// // @desc    Get a paginated list of all purchase orders
// // @access  Private
// router.get('/', getAllPurchaseOrders);

// // @route   POST /api/purchase-orders
// // @desc    Create a new purchase order
// // @access  Private (Manager/Admin roles)
// router.post('/',
//     authorize(['super_admin', 'admin', 'manager']),
//     [
//         body('branch_id').isInt().withMessage('A valid branch is required'),
//         body('supplier_id').isInt().withMessage('A valid supplier is required'),
//         body('items').isArray({ min: 1 }).withMessage('At least one item is required for the purchase order')
//     ],
//     createPurchaseOrder
// );

// // @route   GET /api/purchase-orders/:id
// // @desc    Get a single purchase order by its ID
// // @access  Private
// router.get('/:id', getPurchaseOrderById);

// // @route   POST /api/purchase-orders/:id/receive
// // @desc    Receive stock against a purchase order
// // @access  Private (Manager/Admin roles)
// router.post('/:id/receive',
//     authorize(['super_admin', 'admin', 'manager']),
//     [
//         body('items').isArray({ min: 1 }).withMessage('At least one received item is required')
//     ],
//     receivePurchaseOrder // 2. Add the new route
// );

// module.exports = router;
