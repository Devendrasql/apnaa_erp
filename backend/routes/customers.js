'use strict';

/**
 * Customers routes (CRUD)
 * NOTE: Nothing special for face here; face has its own router (/api/face)
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');

router.get('/', getAllCustomers);

router.post(
  '/',
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
  ],
  createCustomer
);

router.get('/:id', getCustomerById);

router.put(
  '/:id',
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
  ],
  updateCustomer
);

router.delete('/:id', authorize(['super_admin', 'admin', 'manager']), deleteCustomer);

module.exports = router;
