'use strict';

const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Safely resolve an org id to use for INSERTs.
 * - Prefer req.user.org_id if your auth middleware provides it
 * - Else use env DEFAULT_ORG_ID
 * - Else fall back to 1
 */
function resolveOrgIdForCreate(req) {
  const fromAuth = req.user && req.user.org_id;
  if (fromAuth != null) return fromAuth;
  const fromEnv = process.env.DEFAULT_ORG_ID;
  if (fromEnv != null) return parseInt(fromEnv, 10) || 1;
  return 1;
}

/**
 * Optionally add tenant isolation to WHERE clauses.
 * If req.user.org_id exists, we add "AND org_id = ?" and push that param.
 * If it doesn't exist, we don't block the request (no 400).
 */
function addOptionalOrgFilter(req, whereClauses, params) {
  const orgId = req.user && req.user.org_id;
  if (orgId != null) {
    whereClauses.push('org_id = ?');
    params.push(orgId);
  }
}

/**
 * @desc    Create a new customer
 * @route   POST /api/customers
 * @access  Private
 */
const createCustomer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const org_id = resolveOrgIdForCreate(req);
    const { first_name, last_name, phone, email, address, city, state, pincode } = req.body;

    const query = `
      INSERT INTO customers
        (org_id, first_name, last_name, phone, email, address, city, state, pincode)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      org_id,
      first_name,
      last_name,
      phone,
      email || null,
      address || null,
      city || null,
      state || null,
      pincode || null,
    ];

    const result = await executeQuery(query, params);

    logger.info(`New customer created with ID: ${result.insertId} (org ${org_id})`);
    res.status(201).json({ success: true, message: 'Customer created successfully.', data: { id: result.insertId } });

  } catch (error) {
    logger.error('Error creating customer:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Customer with this phone number already exists.' });
    }
    next(error);
  }
};

/**
 * @desc    Get all customers with pagination and search
 * @route   GET /api/customers
 * @access  Private
 */
const getAllCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeOffset = (safePage - 1) * safeLimit;

    let baseQuery = `SELECT * FROM customers`;
    let countQuery = `SELECT COUNT(id) as total FROM customers`;

    const whereClauses = ['is_deleted = FALSE'];
    const whereParams = [];

    // Optional org isolation (no hard requirement -> no 400)
    addOptionalOrgFilter(req, whereClauses, whereParams);

    if (search) {
      whereClauses.push('(first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)');
      const s = `%${search}%`;
      whereParams.push(s, s, s);
    }

    const whereString = ` WHERE ${whereClauses.join(' AND ')}`;

    const finalQuery = `${baseQuery}${whereString} ORDER BY first_name, last_name ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const finalCountQuery = `${countQuery}${whereString}`;

    const customers = await executeQuery(finalQuery, whereParams);
    const [totalRow] = await executeQuery(finalCountQuery, whereParams);

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: {
        total: totalRow.total,
        limit: safeLimit,
        page: safePage,
        totalPages: Math.ceil(totalRow.total / safeLimit)
      },
      data: customers
    });

  } catch (error) {
    logger.error('Error fetching customers:', error);
    next(error);
  }
};

/**
 * @desc    Get a single customer by ID
 * @route   GET /api/customers/:id
 * @access  Private
 */
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const whereClauses = ['id = ?', 'is_deleted = FALSE'];
    const params = [id];
    addOptionalOrgFilter(req, whereClauses, params);

    const query = `SELECT * FROM customers WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
    const [customer] = await executeQuery(query, params);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.status(200).json({ success: true, data: customer });

  } catch (error) {
    logger.error(`Error fetching customer with ID ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * @desc    Update a customer
 * @route   PUT /api/customers/:id
 * @access  Private
 */
const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      is_active
    } = req.body;

    const whereClauses = ['id = ?', 'is_deleted = FALSE'];
    const whereParams = [id];
    addOptionalOrgFilter(req, whereClauses, whereParams);

    const query = `
      UPDATE customers
         SET first_name = ?,
             last_name = ?,
             phone = ?,
             email = ?,
             address = ?,
             city = ?,
             state = ?,
             pincode = ?,
             is_active = ?
       WHERE ${whereClauses.join(' AND ')}
    `;
    const params = [
      first_name,
      last_name,
      phone,
      email || null,
      address || null,
      city || null,
      state || null,
      pincode || null,
      is_active ? 1 : 0,
      ...whereParams
    ];

    const result = await executeQuery(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found or no changes made.' });
    }

    res.status(200).json({ success: true, message: 'Customer updated successfully.' });

  } catch (error) {
    logger.error(`Error updating customer with ID ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * @desc    Soft delete a customer
 * @route   DELETE /api/customers/:id
 * @access  Private
 */
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const whereClauses = ['id = ?'];
    const params = [id];
    addOptionalOrgFilter(req, whereClauses, params);

    const query = `
      UPDATE customers
         SET is_deleted = TRUE, is_active = FALSE
       WHERE ${whereClauses.join(' AND ')}
    `;
    const result = await executeQuery(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    res.status(200).json({ success: true, message: 'Customer deleted successfully.' });

  } catch (error) {
    logger.error(`Error deleting customer with ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};














// // controllers/customerController.js
// const { executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');
// const { validationResult } = require('express-validator');

// /**
//  * @desc    Create a new customer
//  * @route   POST /api/customers
//  * @access  Private
//  */
// const createCustomer = async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
//     }

//     const { first_name, last_name, phone, email, address, city, state, pincode } = (req.body || {});

//     const query = `
//       INSERT INTO customers 
//       (first_name, last_name, phone, email, address, city, state, pincode) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;
//     const params = [
//       first_name,
//       last_name,
//       phone,
//       email ?? null,
//       address ?? null,
//       city ?? null,
//       state ?? null,
//       pincode ?? null
//     ];

//     const result = await executeQuery(query, params);

//     logger.info(`New customer created with ID: ${result.insertId}`);
//     // Return id both top-level and inside data for compatibility with existing frontend code
//     res.status(201).json({
//       success: true,
//       message: 'Customer created successfully.',
//       id: result.insertId,
//       data: { id: result.insertId }
//     });

//   } catch (error) {
//     logger.error('Error creating customer:', error);
//     if (error.code === 'ER_DUP_ENTRY') {
//       return res.status(400).json({ success: false, message: 'Customer with this phone number already exists.' });
//     }
//     next(error);
//   }
// };

// /**
//  * @desc    Get all customers with pagination and search
//  * @route   GET /api/customers
//  * @access  Private
//  */
// const getAllCustomers = async (req, res, next) => {
//   try {
//     const { page = 1, limit = 20, search } = req.query;

//     // Ensure limit and offset are safe integers
//     const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
//     const safeOffset = (Math.max(1, parseInt(page, 10) || 1) - 1) * safeLimit;

//     let baseQuery = `SELECT * FROM customers`;
//     let countQuery = `SELECT COUNT(id) as total FROM customers`;

//     const whereClauses = ['is_deleted = FALSE'];
//     const whereParams = [];

//     if (search) {
//       whereClauses.push('(first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)');
//       const searchParam = `%${search}%`;
//       whereParams.push(searchParam, searchParam, searchParam);
//     }

//     const whereString = ` WHERE ${whereClauses.join(' AND ')}`;

//     const finalQuery = `${baseQuery}${whereString} ORDER BY first_name, last_name ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
//     const finalCountQuery = countQuery + whereString;

//     const customers = await executeQuery(finalQuery, whereParams);
//     const [totalResult] = await executeQuery(finalCountQuery, whereParams);
//     const totalCustomers = totalResult.total;

//     res.status(200).json({
//       success: true,
//       count: customers.length,
//       pagination: {
//         total: totalCustomers,
//         limit: safeLimit,
//         page: parseInt(page, 10) || 1,
//         totalPages: Math.ceil(totalCustomers / safeLimit)
//       },
//       data: customers
//     });

//   } catch (error) {
//     logger.error('Error fetching customers:', error);
//     next(error);
//   }
// };

// /**
//  * @desc    Get a single customer by ID
//  * @route   GET /api/customers/:id
//  * @access  Private
//  */
// const getCustomerById = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const query = 'SELECT * FROM customers WHERE id = ? AND is_deleted = FALSE';
//     const [customer] = await executeQuery(query, [id]);

//     if (!customer) {
//       return res.status(404).json({ success: false, message: 'Customer not found.' });
//     }

//     res.status(200).json({ success: true, data: customer });

//   } catch (error) {
//     logger.error(`Error fetching customer with ID ${req.params.id}:`, error);
//     next(error);
//   }
// };

// /**
//  * @desc    Update a customer (partial-safe: pass NULL to keep current value)
//  * @route   PUT /api/customers/:id
//  * @access  Private
//  */
// const updateCustomer = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Required fields (you already validate these in the route)
//     const { first_name, last_name, phone } = req.body;

//     // Optional fields; if omitted/undefined, pass NULL so COALESCE keeps existing value
//     const email = req.body.email ?? null;
//     const address = req.body.address ?? null;
//     const city = req.body.city ?? null;
//     const state = req.body.state ?? null;
//     const pincode = req.body.pincode ?? null;

//     // Normalize is_active to tinyint 0/1 if provided; otherwise NULL to keep current value
//     const is_active =
//       req.body.is_active === undefined || req.body.is_active === null
//         ? null
//         : (req.body.is_active ? 1 : 0);

//     const query = `
//       UPDATE customers SET
//         first_name = ?,
//         last_name = ?,
//         phone = ?,
//         email = COALESCE(?, email),
//         address = COALESCE(?, address),
//         city = COALESCE(?, city),
//         state = COALESCE(?, state),
//         pincode = COALESCE(?, pincode),
//         is_active = COALESCE(?, is_active)
//       WHERE id = ? AND is_deleted = FALSE
//     `;

//     const params = [first_name, last_name, phone, email, address, city, state, pincode, is_active, id];

//     const result = await executeQuery(query, params);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ success: false, message: 'Customer not found or no changes made.' });
//     }

//     logger.info(`Customer with ID ${id} updated.`);
//     res.status(200).json({ success: true, message: 'Customer updated successfully.' });

//   } catch (error) {
//     logger.error(`Error updating customer with ID ${req.params.id}:`, error);
//     next(error);
//   }
// };

// /**
//  * @desc    Soft delete a customer
//  * @route   DELETE /api/customers/:id
//  * @access  Private (Admin/Manager roles)
//  */
// const deleteCustomer = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const query = 'UPDATE customers SET is_deleted = TRUE, is_active = FALSE WHERE id = ?';
//     const result = await executeQuery(query, [id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ success: false, message: 'Customer not found.' });
//     }

//     logger.info(`Customer with ID ${id} has been soft-deleted.`);
//     res.status(200).json({ success: true, message: 'Customer deleted successfully.' });

//   } catch (error) {
//     logger.error(`Error deleting customer with ID ${req.params.id}:`, error);
//     next(error);
//   }
// };

// module.exports = {
//   createCustomer,
//   getAllCustomers,
//   getCustomerById,
//   updateCustomer,
//   deleteCustomer
// };





// // // In backend/src/controllers/customerController.js

// // const { executeQuery } = require('../utils/database');
// // const logger = require('../utils/logger');
// // const { validationResult } = require('express-validator');

// // /**
// //  * @desc    Create a new customer
// //  * @route   POST /api/customers
// //  * @access  Private
// //  */
// // const createCustomer = async (req, res, next) => {
// //     try {
// //         const errors = validationResult(req);
// //         if (!errors.isEmpty()) {
// //             return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
// //         }

// //         const { first_name, last_name, phone, email, address, city, state, pincode } = req.body;

// //         const query = `
// //             INSERT INTO customers 
// //             (first_name, last_name, phone, email, address, city, state, pincode) 
// //             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
// //         `;
// //         const params = [first_name, last_name, phone, email || null, address || null, city || null, state || null, pincode || null];

// //         const result = await executeQuery(query, params);
        
// //         logger.info(`New customer created with ID: ${result.insertId}`);
// //         res.status(201).json({ success: true, message: 'Customer created successfully.', data: { id: result.insertId } });

// //     } catch (error) {
// //         logger.error('Error creating customer:', error);
// //         if (error.code === 'ER_DUP_ENTRY') {
// //             return res.status(400).json({ success: false, message: 'Customer with this phone number already exists.' });
// //         }
// //         next(error);
// //     }
// // };

// // /**
// //  * @desc    Get all customers with pagination and search
// //  * @route   GET /api/customers
// //  * @access  Private
// //  */
// // const getAllCustomers = async (req, res, next) => {
// //     try {
// //         const { page = 1, limit = 20, search } = req.query;
        
// //         // Ensure limit and offset are safe integers
// //         const safeLimit = parseInt(limit, 10);
// //         const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

// //         let baseQuery = `SELECT * FROM customers`;
// //         let countQuery = `SELECT COUNT(id) as total FROM customers`;
        
// //         const whereClauses = ['is_deleted = FALSE'];
// //         const whereParams = [];

// //         if (search) {
// //             whereClauses.push('(first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)');
// //             const searchParam = `%${search}%`;
// //             whereParams.push(searchParam, searchParam, searchParam);
// //         }

// //         const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
// //         // Construct the final queries
// //         const finalQuery = `${baseQuery}${whereString} ORDER BY first_name, last_name ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
// //         const finalCountQuery = countQuery + whereString;

// //         const customers = await executeQuery(finalQuery, whereParams);
// //         const [totalResult] = await executeQuery(finalCountQuery, whereParams);
// //         const totalCustomers = totalResult.total;

// //         res.status(200).json({
// //             success: true,
// //             count: customers.length,
// //             pagination: {
// //                 total: totalCustomers,
// //                 limit: safeLimit,
// //                 page: parseInt(page, 10),
// //                 totalPages: Math.ceil(totalCustomers / safeLimit)
// //             },
// //             data: customers
// //         });

// //     } catch (error) {
// //         logger.error('Error fetching customers:', error);
// //         next(error);
// //     }
// // };

// // /**
// //  * @desc    Get a single customer by ID
// //  * @route   GET /api/customers/:id
// //  * @access  Private
// //  */
// // const getCustomerById = async (req, res, next) => {
// //     try {
// //         const { id } = req.params;
// //         const query = 'SELECT * FROM customers WHERE id = ? AND is_deleted = FALSE';
// //         const [customer] = await executeQuery(query, [id]);

// //         if (!customer) {
// //             return res.status(404).json({ success: false, message: 'Customer not found.' });
// //         }

// //         res.status(200).json({ success: true, data: customer });

// //     } catch (error) {
// //         logger.error(`Error fetching customer with ID ${req.params.id}:`, error);
// //         next(error);
// //     }
// // };

// // /**
// //  * @desc    Update a customer
// //  * @route   PUT /api/customers/:id
// //  * @access  Private
// //  */
// // const updateCustomer = async (req, res, next) => {
// //     try {
// //         const { id } = req.params;
// //         const { first_name, last_name, phone, email, address, city, state, pincode, is_active } = req.body;

// //         const query = `
// //             UPDATE customers SET 
// //             first_name = ?, last_name = ?, phone = ?, email = ?, address = ?, 
// //             city = ?, state = ?, pincode = ?, is_active = ?
// //             WHERE id = ? AND is_deleted = FALSE
// //         `;
// //         const params = [first_name, last_name, phone, email, address, city, state, pincode, is_active, id];

// //         const result = await executeQuery(query, params);

// //         if (result.affectedRows === 0) {
// //             return res.status(404).json({ success: false, message: 'Customer not found or no changes made.' });
// //         }

// //         logger.info(`Customer with ID ${id} updated.`);
// //         res.status(200).json({ success: true, message: 'Customer updated successfully.' });

// //     } catch (error) {
// //         logger.error(`Error updating customer with ID ${req.params.id}:`, error);
// //         next(error);
// //     }
// // };

// // /**
// //  * @desc    Soft delete a customer
// //  * @route   DELETE /api/customers/:id
// //  * @access  Private
// //  */
// // const deleteCustomer = async (req, res, next) => {
// //     try {
// //         const { id } = req.params;
// //         const query = 'UPDATE customers SET is_deleted = TRUE, is_active = FALSE WHERE id = ?';
// //         const result = await executeQuery(query, [id]);

// //         if (result.affectedRows === 0) {
// //             return res.status(404).json({ success: false, message: 'Customer not found.' });
// //         }
        
// //         logger.info(`Customer with ID ${id} has been soft-deleted.`);
// //         res.status(200).json({ success: true, message: 'Customer deleted successfully.' });

// //     } catch (error) {
// //         logger.error(`Error deleting customer with ID ${req.params.id}:`, error);
// //         next(error);
// //     }
// // };

// // module.exports = {
// //     createCustomer,
// //     getAllCustomers,
// //     getCustomerById,
// //     updateCustomer,
// //     deleteCustomer
// // };
