const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');
const {
  listStdDiscounts,
  createStdDiscount,
  updateStdDiscount,
  deleteStdDiscount
} = require('../controllers/stdDiscountController');

// GET /api/std-discounts?branch_id=#
router.get('/', listStdDiscounts);

// POST /api/std-discounts
router.post(
  '/',
  authorize(['super_admin', 'admin', 'manager']),
  [
    body('branch_id').isInt({ min: 1 }).withMessage('branch_id is required'),
    body('name').notEmpty().withMessage('name is required'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('percentage must be 0-100')
  ],
  createStdDiscount
);

// PUT /api/std-discounts/:id
router.put(
  '/:id',
  authorize(['super_admin', 'admin', 'manager']),
  [
    body('branch_id').optional().isInt({ min: 1 }),
    body('name').optional().isString(),
    body('percentage').optional().isFloat({ min: 0, max: 100 }),
    body('is_active').optional().isBoolean()
  ],
  updateStdDiscount
);

// DELETE /api/std-discounts/:id (soft – is_active=0)
router.delete('/:id', authorize(['super_admin', 'admin', 'manager']), deleteStdDiscount);

module.exports = router;
