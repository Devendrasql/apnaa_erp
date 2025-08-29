'use strict';

const crypto = require('crypto');
const { executeQuery } = require('../utils/database');

const ACCESS_TTL_SEC  = Number(process.env.ACCESS_TOKEN_TTL_SEC  || 3600);          // 1 hour
const REFRESH_TTL_SEC = Number(process.env.REFRESH_TOKEN_TTL_SEC || 1 * 24 * 3600); // 7 days

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const addSeconds = (d, sec) => new Date(d.getTime() + Number(sec) * 1000);

// JS Date → "YYYY-MM-DD HH:MM:SS"
function toSqlDatetime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function safeParseJson(s, fallback) { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } }

/**
 * Create a persistent session.
 * Inserts created_at, last_seen_at, expires_at, refresh_expires_at,
 * plus snapshots (permissions + menu) at login.
 */
async function createSession({
  user,
  ip,
  userAgent,
  org_id = null,
  role_id = null,
  default_branch_id = null,
  permissionsSnapshot = [],
  menuSnapshot = null,
  accessTtlSec = ACCESS_TTL_SEC,
  refreshTtlSec = REFRESH_TTL_SEC,
}) {
  const now = new Date();
  const accessExp  = addSeconds(now, accessTtlSec);
  const refreshExp = addSeconds(now, refreshTtlSec);

  const jti = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshHash  = sha256(refreshToken);

  const sql = `
    INSERT INTO auth_sessions
      (jti, user_id, org_id, role_id, default_branch_id,
       ip, user_agent,
       created_at, last_seen_at, expires_at,
       refresh_token_hash, refresh_expires_at,
       permissions_snapshot, menu_snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    jti,
    user.id,
    org_id,
    role_id,
    default_branch_id,
    ip || null,
    userAgent || null,
    toSqlDatetime(now),
    toSqlDatetime(now),              // last_seen_at initial = now
    toSqlDatetime(refreshExp),       // overall session expiry = refresh expiry
    refreshHash,
    toSqlDatetime(refreshExp),
    JSON.stringify(permissionsSnapshot || []),
    menuSnapshot ? JSON.stringify(menuSnapshot) : null,
  ];

  await executeQuery(sql, params);

  return {
    jti,
    user_id: user.id,
    org_id,
    role_id,
    default_branch_id,
    refreshToken,
    refreshExpiresAt: refreshExp,
  };
}

/** Validate a session id (sid / jti). */
async function findValidSessionBySid(sid) {
  if (!sid) return null;
  const rows = await executeQuery(
    `
    SELECT jti, user_id, org_id, role_id, default_branch_id,
           permissions_snapshot, menu_snapshot,
           refresh_expires_at, revoked_at, revoke_reason, last_seen_at
      FROM auth_sessions
     WHERE jti = ?
       AND revoked_at IS NULL
       AND refresh_expires_at > NOW()
     LIMIT 1
    `,
    [sid]
  );
  const row = rows?.[0];
  if (!row) return null;

  return {
    jti: row.jti,
    user_id: row.user_id,
    org_id: row.org_id,
    role_id: row.role_id,
    default_branch_id: row.default_branch_id,
    permissions_snapshot: safeParseJson(row.permissions_snapshot, []),
    menu_snapshot:        safeParseJson(row.menu_snapshot, null),
    refresh_expires_at:   row.refresh_expires_at,
    last_seen_at:         row.last_seen_at,
    revoked_at:           row.revoked_at,
    revoke_reason:        row.revoke_reason,
  };
}

/** Update last_seen_at on each authenticated request. */
async function touchSessionLastSeen(sid) {
  if (!sid) return;
  await executeQuery(
    `UPDATE auth_sessions SET last_seen_at = NOW() WHERE jti = ? LIMIT 1`,
    [sid]
  );
}

/** Revoke (logout) a session with optional reason. */
async function revokeSessionBySid(sid, reason = null) {
  if (!sid) return;
  await executeQuery(
    `UPDATE auth_sessions SET revoked_at = NOW(), revoke_reason = ? WHERE jti = ? LIMIT 1`,
    [reason, sid]
  );
}

/** Rotate refresh token in-place (refresh flow). */
async function rotateRefreshToken(refreshToken) {
  if (!refreshToken) return null;
  const oldHash = sha256(refreshToken);

  const rows = await executeQuery(
    `
    SELECT jti, user_id, org_id, role_id, default_branch_id,
           permissions_snapshot, menu_snapshot
      FROM auth_sessions
     WHERE refresh_token_hash = ?
       AND revoked_at IS NULL
       AND refresh_expires_at > NOW()
     LIMIT 1
    `,
    [oldHash]
  );
  const row = rows?.[0];
  if (!row) return null;

  const newToken = crypto.randomBytes(32).toString('hex');
  const newHash  = sha256(newToken);
  const newExp   = toSqlDatetime(addSeconds(new Date(), REFRESH_TTL_SEC));

  await executeQuery(
    `
    UPDATE auth_sessions
       SET refresh_token_hash = ?,
           refresh_expires_at = ?
     WHERE jti = ?
     LIMIT 1
    `,
    [newHash, newExp, row.jti]
  );

  return {
    session: {
      jti: row.jti,
      user_id: row.user_id,
      org_id: row.org_id,
      role_id: row.role_id,
      default_branch_id: row.default_branch_id,
      permissions_snapshot: safeParseJson(row.permissions_snapshot, []),
      menu_snapshot:        safeParseJson(row.menu_snapshot, null),
    },
    newToken,
  };
}

module.exports = {
  createSession,
  findValidSessionBySid,
  touchSessionLastSeen,
  revokeSessionBySid,
  rotateRefreshToken,
};












// 'use strict';

// const crypto = require('crypto');
// const { executeQuery } = require('../utils/database');

// // ------------------------------------------------------------------
// // Config (override in .env if desired)
// // ------------------------------------------------------------------
// const ACCESS_TTL_SEC  = Number(process.env.ACCESS_TOKEN_TTL_SEC  || 3600);          // 1 hour
// const REFRESH_TTL_SEC = Number(process.env.REFRESH_TOKEN_TTL_SEC || 7 * 24 * 3600); // 7 days

// // ------------------------------------------------------------------
// // Helpers
// // ------------------------------------------------------------------
// function sha256(s) {
//   return crypto.createHash('sha256').update(String(s)).digest('hex');
// }

// function addSeconds(date, sec) {
//   return new Date(date.getTime() + Number(sec) * 1000);
// }

// // JS Date → "YYYY-MM-DD HH:MM:SS"
// function toSqlDatetime(d) {
//   const pad = (n) => String(n).padStart(2, '0');
//   const yyyy = d.getFullYear();
//   const mm = pad(d.getMonth() + 1);
//   const dd = pad(d.getDate());
//   const hh = pad(d.getHours());
//   const mi = pad(d.getMinutes());
//   const ss = pad(d.getSeconds());
//   return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
// }

// function safeParseJson(s, fallback) {
//   try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
// }

// // ------------------------------------------------------------------
// // Public API
// // ------------------------------------------------------------------

// /**
//  * Create a persistent session row.
//  * Returns { jti, refreshToken, refreshExpiresAt, ... }.
//  *
//  * Table `auth_sessions` columns used:
//  *   jti (PK), user_id, org_id, role_id, default_branch_id,
//  *   ip, user_agent, created_at, expires_at,
//  *   refresh_token_hash, refresh_expires_at,
//  *   permissions_snapshot (TEXT/JSON), menu_snapshot (TEXT/JSON),
//  *   revoked_at (nullable), revoke_reason (nullable)
//  */
// async function createSession({
//   user,
//   ip,
//   userAgent,
//   org_id = null,
//   role_id = null,
//   default_branch_id = null,
//   permissionsSnapshot = [],
//   menuSnapshot = null,
//   accessTtlSec = ACCESS_TTL_SEC,
//   refreshTtlSec = REFRESH_TTL_SEC,
// }) {
//   const now = new Date();
//   const accessExp  = addSeconds(now, accessTtlSec);
//   const refreshExp = addSeconds(now, refreshTtlSec);

//   const jti = crypto.randomUUID();
//   const refreshToken = crypto.randomBytes(32).toString('hex'); // opaque token
//   const refreshHash  = sha256(refreshToken);

//   const sql = `
//     INSERT INTO auth_sessions
//       (jti, user_id, org_id, role_id, default_branch_id,
//        ip, user_agent, created_at, expires_at,
//        refresh_token_hash, refresh_expires_at,
//        permissions_snapshot, menu_snapshot)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;

//   const params = [
//     jti,
//     user.id,
//     org_id,
//     role_id,
//     default_branch_id,
//     ip || null,
//     userAgent || null,
//     toSqlDatetime(now),
//     // Store overall session lifetime in expires_at (align with refresh)
//     toSqlDatetime(refreshExp),
//     refreshHash,
//     toSqlDatetime(refreshExp), // ✅ never '0000-00-00 00:00:00'
//     JSON.stringify(permissionsSnapshot || []),
//     menuSnapshot ? JSON.stringify(menuSnapshot) : null,
//   ];

//   await executeQuery(sql, params);

//   return {
//     jti,
//     user_id: user.id,
//     org_id,
//     role_id,
//     default_branch_id,
//     refreshToken,
//     refreshExpiresAt: refreshExp,
//   };
// }

// /**
//  * Find a valid session by SID (JTI) for access-token checks.
//  * Valid = exists, not revoked, refresh_expires_at > NOW()
//  */
// async function findValidSessionBySid(sid) {
//   if (!sid) return null;
//   const rows = await executeQuery(
//     `
//     SELECT jti, user_id, org_id, role_id, default_branch_id,
//            permissions_snapshot, menu_snapshot,
//            refresh_expires_at, revoked_at
//       FROM auth_sessions
//      WHERE jti = ?
//        AND revoked_at IS NULL
//        AND refresh_expires_at > NOW()
//      LIMIT 1
//     `,
//     [sid]
//   );
//   const row = rows?.[0];
//   if (!row) return null;

//   return {
//     jti: row.jti,
//     user_id: row.user_id,
//     org_id: row.org_id,
//     role_id: row.role_id,
//     default_branch_id: row.default_branch_id,
//     permissions_snapshot: safeParseJson(row.permissions_snapshot, []),
//     menu_snapshot:        safeParseJson(row.menu_snapshot, null),
//     refresh_expires_at:   row.refresh_expires_at,
//   };
// }

// /**
//  * Rotate refresh token (return { session, newToken }) or null if invalid.
//  */
// async function rotateRefreshToken(refreshToken) {
//   if (!refreshToken) return null;
//   const oldHash = sha256(refreshToken);

//   const rows = await executeQuery(
//     `
//     SELECT jti, user_id, org_id, role_id, default_branch_id,
//            permissions_snapshot, menu_snapshot,
//            refresh_expires_at, revoked_at
//       FROM auth_sessions
//      WHERE refresh_token_hash = ?
//        AND revoked_at IS NULL
//        AND refresh_expires_at > NOW()
//      LIMIT 1
//     `,
//     [oldHash]
//   );
//   const row = rows?.[0];
//   if (!row) return null;

//   // rotate in place
//   const newToken = crypto.randomBytes(32).toString('hex');
//   const newHash  = sha256(newToken);
//   const newExp   = addSeconds(new Date(), REFRESH_TTL_SEC);

//   await executeQuery(
//     `
//     UPDATE auth_sessions
//        SET refresh_token_hash = ?,
//            refresh_expires_at = ?
//      WHERE jti = ?
//      LIMIT 1
//     `,
//     [newHash, toSqlDatetime(newExp), row.jti]
//   );

//   const session = {
//     jti: row.jti,
//     user_id: row.user_id,
//     org_id: row.org_id,
//     role_id: row.role_id,
//     default_branch_id: row.default_branch_id,
//     permissions_snapshot: safeParseJson(row.permissions_snapshot, []),
//     menu_snapshot:        safeParseJson(row.menu_snapshot, null),
//   };

//   return { session, newToken };
// }

// /** Revoke a session by SID (e.g., logout). */
// async function revokeSessionBySid(sid, reason = null) {
//   if (!sid) return;
//   await executeQuery(
//     `UPDATE auth_sessions SET revoked_at = NOW(), revoke_reason = ? WHERE jti = ? LIMIT 1`,
//     [reason, sid]
//   );
// }

// module.exports = {
//   createSession,
//   findValidSessionBySid,   // ✅ exported
//   rotateRefreshToken,
//   revokeSessionBySid,
// };
