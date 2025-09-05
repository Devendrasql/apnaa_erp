// In backend/src/controllers/branchController.js

const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');

/**
 * @desc    Create a new branch
 * @route   POST /api/branches
 * @access  Private (Admin)
 */
const createBranch = async (req, res, next) => {
    try {
        const { name, code, address, city, state, pincode, phone, email, license_number, gst_number, manager_id } = req.body;

        if (!name || !code || !address || !city || !state || !pincode || !license_number) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields for the branch.' });
        }

        const query = `
            INSERT INTO branches 
            (name, code, address, city, state, pincode, phone, email, license_number, gst_number, manager_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // FIX: Ensure optional values are sent as 'null' instead of 'undefined'
        const params = [
            name, code, address, city, state, pincode, 
            phone || null, 
            email || null, 
            license_number, 
            gst_number || null, 
            manager_id || null
        ];

        const result = await executeQuery(query, params);
        
        logger.info(`New branch created with ID: ${result.insertId}`);
        res.status(201).json({ success: true, message: 'Branch created successfully.', data: { id: result.insertId } });

    } catch (error) {
        logger.error('Error creating branch:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Branch with this code or license number already exists.' });
        }
        next(error);
    }
};

/**
 * @desc    Get all branches
 * @route   GET /api/branches
 * @access  Private
 */
const getAllBranches = async (req, res, next) => {
    try {
        const query = 'SELECT * FROM branches WHERE is_deleted = FALSE ORDER BY name ASC';
        const branches = await executeQuery(query);

        res.status(200).json({ success: true, count: branches.length, data: branches });

    } catch (error) {
        logger.error('Error fetching branches:', error);
        next(error);
    }
};

/**
 * @desc    Get a single branch by ID
 * @route   GET /api/branches/:id
 * @access  Private
 */
const getBranchById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM branches WHERE id = ? AND is_deleted = FALSE';
        const [branch] = await executeQuery(query, [id]);

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }

        res.status(200).json({ success: true, data: branch });

    } catch (error) {
        logger.error(`Error fetching branch with ID ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Update a branch
 * @route   PUT /api/branches/:id
 * @access  Private (Admin)
 */
const updateBranch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, code, address, city, state, pincode, phone, email, license_number, gst_number, manager_id, is_active } = req.body;

        const query = `
            UPDATE branches SET 
            name = ?, code = ?, address = ?, city = ?, state = ?, pincode = ?, 
            phone = ?, email = ?, license_number = ?, gst_number = ?, 
            manager_id = ?, is_active = ? 
            WHERE id = ? AND is_deleted = FALSE
        `;
        
        // FIX: Ensure optional values are sent as 'null' instead of 'undefined'
        const params = [
            name, code, address, city, state, pincode, 
            phone || null, 
            email || null, 
            license_number, 
            gst_number || null, 
            manager_id || null, 
            is_active, 
            id
        ];

        const result = await executeQuery(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Branch not found or no changes made.' });
        }

        logger.info(`Branch with ID ${id} updated.`);
        res.status(200).json({ success: true, message: 'Branch updated successfully.' });

    } catch (error) {
        logger.error(`Error updating branch with ID ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Soft delete a branch
 * @route   DELETE /api/branches/:id
 * @access  Private (Admin)
 */
const deleteBranch = async (req, res, next) => {
    try {
        const { id } = req.params;

        const query = 'UPDATE branches SET is_deleted = TRUE, is_active = FALSE WHERE id = ?';
        const result = await executeQuery(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Branch not found.' });
        }
        
        logger.info(`Branch with ID ${id} has been soft-deleted.`);
        res.status(200).json({ success: true, message: 'Branch deleted successfully.' });

    } catch (error) {
        logger.error(`Error deleting branch with ID ${req.params.id}:`, error);
        next(error);
    }
};


module.exports = {
    createBranch,
    getAllBranches,
    getBranchById,
    updateBranch,
    deleteBranch
};
