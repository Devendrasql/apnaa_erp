'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../../../../utils/database');
const logger = require('../../../../utils/logger');
const {
    createSession,
    rotateRefreshToken,
    revokeSessionBySid,
    revokeAllSessionsForUser,
} = require('../../../../repositories/sessions');

// Helper to sign JWT
function signAccessToken({ userId, sid }) {
    const payload = { userId, sid };
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    return jwt.sign(payload, secret, { expiresIn });
}

// Helper to parse duration strings like '1h', '7d'
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

// Helper to get permissions for a role
async function getPermissionNamesForRole(roleId) {
    const rows = await executeQuery(
        `SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?`,
        [roleId]
    );
    return rows.map(r => r.name);
}

// Helper to build menu snapshot
function buildMenuSnapshot(permissionNames) {
    const has = p => permissionNames.includes(p);
    const mastersView = has('user:read') || has('product:read');
    const mastersAdd = has('user:create') || has('product:create');
    const mastersMod = has('user:update') || has('product:update');
    const mastersDel = has('user:delete') || has('product:delete');
    const salesView = has('sale:read') || has('sale:create');
    const invView = has('report:view:inventory');
    const repView = has('report:view:sales') || has('report:view:inventory');

    return {
        version: 1,
        generatedAt: new Date().toISOString(),
        windows: [
            { code: 'dashboard', rights: { view: true, add: false, modify: false, delete: false } },
            { code: 'pos',       rights: { view: has('sale:create'), add: has('sale:create'), modify: has('sale:cancel'), delete: false } },
            { code: 'sales',     rights: { view: salesView, add: has('sale:create'), modify: has('sale:cancel'), delete: false } },
            { code: 'inventory', rights: { view: invView, add: false, modify: false, delete: false } },
            { code: 'report',    rights: { view: repView, add: false, modify: false, delete: false } },
            { code: 'masters',   rights: { view: mastersView, add: mastersAdd, modify: mastersMod, delete: mastersDel } },
        ],
    };
}

// Helper to sanitize user object
function sanitizeUser(row) {
    const clone = { ...row };
    delete clone.password_hash;
    return clone;
}

class AuthService {
    async login({ username, password, ip, userAgent }) {
        const userQuery = `
            SELECT u.*, b.org_id
            FROM users u
            LEFT JOIN branches b ON u.default_branch_id = b.id
            WHERE u.username = ? AND u.is_active = TRUE AND u.is_deleted = FALSE
            LIMIT 1
        `;
        const [userRow] = await executeQuery(userQuery, [username]);
        if (!userRow) {
            throw new Error('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, userRow.password_hash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }
        
        const permissionNames = await getPermissionNamesForRole(userRow.role_id);
        const menuSnapshot = buildMenuSnapshot(permissionNames);
        
        const accessMs = parseDurationToMs(process.env.JWT_EXPIRES_IN, 3600_000);
        const refreshMs = parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 86_400_000);
        const expiresAt = new Date(Date.now() + accessMs).toISOString();
        const refreshExpiresAt = new Date(Date.now() + refreshMs).toISOString();

        const session = await createSession({
            user: userRow,
            ip,
            userAgent,
            org_id: userRow.org_id,
            role_id: userRow.role_id,
            default_branch_id: userRow.default_branch_id,
            permissionsSnapshot: permissionNames,
            menuSnapshot,
            expiresAt,
            refreshExpiresAt,
        });

        const accessToken = signAccessToken({ userId: userRow.id, sid: session.jti });
        
        await executeQuery('UPDATE users SET last_login = NOW() WHERE id = ?', [userRow.id]);

        const user = sanitizeUser(userRow);
        user.effectivePermissions = permissionNames;
        
        return { user, accessToken, refreshToken: session.refreshToken };
    }

    async refreshToken(token) {
        const rotated = await rotateRefreshToken(token);
        if (!rotated) {
            throw new Error('Invalid or expired refresh token');
        }
        const { session, newToken } = rotated;
        const accessToken = signAccessToken({ userId: session.user_id, sid: session.jti });
        return { accessToken, refreshToken: newToken };
    }

    async changePassword({ userId, currentPassword, newPassword }) {
        const [row] = await executeQuery('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (!row) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(currentPassword, row.password_hash);
        if (!isMatch) {
            throw new Error('Incorrect current password');
        }

        const salt = await bcrypt.genSalt(12);
        const newHash = await bcrypt.hash(newPassword, salt);
        await executeQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    }

    async logout(sessionId) {
        if (!sessionId) {
            throw new Error('No active session');
        }
        await revokeSessionBySid(sessionId, 'User logout');
    }

    async logoutAll(userId) {
        if (!userId) {
            throw new Error('No user to log out');
        }
        await revokeAllSessionsForUser(userId, 'User logout all');
    }
}

module.exports = new AuthService();

