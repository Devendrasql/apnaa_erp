// In backend/src/controllers/settingsController.js

const { executeQuery, executeTransaction } = require('../utils/database');
const logger = require('../utils/logger');

/**
 * @desc    Get all system settings
 * @route   GET /api/settings
 * @access  Private (Admin)
 */
const getAllSettings = async (req, res, next) => {
    try {
        const query = `SELECT setting_key, setting_value, setting_type, description FROM settings WHERE is_editable = TRUE AND is_deleted = FALSE`;
        const settings = await executeQuery(query);

        // Convert the array of objects into a single key-value object for easier use on the frontend
        const settingsObject = settings.reduce((acc, setting) => {
            acc[setting.setting_key] = {
                value: setting.setting_value,
                type: setting.setting_type,
                description: setting.description
            };
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: settingsObject
        });
    } catch (error) {
        logger.error('Error fetching settings:', error);
        next(error);
    }
};

/**
 * @desc    Update system settings
 * @route   PUT /api/settings
 * @access  Private (Super Admin)
 */
const updateSettings = async (req, res, next) => {
    try {
        const settingsToUpdate = req.body; // Expects an object like { company_name: 'New Name', tax_rate: 18 }
        
        const queries = [];
        for (const key in settingsToUpdate) {
            queries.push({
                query: `UPDATE settings SET setting_value = ? WHERE setting_key = ? AND is_editable = TRUE`,
                params: [settingsToUpdate[key], key]
            });
        }

        if (queries.length === 0) {
            return res.status(400).json({ success: false, message: 'No settings to update provided.' });
        }

        await executeTransaction(queries);

        logger.info('System settings updated successfully.');
        res.status(200).json({ success: true, message: 'Settings updated successfully.' });

    } catch (error) {
        logger.error('Error updating settings:', error);
        next(error);
    }
};

module.exports = {
    getAllSettings,
    updateSettings,
};
