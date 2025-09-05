// Auth middleware: verify JWT, (optionally) validate session SID, then load user profile.
// Permissions are loaded by middleware/permissions.js (loadPermissions).

'use strict';

const jwt = require('jsonwebtoken');
const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');

// ✅ NEW: validate SID against DB session table
const { findValidSessionBySid } = require('../repositories/sessions');

function extractBearerToken(req) {
  const hdr = req.header('Authorization') || '';
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

const authMiddleware = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'JWT secret missing' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg =
        err?.name === 'TokenExpiredError' ? 'Token expired.' :
        err?.name === 'JsonWebTokenError' ? 'Invalid token.' :
        'Invalid token.';
      return res.status(401).json({ success: false, message: msg });
    }

    // ✅ If token carries a session id (sid), ensure the session is still valid.
    // (For legacy tokens without sid, we skip this check to avoid breaking existing logins.)
    if (decoded.sid) {
      const session = await findValidSessionBySid(decoded.sid);
      if (!session) {
        return res.status(401).json({ success: false, message: 'Session invalid or expired' });
      }
      req.session = session; // optional, available to routes if needed
    }
    // NEW: capture active branch from query or header for downstream RBAC checks
    const qBranch = req.query.branchId != null ? Number(req.query.branchId) : undefined;
    const hBranch = req.headers['x-branch-id'] != null ? Number(req.headers['x-branch-id']) : undefined;
    req.branchId = qBranch ?? hBranch ?? null;

    // Load user profile & derive org_id from branches (users table has no org_id)
    const userQuery = `
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.phone,
        u.role_id, u.default_branch_id,
        COALESCE(
          b.org_id,
          (SELECT b2.org_id
             FROM user_branch_access uba2
             JOIN branches b2 ON b2.id = uba2.branch_id
            WHERE uba2.user_id = u.id
            ORDER BY b2.id ASC
            LIMIT 1)
        ) AS org_id,
        u.is_active, u.is_deleted,
        r.name AS role_name,
        b.name AS branch_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN branches b ON u.default_branch_id = b.id
      WHERE u.id = ? AND u.is_active = TRUE AND u.is_deleted = FALSE
      LIMIT 1
    `;
    const rows = await executeQuery(userQuery, [decoded.userId]);
    const user = rows?.[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token. User not found or inactive.' });
    }

    // Branch access list
    const accessQuery = `
      SELECT b.id, b.name, b.code
      FROM user_branch_access uba
      JOIN branches b ON uba.branch_id = b.id
      WHERE uba.user_id = ? AND b.is_active = TRUE AND b.is_deleted = FALSE
      ORDER BY b.name
    `;
    const accessibleBranches = await executeQuery(accessQuery, [user.id]);

    // Attach sanitized user to req
    req.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      role: user.role_name,
      org_id: user.org_id || null,
      default_branch_id: user.default_branch_id,
      branch_name: user.branch_name || null,
      accessibleBranches,
      // permissions are attached by permissions.loadPermissions
    };

    return next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

const authorize = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role === 'Super Admin') return next();

    const perms = req.user.permissions instanceof Set
      ? req.user.permissions
      : new Set(Array.isArray(req.user.permissions) ? req.user.permissions : []);

    const missing = requiredPermissions.filter(p => !perms.has(p));
    if (requiredPermissions.length && missing.length) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions', missing });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  authorize,
};














// // backend/src/middleware/auth.js
// // Auth ONLY: verify JWT, load user core profile, derive org_id from branches,
// // attach sanitized req.user (permissions loaded separately by permissions.js).

// const jwt = require('jsonwebtoken');
// const { executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');

// function extractBearerToken(req) {
//   const hdr = req.header('Authorization') || '';
//   const m = hdr.match(/^Bearer\s+(.+)$/i);
//   return m ? m[1] : null;
// }

// const authMiddleware = async (req, res, next) => {
//   try {
//     // 1) Token
//     const token = extractBearerToken(req);
//     if (!token) {
//       return res
//         .status(401)
//         .json({ success: false, message: 'Access denied. No token provided.' });
//     }

//     // 2) Verify
//     if (!process.env.JWT_SECRET) {
//       return res.status(500).json({ success: false, message: 'JWT secret missing' });
//     }
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       const msg =
//         err?.name === 'TokenExpiredError' ? 'Token expired.' :
//         err?.name === 'JsonWebTokenError' ? 'Invalid token.' :
//         'Invalid token.';
//       return res.status(401).json({ success: false, message: msg });
//     }

//     // 3) Load user profile
//     // NOTE: users table has no org_id → derive org_id from default branch (b.org_id).
//     // If user has no default branch, pick org_id from any accessible branch.
//     const userQuery = `
//       SELECT
//         u.id, u.first_name, u.last_name, u.email, u.phone,
//         u.role_id, u.default_branch_id,
//         -- derive org_id from default branch or fallback to first accessible branch
//         COALESCE(
//           b.org_id,
//           (SELECT b2.org_id
//              FROM user_branch_access uba2
//              JOIN branches b2 ON b2.id = uba2.branch_id
//             WHERE uba2.user_id = u.id
//             ORDER BY b2.id ASC
//             LIMIT 1)
//         ) AS org_id,
//         u.is_active, u.is_deleted,
//         r.name AS role_name,
//         b.name AS branch_name
//       FROM users u
//       JOIN roles r ON u.role_id = r.id
//       LEFT JOIN branches b ON u.default_branch_id = b.id
//       WHERE u.id = ? AND u.is_active = TRUE AND u.is_deleted = FALSE
//       LIMIT 1
//     `;
//     const rows = await executeQuery(userQuery, [decoded.userId]);
//     const user = rows?.[0];
//     if (!user) {
//       return res
//         .status(401)
//         .json({ success: false, message: 'Invalid token. User not found or inactive.' });
//     }

//     // 4) Load accessible branches for UI/filters
//     const accessQuery = `
//       SELECT b.id, b.name, b.code
//       FROM user_branch_access uba
//       JOIN branches b ON uba.branch_id = b.id
//       WHERE uba.user_id = ? AND b.is_active = TRUE AND b.is_deleted = FALSE
//       ORDER BY b.name
//     `;
//     const accessibleBranches = await executeQuery(accessQuery, [user.id]);

//     // 5) Attach sanitized user
//     req.user = {
//       id: user.id,
//       first_name: user.first_name,
//       last_name: user.last_name,
//       email: user.email,
//       phone: user.phone,
//       role_id: user.role_id,
//       role: user.role_name,
//       org_id: user.org_id || null,           // ✅ derived safely
//       default_branch_id: user.default_branch_id,
//       branch_name: user.branch_name || null,
//       accessibleBranches,
//       // permissions are added by permissions.loadPermissions
//     };

//     return next();
//   } catch (error) {
//     logger.error('Authentication error:', error);
//     return res.status(401).json({ success: false, message: 'Invalid token.' });
//   }
// };

// /**
//  * Optional: route-level guard compatible with permissions.loadPermissions
//  */
// const authorize = (requiredPermissions = []) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ success: false, message: 'Authentication required' });
//     }
//     if (req.user.role === 'Super Admin') return next();

//     const perms = req.user.permissions instanceof Set
//       ? req.user.permissions
//       : new Set(Array.isArray(req.user.permissions) ? req.user.permissions : []);

//     const missing = requiredPermissions.filter(p => !perms.has(p));
//     if (requiredPermissions.length && missing.length) {
//       return res.status(403).json({ success: false, message: 'Insufficient permissions', missing });
//     }
//     next();
//   };
// };

// module.exports = {
//   authMiddleware,
//   authorize,
// };










// // // In backend/src/middleware/auth.js

// // const jwt = require('jsonwebtoken');
// // const { executeQuery } = require('../utils/database');
// // const logger = require('../utils/logger');

// // const authMiddleware = async (req, res, next) => {
// //     try {
// //         const token = req.header('Authorization')?.replace('Bearer ', '');
// //         if (!token) {
// //             return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
// //         }

// //         const decoded = jwt.verify(token, process.env.JWT_SECRET);

// //         // 1. Get user's main details, their role name, and default branch
// //         const userQuery = `
// //             SELECT 
// //                 u.*, 
// //                 r.name as role_name,
// //                 b.name as branch_name
// //             FROM users u 
// //             JOIN roles r ON u.role_id = r.id
// //             LEFT JOIN branches b ON u.default_branch_id = b.id 
// //             WHERE u.id = ? AND u.is_active = true AND u.is_deleted = FALSE
// //         `;
// //         const [user] = await executeQuery(userQuery, [decoded.userId]);

// //         if (!user) {
// //             return res.status(401).json({ success: false, message: 'Invalid token. User not found or inactive.' });
// //         }
        
// //         // 2. Get a list of all permission names for the user's role
// //         const permissionsQuery = `
// //             SELECT p.name 
// //             FROM role_permissions rp
// //             JOIN permissions p ON rp.permission_id = p.id
// //             WHERE rp.role_id = ?
// //         `;
// //         const permissions = await executeQuery(permissionsQuery, [user.role_id]);
// //         user.permissions = permissions.map(p => p.name); // Attach a simple array of permission strings

// //         // 3. Get all accessible branches
// //         const accessQuery = `
// //             SELECT b.id, b.name, b.code 
// //             FROM user_branch_access uba
// //             JOIN branches b ON uba.branch_id = b.id
// //             WHERE uba.user_id = ? AND b.is_active = TRUE AND b.is_deleted = FALSE
// //         `;
// //         const accessibleBranches = await executeQuery(accessQuery, [decoded.userId]);
// //         user.accessibleBranches = accessibleBranches;

// //         // Rename role_name to role for consistency with old code
// //         user.role = user.role_name;
// //         delete user.role_name;

// //         req.user = user;
// //         next();
// //     } catch (error) {
// //         logger.error('Authentication error:', error);
// //         return res.status(401).json({ success: false, message: 'Invalid token.' });
// //     }
// // };

// // // This middleware now checks against the list of permissions
// // const authorize = (requiredPermissions = []) => {
// //     return (req, res, next) => {
// //         if (!req.user) {
// //             return res.status(401).json({ success: false, message: 'Authentication required' });
// //         }

// //         // Super admin bypasses all checks
// //         if (req.user.role === 'Super Admin') {
// //             return next();
// //         }

// //         const hasPermission = requiredPermissions.every(p => req.user.permissions.includes(p));

// //         if (requiredPermissions.length && !hasPermission) {
// //             return res.status(403).json({ success: false, message: 'Insufficient permissions' });
// //         }

// //         next();
// //     };
// // };

// // module.exports = {
// //     authMiddleware,
// //     authorize,
// // };




// // // // In backend/src/middleware/auth.js

// // // const jwt = require('jsonwebtoken');
// // // const { executeQuery } = require('../utils/database');
// // // const logger = require('../utils/logger');

// // // const authMiddleware = async (req, res, next) => {
// // //     try {
// // //         const token = req.header('Authorization')?.replace('Bearer ', '');
// // //         if (!token) {
// // //             return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
// // //         }

// // //         const decoded = jwt.verify(token, process.env.JWT_SECRET);

// // //         // 1. Get user's main details and their default branch
// // //         const userQuery = `
// // //             SELECT u.*, b.name as branch_name 
// // //             FROM users u 
// // //             LEFT JOIN branches b ON u.default_branch_id = b.id 
// // //             WHERE u.id = ? AND u.is_active = true AND u.is_deleted = FALSE
// // //         `;
// // //         const [user] = await executeQuery(userQuery, [decoded.userId]);

// // //         if (!user) {
// // //             return res.status(401).json({ success: false, message: 'Invalid token. User not found or inactive.' });
// // //         }

// // //         // 2. Get a list of ALL branches the user has access to from the new table
// // //         const accessQuery = `
// // //             SELECT b.id, b.name, b.code 
// // //             FROM user_branch_access uba
// // //             JOIN branches b ON uba.branch_id = b.id
// // //             WHERE uba.user_id = ? AND b.is_active = TRUE AND b.is_deleted = FALSE
// // //             ORDER BY b.name
// // //         `;
// // //         const accessibleBranches = await executeQuery(accessQuery, [decoded.userId]);
        
// // //         // 3. Attach the list of accessible branches to the user object
// // //         user.accessibleBranches = accessibleBranches;

// // //         req.user = user;
// // //         next();
// // //     } catch (error) {
// // //         logger.error('Authentication error:', error);
// // //         if (error.name === 'TokenExpiredError') {
// // //             return res.status(401).json({ success: false, message: 'Token expired.' });
// // //         }
// // //         return res.status(401).json({ success: false, message: 'Invalid token.' });
// // //     }
// // // };

// // // // Role-based authorization middleware (remains the same)
// // // const authorize = (roles = []) => {
// // //     return (req, res, next) => {
// // //         if (!roles.includes(req.user.role)) {
// // //             return res.status(403).json({
// // //                 success: false,
// // //                 message: 'Insufficient permissions'
// // //             });
// // //         }
// // //         next();
// // //     };
// // // };

// // // module.exports = {
// // //     authMiddleware,
// // //     authorize,
// // // };





// // // // const jwt = require('jsonwebtoken');
// // // // const { executeQuery } = require('../utils/database');
// // // // const logger = require('../utils/logger');

// // // // const authMiddleware = async (req, res, next) => {
// // // //   try {
// // // //     const token = req.header('Authorization')?.replace('Bearer ', '');

// // // //     if (!token) {
// // // //       return res.status(401).json({
// // // //         success: false,
// // // //         message: 'Access denied. No token provided.'
// // // //       });
// // // //     }

// // // //     const decoded = jwt.verify(token, process.env.JWT_SECRET);

// // // //     // Get user details from database
// // // //     const user = await executeQuery(
// // // //       `SELECT u.*, b.name as branch_name, b.code as branch_code 
// // // //        FROM users u 
// // // //        LEFT JOIN branches b ON u.default_branch_id = b.id 
// // // //        WHERE u.id = ? AND u.is_active = true`,
// // // //       [decoded.userId]
// // // //     );

// // // //     if (user.length === 0) {
// // // //       return res.status(401).json({
// // // //         success: false,
// // // //         message: 'Invalid token. User not found or inactive.'
// // // //       });
// // // //     }

// // // //     req.user = user[0];
// // // //     next();
// // // //   } catch (error) {
// // // //     logger.error('Authentication error:', error);

// // // //     if (error.name === 'TokenExpiredError') {
// // // //       return res.status(401).json({
// // // //         success: false,
// // // //         message: 'Token expired.'
// // // //       });
// // // //     }

// // // //     if (error.name === 'JsonWebTokenError') {
// // // //       return res.status(401).json({
// // // //         success: false,
// // // //         message: 'Invalid token.'
// // // //       });
// // // //     }

// // // //     res.status(500).json({
// // // //       success: false,
// // // //       message: 'Authentication server error'
// // // //     });
// // // //   }
// // // // };

// // // // // Role-based authorization middleware
// // // // const authorize = (roles = []) => {
// // // //   return (req, res, next) => {
// // // //     if (!req.user) {
// // // //       return res.status(401).json({
// // // //         success: false,
// // // //         message: 'Authentication required'
// // // //       });
// // // //     }

// // // //     if (roles.length && !roles.includes(req.user.role)) {
// // // //       return res.status(403).json({
// // // //         success: false,
// // // //         message: 'Insufficient permissions'
// // // //       });
// // // //     }

// // // //     next();
// // // //   };
// // // // };

// // // // // Branch access control
// // // // const branchAccess = (req, res, next) => {
// // // //   const requestedBranchId = req.params.branchId || req.body.branch_id;

// // // //   // Super admin can access all branches
// // // //   if (req.user.role === 'super_admin') {
// // // //     return next();
// // // //   }

// // // //   // Other users can only access their own branch
// // // //   if (requestedBranchId && parseInt(requestedBranchId) !== req.user.branch_id) {
// // // //     return res.status(403).json({
// // // //       success: false,
// // // //       message: 'Access denied to this branch'
// // // //     });
// // // //   }

// // // //   next();
// // // // };

// // // // module.exports = {
// // // //   authMiddleware,
// // // //   authorize,
// // // //   branchAccess
// // // // };
