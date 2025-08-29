// In backend/src/routes/branches.js

const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth'); // Assuming you have role-based authorization middleware

// Import the controller functions
const {
    createBranch,
    getAllBranches,
    getBranchById,
    updateBranch,
    deleteBranch
} = require('../controllers/branchController');

// Define the routes

// @route   GET /api/branches
// @desc    Get a list of all non-deleted branches
// @access  Private
router.get('/', getAllBranches);

// @route   POST /api/branches
// @desc    Create a new branch
// @access  Private (Admin roles)
router.post('/', authorize(['super_admin', 'admin']), createBranch);

// @route   GET /api/branches/:id
// @desc    Get a single branch by its ID
// @access  Private
router.get('/:id', getBranchById);

// @route   PUT /api/branches/:id
// @desc    Update a branch's details
// @access  Private (Admin roles)
router.put('/:id', authorize(['super_admin', 'admin']), updateBranch);

// @route   DELETE /api/branches/:id
// @desc    Soft delete a branch
// @access  Private (Admin roles)
router.delete('/:id', authorize(['super_admin', 'admin']), deleteBranch);


module.exports = router;


// const express = require('express');
// const router = express.Router();

// // Example route
// router.get('/', (req, res) => {
//   res.json({ message: 'Branches route working!' });
// });

// module.exports = router;

