// backend/src/controllers/roleController.js
'use strict';

const { executeQuery, getConnection } = require('../utils/database');
const logger = require('../utils/logger');

/* ----------------------------- Helpers ----------------------------- */

function groupPermissionsByCategory(rows) {
  const out = {};
  for (const r of rows) {
    const cat = r.category || 'General';
    if (!out[cat]) out[cat] = [];
    out[cat].push({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category || null,
    });
  }
  return out;
}

/* ----------------------------- Controllers ----------------------------- */

/**
 * GET /api/roles/permissions
 * Returns all permissions grouped by category.
 */
const getAllPermissions = async (req, res, next) => {
  try {
    const rows = await executeQuery(
      `SELECT id, name, description, category
         FROM permissions
        ORDER BY COALESCE(category, 'General'), name`
    );
    return res.json({ success: true, data: groupPermissionsByCategory(rows) });
  } catch (err) {
    logger.error('getAllPermissions error:', err);
    next(err);
  }
};

/**
 * POST /api/roles/permissions
 * Body: { name, description?, category? }
 * Creates a permission (name must be unique).
 */
const createPermission = async (req, res, next) => {
  try {
    const { name, description, category } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Permission `name` is required' });
    }

    const sql = `INSERT INTO permissions (name, description, category) VALUES (?, ?, ?)`;
    await executeQuery(sql, [String(name).trim(), description || null, category || null]);

    return res.status(201).json({ success: true, message: 'Permission created' });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Permission name already exists' });
    }
    logger.error('createPermission error:', err);
    next(err);
  }
};

/**
 * GET /api/roles
 */
const getAllRoles = async (req, res, next) => {
  try {
    const rows = await executeQuery(
      `SELECT id, name, description, is_system_role
         FROM roles
        ORDER BY id ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('getAllRoles error:', err);
    next(err);
  }
};

/**
 * GET /api/roles/:id
 * Returns role + its permissions array
 */
const getRoleById = async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    const [role] = await executeQuery(
      `SELECT id, name, description, is_system_role FROM roles WHERE id = ?`,
      [roleId]
    );
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const perms = await executeQuery(
      `SELECT p.id, p.name, p.description, p.category
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ?
        ORDER BY COALESCE(p.category, 'General'), p.name`,
      [roleId]
    );

    return res.json({ success: true, data: { ...role, permissions: perms } });
  } catch (err) {
    logger.error('getRoleById error:', err);
    next(err);
  }
};

/**
 * PUT /api/roles/:id
 * Body: { name, description, permissions: number[] }
 * Replaces role metadata and its permission set (transactional).
 */
const updateRolePermissions = async (req, res, next) => {
  let conn;
  try {
    const roleId = Number(req.params.id);
    const { name, description, permissions } = req.body || {};

    // Basic guards
    if (!roleId || Number.isNaN(roleId)) {
      return res.status(400).json({ success: false, message: 'Invalid role id' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Role `name` is required' });
    }

    // Take a dedicated connection for the transaction
    conn = await getConnection();
    await conn.beginTransaction();

    // Update role metadata
    await conn.execute(
      `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
      [String(name).trim(), description || null, roleId]
    );

    // Replace permission set
    await conn.execute(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);

    const ids = Array.isArray(permissions) ? permissions.map(Number).filter(Number.isFinite) : [];
    if (ids.length > 0) {
      // Build bulk insert: (role_id, permission_id), ...
      const values = ids.map(() => '(?, ?)').join(', ');
      const params = ids.flatMap((pid) => [roleId, pid]);
      await conn.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
        params
      );
    }

    await conn.commit();
    return res.json({ success: true, message: 'Role permissions updated' });
  } catch (err) {
    // Roll back only if we have a tx-capable connection
    try { if (conn && typeof conn.rollback === 'function') await conn.rollback(); } catch (_) {}
    logger.error('updateRolePermissions error:', err);
    next(err);
  } finally {
    // Always release the connection back to the pool
    try { if (conn && typeof conn.release === 'function') conn.release(); } catch (_) {}
  }
};

module.exports = {
  getAllPermissions,
  createPermission,
  getAllRoles,
  getRoleById,
  updateRolePermissions,
  // alias in case your routes reference "updateRole"
  updateRole: updateRolePermissions,
};







// // In backend/src/controllers/roleController.js

// const { getConnection, executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');

// /**
//  * @desc    Get all roles
//  * @route   GET /api/roles
//  * @access  Private (Super Admin)
//  */
// const getAllRoles = async (req, res, next) => {
//     try {
//         const roles = await executeQuery('SELECT * FROM roles ORDER BY name ASC');
//         res.status(200).json({ success: true, data: roles });
//     } catch (error) {
//         logger.error('Error fetching roles:', error);
//         next(error);
//     }
// };

// /**
//  * @desc    Get all available permissions, grouped by category
//  * @route   GET /api/roles/permissions
//  * @access  Private (Super Admin)
//  */
// const getAllPermissions = async (req, res, next) => {
//     try {
//         const permissions = await executeQuery('SELECT * FROM permissions ORDER BY category, name ASC');
        
//         // Group permissions by category for a better UI experience
//         const groupedPermissions = permissions.reduce((acc, permission) => {
//             const category = permission.category || 'General';
//             if (!acc[category]) {
//                 acc[category] = [];
//             }
//             acc[category].push(permission);
//             return acc;
//         }, {});

//         res.status(200).json({ success: true, data: groupedPermissions });
//     } catch (error) {
//         logger.error('Error fetching permissions:', error);
//         next(error);
//     }
// };

// /**
//  * @desc    Get a single role by ID, including its permissions
//  * @route   GET /api/roles/:id
//  * @access  Private (Super Admin)
//  */
// const getRoleById = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [id]);

//         if (!role) {
//             return res.status(404).json({ success: false, message: 'Role not found.' });
//         }

//         const permissions = await executeQuery('SELECT permission_id FROM role_permissions WHERE role_id = ?', [id]);
//         role.permissions = permissions.map(p => p.permission_id); // Attach an array of permission IDs

//         res.status(200).json({ success: true, data: role });
//     } catch (error) {
//         logger.error(`Error fetching role with ID ${req.params.id}:`, error);
//         next(error);
//     }
// };


// /**
//  * @desc    Update a role's details and permissions
//  * @route   PUT /api/roles/:id
//  * @access  Private (Super Admin)
//  */
// const updateRole = async (req, res, next) => {
//     const connection = getConnection();
//     try {
//         const { id } = req.params;
//         const { name, description, permissions } = req.body; // permissions is an array of permission IDs

//         await connection.beginTransaction();

//         // 1. Update the role's name and description
//         await connection.execute(
//             'UPDATE roles SET name = ?, description = ? WHERE id = ? AND is_system_role = FALSE',
//             [name, description, id]
//         );

//         // 2. Clear the existing permissions for this role
//         await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);

//         // 3. Insert the new set of permissions
//         if (permissions && permissions.length > 0) {
//             const permissionValues = permissions.map(permissionId => [id, permissionId]);
//             await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [permissionValues]);
//         }

//         await connection.commit();

//         logger.info(`Role with ID ${id} updated successfully.`);
//         res.status(200).json({ success: true, message: 'Role updated successfully.' });

//     } catch (error) {
//         await connection.rollback();
//         logger.error(`Error updating role with ID ${req.params.id}:`, error);
//         next(error);
//     }
// };

// // // POST /api/roles/permissions  (super_admin only; see routes)
// // const createPermission = async (req, res, next) => {
// //   try {
// //     const { name, description, category } = req.body || {};
// //     if (!name || !String(name).trim()) {
// //       return res.status(400).json({ success: false, message: 'Permission `name` is required' });
// //     }
// //     // enforce uniqueness on `name`
// //     const sql = `INSERT INTO permissions (name, description, category) VALUES (?, ?, ?)`;
// //     const params = [String(name).trim(), description || null, category || null];
// //     await executeQuery(sql, params);
// //     return res.status(201).json({ success: true, message: 'Permission created' });
// //   } catch (e) {
// //     if (e.code === 'ER_DUP_ENTRY') {
// //       return res.status(400).json({ success: false, message: 'Permission name already exists' });
// //     }
// //     next(e);
// //   }
// // };


// module.exports = {
//     getAllRoles,
//     getAllPermissions,
//     getRoleById,
//     updateRole,
//     // createPermission,
// };
