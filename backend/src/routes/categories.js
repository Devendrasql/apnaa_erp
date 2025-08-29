// In backend/src/routes/categories.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

// @route   GET /api/categories
// @desc    Get a list of all non-deleted categories
// @access  Private
router.get('/', getAllCategories);

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private (Admin/Manager roles)
router.post('/',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('name').notEmpty().withMessage('Category name is required')
    ],
    createCategory
);

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private (Admin/Manager roles)
router.put('/:id',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('name').notEmpty().withMessage('Category name is required')
    ],
    updateCategory
);

// @route   DELETE /api/categories/:id
// @desc    Soft delete a category
// @access  Private (Admin/Manager roles)
router.delete('/:id', authorize(['super_admin', 'admin', 'manager']), deleteCategory);


module.exports = router;





// // In backend/src/routes/categories.js

// const express = require('express');
// const router = express.Router();

// // Import the controller function
// const { getAllCategories } = require('../controllers/categoryController');

// // @route   GET /api/categories
// // @desc    Get a list of all active, non-deleted categories
// // @access  Private
// router.get('/', getAllCategories);

// // We can add more routes for creating/updating categories here later

// module.exports = router;
