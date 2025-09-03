'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');

// sessions repository
const {
  createSession,
  rotateRefreshToken,
  revokeSessionBySid,
  revokeAllSessionsForUser,
} = require('../repositories/sessions');

/* ------------------------------- helpers ------------------------------- */

function signAccessToken({ userId, sid }) {
  const payload = { userId, sid };
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign(payload, secret, { expiresIn });
}

// very small duration parser: '30m' | '24h' | '7d' | '3600s' | number(seconds)
function parseDurationToMs(value, fallbackMs) {
  if (!value && fallbackMs) return fallbackMs;
  if (typeof value === 'number') return value * 1000;
  const m = String(value).trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!m) return fallbackMs ?? 3600_000;
  const n = Number(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}

async function getPermissionNamesForRole(roleId) {
  const rows = await executeQuery(
    `
      SELECT p.name
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `,
    [roleId]
  );
  return rows.map(r => r.name);
}

function buildMenuSnapshot(permissionNames) {
  const has = p => permissionNames.includes(p);

  const mastersView = has('user:read') || has('product:read');
  const mastersAdd = has('user:create') || has('product:create');
  const mastersMod = has('user:update') || has('product:update');
  const mastersDel = has('user:delete') || has('product:delete');

  const salesView = has('sale:read') || has('sale:create');
  const salesAdd = has('sale:create');
  const salesMod = has('sale:cancel'); // treat cancel as modify
  const salesDel = false;

  const posView = has('sale:create') || has('sale:read');
  const posAdd = has('sale:create');
  const posMod = has('sale:cancel');
  const posDel = false;

  const invView = has('report:view:inventory');
  const repView = has('report:view:sales') || has('report:view:inventory');

  // you can extend this later; this is a sensible starter mapping
  const windows = [
    { code: 'dashboard', rights: { view: true, add: false, modify: false, delete: false } },
    { code: 'pos',       rights: { view: posView, add: posAdd, modify: posMod, delete: posDel } },
    { code: 'sales',     rights: { view: salesView, add: salesAdd, modify: salesMod, delete: salesDel } },
    { code: 'purchases', rights: { view: false, add: false, modify: false, delete: false } },
    { code: 'payments',  rights: { view: false, add: false, modify: false, delete: false } },
    { code: 'inventory', rights: { view: invView, add: false, modify: false, delete: false } },
    { code: 'report',    rights: { view: repView, add: false, modify: false, delete: false } },
    { code: 'masters',   rights: { view: mastersView, add: mastersAdd, modify: mastersMod, delete: mastersDel } },
    { code: 'branch_master', parent: 'masters',
      rights: { view: mastersView, add: mastersAdd, modify: mastersMod, delete: mastersDel } },
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    windows
  };
}

function sanitizeUser(row) {
  const clone = { ...row };
  delete clone.password_hash;
  return clone;
}

/* --------------------------------- login -------------------------------- */

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { username, password } = req.body;

    // Get user + org from default branch
    const userQuery = `
      SELECT u.*,
             b.name AS branch_name, b.code AS branch_code, b.org_id AS org_id
      FROM users u
      LEFT JOIN branches b ON u.default_branch_id = b.id
      WHERE u.username = ?
        AND u.is_active = TRUE
        AND u.is_deleted = FALSE
      LIMIT 1
    `;
    const [userRow] = await executeQuery(userQuery, [username]);
    if (!userRow) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Branches user can access
    const accessQuery = `
      SELECT b.id, b.name, b.code
      FROM user_branch_access uba
      JOIN branches b ON uba.branch_id = b.id
      WHERE uba.user_id = ?
        AND b.is_active = TRUE
        AND b.is_deleted = FALSE
      ORDER BY b.name
    `;
    const accessibleBranches = await executeQuery(accessQuery, [userRow.id]);

    // Permissions for the user's role (names)
    const permissionNames = await getPermissionNamesForRole(userRow.role_id);

    // Build a simple "window menu" snapshot from permissions
    const menuSnapshot = buildMenuSnapshot(permissionNames);

    // Session TTLs (computed in controller so DB always gets real timestamps)
    const now = Date.now();
    const accessMs = parseDurationToMs(process.env.JWT_EXPIRES_IN || '1h', 3600_000);
    const refreshMs = parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d', 7 * 86_400_000);
    const expiresAt = new Date(now + accessMs).toISOString();
    const refreshExpiresAt = new Date(now + refreshMs).toISOString();

    // Create persistent session row
    const ip = req.ip;
    const userAgent = req.get('user-agent') || null;

    const session = await createSession({
      user: userRow,
      ip,
      userAgent,
      org_id: userRow.org_id ?? null,
      role_id: userRow.role_id ?? null,
      default_branch_id: userRow.default_branch_id ?? null,

      // make sure repository saves these JSON blobs and timestamps
      permissionsSnapshot: permissionNames,
      menuSnapshot,
      expiresAt,
      refreshExpiresAt
    });

    // JWT bound to this session's jti
    const accessToken = signAccessToken({ userId: userRow.id, sid: session.jti });
    const refreshToken = session.refreshToken;

    await executeQuery('UPDATE users SET last_login = NOW() WHERE id = ?', [userRow.id]);

    const user = sanitizeUser(userRow);
    user.accessibleBranches = accessibleBranches;
    user.effectivePermissions = permissionNames;

    logger.info(`User ${user.username} logged in successfully`);

    return res.json({
      success: true,
      message: 'Login successful',
      data: { user, accessToken, refreshToken }
    });
  } catch (err) {
    logger.error('Authentication error:', err);
    return next(err);
  }
}

/* -------------------------------- refresh ------------------------------- */

async function refreshToken(req, res, _next) {
  try {
    const token = req.body?.refreshToken;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const rotated = await rotateRefreshToken(token);
    if (!rotated) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const { session, newToken } = rotated;
    const accessToken = signAccessToken({ userId: session.user_id, sid: session.jti });

    return res.json({
      success: true,
      data: { accessToken, refreshToken: newToken }
    });
  } catch (_err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }
}

/* ---------------------------- change password --------------------------- */

async function changePassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const [row] = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ? AND is_deleted = FALSE',
      [userId]
    );
    if (!row) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, row.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);
    await executeQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------- (optional) ------------------------------ */

async function logout(req, res, next) {
  try {
    const sid = req.session?.jti || req.auth?.sid; // depending on your auth middleware
    if (!sid) return res.status(400).json({ success: false, message: 'No active session' });

    await revokeSessionBySid(sid, 'User logout');
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

async function logoutAll(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ success: false, message: 'No user' });

    await revokeAllSessionsForUser(userId, 'User logout all');
    return res.json({ success: true, message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refreshToken,
  changePassword,
  // optional exports if you wire routes later:
  logout,
  logoutAll,
};















// // In backend/src/controllers/authController.js

// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { validationResult } = require('express-validator');
// const { executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');

// // Generate JWT token
// const generateTokens = (userId) => {
//     const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
//     const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
//     return { accessToken, refreshToken };
// };

// // Login
// const login = async (req, res, next) => {
//     try {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
//         }

//         const { username, password } = req.body;

//         const userQuery = `
//             SELECT u.*, b.name as branch_name, b.code as branch_code 
//             FROM users u 
//             LEFT JOIN branches b ON u.default_branch_id = b.id 
//             WHERE u.username = ? AND u.is_active = true AND u.is_deleted = FALSE
//         `;
//         const [user] = await executeQuery(userQuery, [username]);

//         if (!user) {
//             return res.status(401).json({ success: false, message: 'Invalid credentials' });
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.password_hash);
//         if (!isPasswordValid) {
//             return res.status(401).json({ success: false, message: 'Invalid credentials' });
//         }

//         // --- THIS IS THE FIX ---
//         // After validating the user, fetch all branches they have access to.
//         const accessQuery = `
//             SELECT b.id, b.name, b.code 
//             FROM user_branch_access uba
//             JOIN branches b ON uba.branch_id = b.id
//             WHERE uba.user_id = ? AND b.is_active = TRUE AND b.is_deleted = FALSE
//             ORDER BY b.name
//         `;
//         const accessibleBranches = await executeQuery(accessQuery, [user.id]);
//         user.accessibleBranches = accessibleBranches; // Attach the list to the user object

//         const { accessToken, refreshToken } = generateTokens(user.id);
//         await executeQuery('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        
//         delete user.password_hash;
//         logger.info(`User ${user.username} logged in successfully`);

//         res.json({
//             success: true,
//             message: 'Login successful',
//             data: { user, accessToken, refreshToken }
//         });

//     } catch (error) {
//         logger.error('Authentication error:', error);
//         next(error);
//     }
// };

// // Refresh token
// const refreshToken = async (req, res, next) => {
//     try {
//         const { refreshToken } = req.body;
//         if (!refreshToken) {
//             return res.status(401).json({ success: false, message: 'Refresh token is required.' });
//         }

//         const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
//         const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

//         res.json({
//             success: true,
//             data: { accessToken, refreshToken: newRefreshToken }
//         });
//     } catch (error) {
//         logger.error('Refresh token error:', error);
//         return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
//     }
// };

// // Change Password
// const changePassword = async (req, res, next) => {
//     try {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
//         }

//         const userId = req.user.id;
//         const { currentPassword, newPassword } = req.body;

//         const [user] = await executeQuery('SELECT password_hash FROM users WHERE id = ? AND is_deleted = FALSE', [userId]);
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found.' });
//         }

//         const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
//         if (!isMatch) {
//             return res.status(400).json({ success: false, message: 'Incorrect current password.' });
//         }

//         const salt = await bcrypt.genSalt(10);
//         const newPasswordHash = await bcrypt.hash(newPassword, salt);

//         await executeQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);

//         logger.info(`User with ID ${userId} successfully changed their password.`);
//         res.status(200).json({ success: true, message: 'Password changed successfully.' });

//     } catch (error) {
//         logger.error('Error changing password:', error);
//         next(error);
//     }
// };


// module.exports = {
//     login,
//     refreshToken,
//     changePassword,
// };
