// In backend/src/controllers/categoryController.js

const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private (Admin/Manager)
 */
const createCategory = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        }

        const { name, description, parent_id } = req.body;

        const query = `
            INSERT INTO categories (name, description, parent_id) 
            VALUES (?, ?, ?)
        `;
        const params = [name, description || null, parent_id || null];

        const result = await executeQuery(query, params);
        
        logger.info(`New category created with ID: ${result.insertId}`);
        res.status(201).json({ success: true, message: 'Category created successfully.', data: { id: result.insertId } });

    } catch (error) {
        logger.error('Error creating category:', error);
        next(error);
    }
};


/**
 * @desc    Get all active categories
 * @route   GET /api/categories
 * @access  Private
 */
const getAllCategories = async (req, res, next) => {
    try {
        const query = `
            SELECT c1.*, c2.name as parent_name
            FROM categories c1
            LEFT JOIN categories c2 ON c1.parent_id = c2.id
            WHERE c1.is_deleted = FALSE 
            ORDER BY c1.name ASC
        `;
        const categories = await executeQuery(query);

        res.status(200).json({ 
            success: true, 
            count: categories.length, 
            data: categories 
        });

    } catch (error) {
        logger.error('Error fetching categories:', error);
        next(error);
    }
};

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin/Manager)
 */
const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, parent_id, is_active } = req.body;

        const query = `
            UPDATE categories SET 
            name = ?, description = ?, parent_id = ?, is_active = ?
            WHERE id = ? AND is_deleted = FALSE
        `;
        const params = [name, description || null, parent_id || null, is_active, id];

        const result = await executeQuery(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found or no changes made.' });
        }

        logger.info(`Category with ID ${id} updated.`);
        res.status(200).json({ success: true, message: 'Category updated successfully.' });

    } catch (error) {
        logger.error(`Error updating category with ID ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Soft delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin/Manager)
 */
const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = 'UPDATE categories SET is_deleted = TRUE, is_active = FALSE WHERE id = ?';
        const result = await executeQuery(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }
        
        logger.info(`Category with ID ${id} has been soft-deleted.`);
        res.status(200).json({ success: true, message: 'Category deleted successfully.' });

    } catch (error) {
        logger.error(`Error deleting category with ID ${req.params.id}:`, error);
        next(error);
    }
};


module.exports = {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory
};





// // In backend/src/controllers/categoryController.js

// const { executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');

// /**
//  * @desc    Get all active categories
//  * @route   GET /api/categories
//  * @access  Private
//  */
// const getAllCategories = async (req, res, next) => {
//     try {
//         // This query fetches all categories that are not soft-deleted and are active
//         const query = `
//             SELECT id, name 
//             FROM categories 
//             WHERE is_deleted = FALSE AND is_active = TRUE 
//             ORDER BY name ASC
//         `;
//         const categories = await executeQuery(query);

//         res.status(200).json({ 
//             success: true, 
//             count: categories.length, 
//             data: categories 
//         });

//     } catch (error) {
//         logger.error('Error fetching categories:', error);
//         next(error);
//     }
// };

// // We can add more functions like create, update, delete later if needed.

// module.exports = {
//     getAllCategories,
// };
