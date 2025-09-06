// In backend/src/controllers/supplierController.js

const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new supplier
 * @route   POST /api/suppliers
 * @access  Private (Admin/Manager)
 */
const createSupplier = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        }

        const { name, code, contact_person, email, phone, address, city, state, pincode, gst_number } = req.body;

        const query = `
            INSERT INTO suppliers 
            (name, code, contact_person, email, phone, address, city, state, pincode, gst_number) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            name, code, contact_person || null, email || null, phone || null, address || null, 
            city || null, state || null, pincode || null, gst_number || null
        ];

        const result = await executeQuery(query, params);
        
        logger.info(`New supplier created with ID: ${result.insertId}`);
        res.status(201).json({ success: true, message: 'Supplier created successfully.', data: { id: result.insertId } });

    } catch (error) {
        logger.error('Error creating supplier:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Supplier with this code already exists.' });
        }
        next(error);
    }
};

/**
 * @desc    Get all suppliers with pagination and search
 * @route   GET /api/suppliers
 * @access  Private
 */
const getAllSuppliers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        
        // Ensure limit and offset are safe integers
        const safeLimit = parseInt(limit, 10);
        const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

        let baseQuery = `SELECT * FROM suppliers`;
        let countQuery = `SELECT COUNT(id) as total FROM suppliers`;
        
        const whereClauses = ['is_deleted = FALSE'];
        const whereParams = [];

        if (search) {
            whereClauses.push('(name LIKE ? OR code LIKE ? OR phone LIKE ?)');
            const searchParam = `%${search}%`;
            whereParams.push(searchParam, searchParam, searchParam);
        }

        const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
        // Construct the final queries with embedded LIMIT/OFFSET
        const finalQuery = `${baseQuery}${whereString} ORDER BY name ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
        const finalCountQuery = countQuery + whereString;

        const suppliers = await executeQuery(finalQuery, whereParams);
        const [totalResult] = await executeQuery(finalCountQuery, whereParams);
        const totalSuppliers = totalResult.total;

        res.status(200).json({
            success: true,
            count: suppliers.length,
            pagination: {
                total: totalSuppliers,
                limit: safeLimit,
                page: parseInt(page, 10),
                totalPages: Math.ceil(totalSuppliers / safeLimit)
            },
            data: suppliers
        });

    } catch (error) {
        logger.error('Error fetching suppliers:', error);
        next(error);
    }
};

/**
 * @desc    Get a single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
const getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM suppliers WHERE id = ? AND is_deleted = FALSE';
        const [supplier] = await executeQuery(query, [id]);

        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found.' });
        }

        res.status(200).json({ success: true, data: supplier });

    } catch (error) {
        logger.error(`Error fetching supplier with ID ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Update a supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private (Admin/Manager)
 */
const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, code, contact_person, email, phone, address, city, state, pincode, gst_number, is_active } = req.body;

        const query = `
            UPDATE suppliers SET 
            name = ?, code = ?, contact_person = ?, email = ?, phone = ?, address = ?, 
            city = ?, state = ?, pincode = ?, gst_number = ?, is_active = ?
            WHERE id = ? AND is_deleted = FALSE
        `;
        const params = [
            name, code, contact_person, email, phone, address, city, state, 
            pincode, gst_number, is_active, id
        ];

        const result = await executeQuery(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Supplier not found or no changes made.' });
        }

        logger.info(`Supplier with ID ${id} updated.`);
        res.status(200).json({ success: true, message: 'Supplier updated successfully.' });

    } catch (error) {
        logger.error(`Error updating supplier with ID ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Soft delete a supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private (Admin/Manager)
 */
const deleteSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = 'UPDATE suppliers SET is_deleted = TRUE, is_active = FALSE WHERE id = ?';
        const result = await executeQuery(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Supplier not found.' });
        }
        
        logger.info(`Supplier with ID ${id} has been soft-deleted.`);
        res.status(200).json({ success: true, message: 'Supplier deleted successfully.' });

    } catch (error) {
        logger.error(`Error deleting supplier with ID ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Get supplier details by GST number (mocked)
 * @route   GET /api/suppliers/gst/:gst_number
 * @access  Private
 */
const getSupplierByGST = async (req, res, next) => {
    try {
        const { gst_number } = req.params;
        // https://services.gst.gov.in/services/auth/manageapiaccess
        // --- MOCK API LOGIC ---
        if (gst_number === '27ABCDE1234F1Z5') {
            const mockSupplierData = {
                name: "Generic Pharma Distributors",
                address: "Plot 123, Industrial Area, Phase 2",
                city: "Mumbai",
                state: "Maharashtra",
                pincode: "400072",
            };
            
            return res.status(200).json({
                success: true,
                data: mockSupplierData
            });
        }

        res.status(404).json({ success: false, message: 'Supplier not found for this GST number.' });

    } catch (error) {
        logger.error(`Error fetching supplier by GST:`, error);
        next(error);
    }
};


module.exports = {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getSupplierByGST
};
