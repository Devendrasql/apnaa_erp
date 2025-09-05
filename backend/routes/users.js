// In backend/src/routes/users.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
} = require('../controllers/userController');

// @route   GET /api/users
// @desc    Get a paginated list of all users
// @access  Private
router.get('/', getAllUsers);

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin roles)
router.post('/',
    authorize(['user:create']), // Use permission-based authorization
    [
        body('first_name').notEmpty().withMessage('First name is required'),
        body('last_name').notEmpty().withMessage('Last name is required'),
        body('username').notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('A valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        // FIX: Validate 'role_id' instead of 'role'
        body('role_id').isInt().withMessage('A valid user role is required') 
    ],
    createUser
);

// @route   GET /api/users/:id
// @desc    Get a single user by their ID
// @access  Private
router.get('/:id', authorize(['user:read']), getUserById);

// @route   PUT /api/users/:id
// @desc    Update a user's details
// @access  Private (Admin roles)
router.put('/:id',
    authorize(['user:update']),
    [
        body('first_name').notEmpty().withMessage('First name is required'),
        body('last_name').notEmpty().withMessage('Last name is required'),
        body('username').notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('A valid email is required'),
        // FIX: Validate 'role_id' instead of 'role'
        body('role_id').isInt().withMessage('A valid user role is required')
    ],
    updateUser
);

// @route   DELETE /api/users/:id
// @desc    Soft delete a user
// @access  Private (Admin roles)
router.delete('/:id', authorize(['user:delete']), deleteUser);


module.exports = router;
