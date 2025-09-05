// In backend/src/routes/suppliers.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getSupplierByGST
} = require('../controllers/supplierController');

// @route   GET /api/suppliers
// @desc    Get a paginated list of all non-deleted suppliers
// @access  Private
router.get('/', getAllSuppliers);

// @route   GET /api/suppliers/gst/:gst_number
// @desc    Get supplier details by GST number
// @access  Private
router.get('/gst/:gst_number', getSupplierByGST);

// @route   POST /api/suppliers
// @desc    Create a new supplier with validation
// @access  Private (Admin/Manager roles)
router.post('/',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('name').notEmpty().withMessage('Supplier name is required'),
        body('code').notEmpty().withMessage('Supplier code is required')
    ],
    createSupplier
);

// @route   GET /api/suppliers/:id
// @desc    Get a single supplier by their ID
// @access  Private
router.get('/:id', getSupplierById);

// @route   PUT /api/suppliers/:id
// @desc    Update a supplier's details
// @access  Private (Admin/Manager roles)
router.put('/:id',
    authorize(['super_admin', 'admin', 'manager']),
    [
        body('name').notEmpty().withMessage('Supplier name is required'),
        body('code').notEmpty().withMessage('Supplier code is required')
    ],
    updateSupplier
);

// @route   DELETE /api/suppliers/:id
// @desc    Soft delete a supplier
// @access  Private (Admin/Manager roles)
router.delete('/:id', authorize(['super_admin', 'admin', 'manager']), deleteSupplier);


module.exports = router;





// // In backend/src/routes/suppliers.js

// const express = require('express');
// const router = express.Router();
// const { body } = require('express-validator');
// const { authorize } = require('../middleware/auth');

// // Import the controller functions
// const {
//     createSupplier,
//     getAllSuppliers,
//     getSupplierById,
//     updateSupplier,
//     deleteSupplier
// } = require('../controllers/supplierController');

// // @route   GET /api/suppliers
// // @desc    Get a paginated list of all non-deleted suppliers
// // @access  Private
// router.get('/', getAllSuppliers);


// // @route   POST /api/suppliers
// // @desc    Create a new supplier with validation
// // @access  Private (Admin/Manager roles)
// router.post('/',
//     authorize(['super_admin', 'admin', 'manager']),
//     [
//         body('name').notEmpty().withMessage('Supplier name is required'),
//         body('code').notEmpty().withMessage('Supplier code is required')
//     ],
//     createSupplier
// );

// // @route   GET /api/suppliers/:id
// // @desc    Get a single supplier by their ID
// // @access  Private
// router.get('/:id', getSupplierById);

// // @route   PUT /api/suppliers/:id
// // @desc    Update a supplier's details
// // @access  Private (Admin/Manager roles)
// router.put('/:id',
//     authorize(['super_admin', 'admin', 'manager']),
//     [
//         body('name').notEmpty().withMessage('Supplier name is required'),
//         body('code').notEmpty().withMessage('Supplier code is required')
//     ],
//     updateSupplier
// );

// // @route   DELETE /api/suppliers/:id
// // @desc    Soft delete a supplier
// // @access  Private (Admin/Manager roles)
// router.delete('/:id', authorize(['super_admin', 'admin', 'manager']), deleteSupplier);


// module.exports = router;










// // // src/routes/suppliers.js
// // const express = require('express');
// // const router = express.Router();

// // // Sample route
// // router.get('/', (req, res) => {
// //   res.json({ message: 'suppliers route is working' });
// // });

// // module.exports = router;
