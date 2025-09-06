'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./users.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// List
router.get('/',
  abacEnforce({ anyPermissions: ['users:read', 'users:manage'] }),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isString()
  ],
  Controller.list
);

// Create
router.post('/'
  , abacEnforce({ anyPermissions: ['users:create', 'users:manage'] })
  , [
      body('first_name').notEmpty().withMessage('First name is required'),
      body('last_name').notEmpty().withMessage('Last name is required'),
      body('username').notEmpty().withMessage('Username is required'),
      body('email').isEmail().withMessage('A valid email is required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
      body('role_id').isInt().withMessage('A valid user role is required')
    ]
  , Controller.create
);

// Read one
router.get('/:id'
  , abacEnforce({ anyPermissions: ['users:read', 'users:manage'] })
  , [ param('id').isInt({ min: 1 }) ]
  , Controller.getOne
);

// Update
router.put('/:id'
  , abacEnforce({ anyPermissions: ['users:update', 'users:manage'] })
  , [
      param('id').isInt({ min: 1 }),
      body('first_name').notEmpty().withMessage('First name is required'),
      body('last_name').notEmpty().withMessage('Last name is required'),
      body('username').notEmpty().withMessage('Username is required'),
      body('email').isEmail().withMessage('A valid email is required'),
      body('role_id').isInt().withMessage('A valid user role is required')
    ]
  , Controller.update
);

// Delete
router.delete('/:id'
  , abacEnforce({ anyPermissions: ['users:delete', 'users:manage'] })
  , [ param('id').isInt({ min: 1 }) ]
  , Controller.remove
);

module.exports = router;

