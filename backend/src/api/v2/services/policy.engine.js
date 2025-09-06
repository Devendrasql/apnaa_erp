'use strict';

const { executeQuery } = require('../../../../utils/database');

let CACHE = { at: 0, items: [] };
const TTL_MS = 30 * 1000;

async function loadPolicies(force = false) {
  const now = Date.now();
  if (!force && now - CACHE.at < TTL_MS) return CACHE.items;
  const rows = await executeQuery(
    `SELECT id, name, effect, conditions
       FROM abac_policies
      WHERE is_active = 1
      ORDER BY id ASC`
  );
  const items = rows.map(r => ({ id: r.id, name: r.name, effect: (r.effect || 'allow').toLowerCase(), conditions: safeParseJson(r.conditions, {}) }));
  CACHE = { at: now, items };
  return items;
}

function safeParseJson(s, fb) { try { return s ? JSON.parse(s) : fb; } catch { return fb; } }

function getPath(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function toSet(x) {
  if (!x) return new Set();
  if (x instanceof Set) return x;
  if (Array.isArray(x)) return new Set(x);
  return new Set([x]);
}

function evalNode(node, ctx) {
  if (!node || typeof node !== 'object') return true;
  if (node.all) return node.all.every(n => evalNode(n, ctx));
  if (node.any) return node.any.some(n => evalNode(n, ctx));

  if (node.equals) {
    const [a, b] = node.equals;
    return getPath(ctx, a) === getPath(ctx, b);
  }
  if (node.notEquals) {
    const [a, b] = node.notEquals;
    return getPath(ctx, a) !== getPath(ctx, b);
  }
  if (node.in) {
    const [valPath, arrPath] = node.in;
    const val = getPath(ctx, valPath);
    const arr = getPath(ctx, arrPath) || [];
    return Array.isArray(arr) && arr.includes(val);
  }
  if (node.hasAnyPermission) {
    const needed = toSet(node.hasAnyPermission);
    const perms = toSet(ctx.user?.permissions);
    for (const n of needed) if (perms.has(n)) return true;
    return false;
  }
  if (node.orgEquals) {
    const v = getPath(ctx, node.orgEquals) ?? node.orgEquals;
    return Number(ctx.user?.org_id) === Number(v);
  }
  if (node.branchEquals) {
    const v = getPath(ctx, node.branchEquals) ?? node.branchEquals;
    return Number(ctx.branchId) === Number(v);
  }
  return true;
}

function evaluate(policies, ctx) {
  // Deny overrides Allow if any deny matches; if at least one allow matches and no deny, allow.
  let allowedByAllow = false;
  for (const p of policies) {
    const ok = evalNode(p.conditions, ctx);
    if (!ok) continue;
    if (p.effect === 'deny') return { decision: 'deny', policy: p };
    if (p.effect === 'allow') allowedByAllow = true;
  }
  return { decision: allowedByAllow ? 'allow' : 'neutral' };
}

module.exports = {
  loadPolicies,
  evaluate,
};
