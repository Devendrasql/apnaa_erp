// backend/src/routes/roles.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authorize } = require('../middleware/auth');

// super_admin gate as you had before
router.get('/permissions', authorize(['super_admin']), roleController.getAllPermissions);
router.post('/permissions', authorize(['super_admin']), roleController.createPermission);

router.get('/', authorize(['super_admin']), roleController.getAllRoles);
router.get('/:id', authorize(['super_admin']), roleController.getRoleById);
router.put('/:id', authorize(['super_admin']), roleController.updateRolePermissions);

module.exports = router;








// // In backend/src/routes/roles.js

// const express = require('express');
// const router = express.Router();
// const { authorize } = require('../middleware/auth');

// // Import the controller functions
// const {
//     getAllRoles,
//     getAllPermissions,
//     getRoleById,
//     updateRole,
//     // createPermission
// } = require('../controllers/roleController');

// // @route   GET /api/roles
// // @desc    Get all roles
// // @access  Private (Super Admin)
// router.get('/', authorize(['super_admin']), getAllRoles);

// // @route   GET /api/roles/permissions
// // @desc    Get all available permissions
// // @access  Private (Super Admin)
// router.get('/permissions', authorize(['super_admin']), getAllPermissions);

// // @route   GET /api/roles/:id
// // @desc    Get a single role by ID with its permissions
// // @access  Private (Super Admin)
// router.get('/:id', authorize(['super_admin']), getRoleById);

// // @route   PUT /api/roles/:id
// // @desc    Update a role's details and permissions
// // @access  Private (Super Admin)
// router.put('/:id', authorize(['super_admin']), updateRole);

// // NEW: create permission
// // router.post('/permissions', authorize(['super_admin']), createPermission);

// module.exports = router;
