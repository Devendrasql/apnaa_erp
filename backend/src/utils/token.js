// utils/token.js
const jwt = require('jsonwebtoken');

const ACCESS_TTL_SEC = Number(process.env.ACCESS_TOKEN_TTL_SEC || 3600);       // 1h
const ISSUER = process.env.JWT_ISSUER || 'apnaa-erp';
const AUDIENCE = process.env.JWT_AUDIENCE || 'apnaa-erp-web';

function signAccessToken({ userId, org_id, role_id, sid }) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET missing');
  const payload = { userId, org_id, role_id, sid }; // keep claims minimal
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TTL_SEC,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

module.exports = {
  signAccessToken,
  ACCESS_TTL_SEC,
};
