// In backend/src/routes/settings.js

const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');

// Import the controller functions
const {
    getAllSettings,
    updateSettings
} = require('../controllers/settingsController');

// @route   GET /api/settings
// @desc    Get all editable system settings
// @access  Private (Admin roles)
router.get('/', authorize(['super_admin', 'admin']), getAllSettings);

// @route   PUT /api/settings
// @desc    Update system settings
// @access  Private (Super Admin only)
router.put('/', authorize(['super_admin']), updateSettings);


module.exports = router;
