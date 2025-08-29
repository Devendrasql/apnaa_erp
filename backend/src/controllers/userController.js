// backend/src/controllers/userController.js
'use strict';

const { getConnection, executeQuery } = require('../utils/database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

/**
 * @desc    Create a new user and assign branch access
 * @route   POST /api/users
 * @access  Private (Admin)
 */
const createUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  let connection;
  try {
    // EXPECT role_id (not role)
    const {
      first_name,
      last_name,
      username,
      email,
      password,
      phone,
      role_id,
      default_branch_id,
      accessible_branch_ids,
    } = req.body;

    connection = await getConnection();              // ⬅️ await the pool connection
    await connection.beginTransaction();

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userQuery = `
      INSERT INTO users (first_name, last_name, username, email, password_hash, phone, role_id, default_branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [userResult] = await connection.execute(userQuery, [
      first_name,
      last_name,
      username,
      email,
      password_hash,
      phone || null,
      role_id,
      default_branch_id || null,
    ]);
    const userId = userResult.insertId;

    if (Array.isArray(accessible_branch_ids) && accessible_branch_ids.length > 0) {
      // Use explicit placeholders (reliable with mysql2)
      const tuples = accessible_branch_ids.map((bid) => [userId, Number(bid)]);
      const placeholders = tuples.map(() => '(?, ?)').join(', ');
      await connection.execute(
        `INSERT INTO user_branch_access (user_id, branch_id) VALUES ${placeholders}`,
        tuples.flat()
      );
    }

    await connection.commit();
    logger.info(`New user created with ID: ${userId}`);

    return res
      .status(201)
      .json({ success: true, message: 'User created successfully.', data: { id: userId } });
  } catch (error) {
    try { if (connection) await connection.rollback(); } catch {}
    logger.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res
        .status(400)
        .json({ success: false, message: 'User with this username or email already exists.' });
    }
    return next(error);
  } finally {
    try { if (connection) connection.release(); } catch {}
  }
};

/**
 * @desc    Get all users with pagination and search
 * @route   GET /api/users
 * @access  Private
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
    const safeOffset = (Math.max(1, parseInt(page, 10) || 1) - 1) * safeLimit;

    let baseQuery = `
      SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone,
             u.role_id, r.name as role_name, u.default_branch_id, u.is_active, b.name as branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
   LEFT JOIN branches b ON u.default_branch_id = b.id
    `;
    let countQuery = `SELECT COUNT(u.id) as total FROM users u`;

    const where = ['u.is_deleted = FALSE'];
    const params = [];

    if (search) {
      where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereSql = ` WHERE ${where.join(' AND ')}`;
    const finalQuery = `${baseQuery}${whereSql} ORDER BY u.first_name, u.last_name ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const finalCount = countQuery + whereSql;

    const users = await executeQuery(finalQuery, params);
    const [tot] = await executeQuery(finalCount, params);
    const totalUsers = tot.total || 0;

    return res.status(200).json({
      success: true,
      pagination: { total: totalUsers, limit: safeLimit, page: parseInt(page, 10) || 1 },
      data: users,
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    return next(error);
  }
};

/**
 * @desc    Get a single user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query =
      'SELECT id, first_name, last_name, username, email, phone, role_id, default_branch_id, is_active FROM users WHERE id = ? AND is_deleted = FALSE';
    const [user] = await executeQuery(query, [id]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const accRows = await executeQuery(
      `SELECT branch_id FROM user_branch_access WHERE user_id = ?`,
      [id]
    );
    user.accessible_branch_ids = accRows.map((r) => r.branch_id);

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error(`Error fetching user with ID ${req.params.id}:`, error);
    return next(error);
  }
};

/**
 * @desc    Update a user's details and branch access
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
const updateUser = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      username,
      email,
      phone,
      role_id,
      default_branch_id,
      is_active,
      password,
      accessible_branch_ids,
    } = req.body;

    connection = await getConnection();              // ⬅️ await here too
    await connection.beginTransaction();

    const fields = [
      'first_name = ?',
      'last_name = ?',
      'username = ?',
      'email = ?',
      'phone = ?',
      'role_id = ?',
      'default_branch_id = ?',
      'is_active = ?',
    ];
    const params = [
      first_name,
      last_name,
      username,
      email,
      phone || null,
      role_id,
      default_branch_id || null,
      is_active ? 1 : 0,
    ];

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      fields.push('password_hash = ?');
      params.push(password_hash);
    }

    const updateSql = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`;
    params.push(id);
    await connection.execute(updateSql, params);

    // Replace branch access
    await connection.execute('DELETE FROM user_branch_access WHERE user_id = ?', [id]);

    if (Array.isArray(accessible_branch_ids) && accessible_branch_ids.length > 0) {
      const tuples = accessible_branch_ids.map((bid) => [id, Number(bid)]);
      const placeholders = tuples.map(() => '(?, ?)').join(', ');
      await connection.execute(
        `INSERT INTO user_branch_access (user_id, branch_id) VALUES ${placeholders}`,
        tuples.flat()
      );
    }

    await connection.commit();
    logger.info(`User with ID ${id} updated.`);

    return res.status(200).json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    try { if (connection) await connection.rollback(); } catch {}
    logger.error(`Error updating user with ID ${req.params.id}:`, error);
    return next(error);
  } finally {
    try { if (connection) connection.release(); } catch {}
  }
};

/**
 * @desc    Soft delete a user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await executeQuery(
      'UPDATE users SET is_deleted = TRUE, is_active = FALSE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    logger.info(`User with ID ${id} has been soft-deleted.`);
    return res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    logger.error(`Error deleting user with ID ${req.params.id}:`, error);
    return next(error);
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};









// // In backend/src/controllers/userController.js

// const { getConnection, executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');
// const { validationResult } = require('express-validator');
// const bcrypt = require('bcryptjs');

// /**
//  * @desc    Create a new user and assign branch access
//  * @route   POST /api/users
//  * @access  Private (Admin)
//  */
// const createUser = async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
//     }

//     const connection = getConnection();
//     try {
//         // FIX: Expect 'role_id' instead of 'role'
//         const { first_name, last_name, username, email, password, phone, role_id, default_branch_id, accessible_branch_ids } = req.body;

//         await connection.beginTransaction();

//         const salt = await bcrypt.genSalt(10);
//         const password_hash = await bcrypt.hash(password, salt);

//         const userQuery = `
//             INSERT INTO users (first_name, last_name, username, email, password_hash, phone, role_id, default_branch_id) 
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `;
//         const [userResult] = await connection.execute(userQuery, [
//             first_name, last_name, username, email, password_hash, 
//             phone || null, role_id, default_branch_id || null
//         ]);
//         const userId = userResult.insertId;

//         if (accessible_branch_ids && accessible_branch_ids.length > 0) {
//             const accessQuery = `INSERT INTO user_branch_access (user_id, branch_id) VALUES ?`;
//             const accessValues = accessible_branch_ids.map(branchId => [userId, branchId]);
//             await connection.query(accessQuery, [accessValues]);
//         }

//         await connection.commit();
        
//         logger.info(`New user created with ID: ${userId}`);
//         res.status(201).json({ success: true, message: 'User created successfully.', data: { id: userId } });

//     } catch (error) {
//         await connection.rollback();
//         logger.error('Error creating user:', error);
//         if (error.code === 'ER_DUP_ENTRY') {
//             return res.status(400).json({ success: false, message: 'User with this username or email already exists.' });
//         }
//         next(error);
//     }
// };

// /**
//  * @desc    Get all users with pagination and search
//  * @route   GET /api/users
//  * @access  Private
//  */
// const getAllUsers = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20, search } = req.query;
        
//         const safeLimit = parseInt(limit, 10);
//         const safeOffset = (parseInt(page, 10) - 1) * safeLimit;

//         let baseQuery = `
//             SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone, u.role_id, r.name as role_name, u.default_branch_id, u.is_active, b.name as branch_name
//             FROM users u
//             JOIN roles r ON u.role_id = r.id
//             LEFT JOIN branches b ON u.default_branch_id = b.id
//         `;
//         let countQuery = `SELECT COUNT(u.id) as total FROM users u`;
        
//         const whereClauses = ['u.is_deleted = FALSE'];
//         const whereParams = [];

//         if (search) {
//             whereClauses.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
//             const searchParam = `%${search}%`;
//             whereParams.push(searchParam, searchParam, searchParam, searchParam);
//         }

//         const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        
//         const finalQuery = `${baseQuery}${whereString} ORDER BY u.first_name, u.last_name ASC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
//         const finalCountQuery = countQuery + whereString;

//         const users = await executeQuery(finalQuery, whereParams);
//         const [totalResult] = await executeQuery(finalCountQuery, whereParams);
//         const totalUsers = totalResult.total;

//         res.status(200).json({
//             success: true,
//             pagination: { total: totalUsers, limit: safeLimit, page: parseInt(page, 10) },
//             data: users
//         });

//     } catch (error) {
//         logger.error('Error fetching users:', error);
//         next(error);
//     }
// };

// /**
//  * @desc    Get a single user by ID
//  * @route   GET /api/users/:id
//  * @access  Private
//  */
// const getUserById = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const query = 'SELECT id, first_name, last_name, username, email, phone, role_id, default_branch_id, is_active FROM users WHERE id = ? AND is_deleted = FALSE';
//         const [user] = await executeQuery(query, [id]);

//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found.' });
//         }

//         const accessQuery = `SELECT branch_id FROM user_branch_access WHERE user_id = ?`;
//         const accessibleBranches = await executeQuery(accessQuery, [id]);
//         user.accessible_branch_ids = accessibleBranches.map(b => b.branch_id);

//         res.status(200).json({ success: true, data: user });

//     } catch (error) {
//         logger.error(`Error fetching user with ID ${req.params.id}:`, error);
//         next(error);
//     }
// };


// /**
//  * @desc    Update a user's details and branch access
//  * @route   PUT /api/users/:id
//  * @access  Private (Admin)
//  */
// const updateUser = async (req, res, next) => {
//     const connection = getConnection();
//     try {
//         const { id } = req.params;
//         // FIX: Expect 'role_id' instead of 'role'
//         const { first_name, last_name, username, email, phone, role_id, default_branch_id, is_active, password, accessible_branch_ids } = req.body;

//         await connection.beginTransaction();

//         let updateFields = [
//             'first_name = ?', 'last_name = ?', 'username = ?', 'email = ?', 
//             'phone = ?', 'role_id = ?', 'default_branch_id = ?', 'is_active = ?'
//         ];
//         let params = [
//             first_name, last_name, username, email, phone || null, 
//             role_id, default_branch_id || null, is_active
//         ];

//         if (password) {
//             const salt = await bcrypt.genSalt(10);
//             const password_hash = await bcrypt.hash(password, salt);
//             updateFields.push('password_hash = ?');
//             params.push(password_hash);
//         }

//         const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND is_deleted = FALSE`;
//         params.push(id);
//         await connection.execute(query, params);

//         await connection.execute('DELETE FROM user_branch_access WHERE user_id = ?', [id]);
//         if (accessible_branch_ids && accessible_branch_ids.length > 0) {
//             const accessQuery = `INSERT INTO user_branch_access (user_id, branch_id) VALUES ?`;
//             const accessValues = accessible_branch_ids.map(branchId => [id, branchId]);
//             await connection.query(accessQuery, [accessValues]);
//         }

//         await connection.commit();

//         logger.info(`User with ID ${id} updated.`);
//         res.status(200).json({ success: true, message: 'User updated successfully.' });

//     } catch (error) {
//         await connection.rollback();
//         logger.error(`Error updating user with ID ${req.params.id}:`, error);
//         next(error);
//     }
// };

// /**
//  * @desc    Soft delete a user
//  * @route   DELETE /api/users/:id
//  * @access  Private (Admin)
//  */
// const deleteUser = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const query = 'UPDATE users SET is_deleted = TRUE, is_active = FALSE WHERE id = ?';
//         const result = await executeQuery(query, [id]);

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ success: false, message: 'User not found.' });
//         }
        
//         logger.info(`User with ID ${id} has been soft-deleted.`);
//         res.status(200).json({ success: true, message: 'User deleted successfully.' });

//     } catch (error) {
//         logger.error(`Error deleting user with ID ${req.params.id}:`, error);
//         next(error);
//     }
// };

// module.exports = {
//     createUser,
//     getAllUsers,
//     getUserById,
//     updateUser,
//     deleteUser
// };