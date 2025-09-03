const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');
const {
  listRacks,
  createRack,
  updateRack,
  deleteRack
} = require('../controllers/rackController');

// GET /api/racks?branch_id=#
router.get('/', listRacks);

// POST /api/racks
router.post(
  '/',
  authorize(['super_admin', 'admin', 'manager']),
  [
    body('branch_id').isInt({ min: 1 }).withMessage('branch_id is required'),
    body('rack_code').notEmpty().withMessage('rack_code is required')
  ],
  createRack
);

// PUT /api/racks/:id
router.put(
  '/:id',
  authorize(['super_admin', 'admin', 'manager']),
  [
    body('branch_id').optional().isInt({ min: 1 }),
    body('rack_code').optional().isString(),
    body('rack_name').optional().isString(),
    body('is_active').optional().isBoolean()
  ],
  updateRack
);

// DELETE /api/racks/:id (soft – set is_active=0)
router.delete(
  '/:id',
  authorize(['super_admin', 'admin', 'manager']),
  deleteRack
);

module.exports = router;
