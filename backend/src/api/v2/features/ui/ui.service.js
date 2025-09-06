'use strict';

const { executeQuery } = require('../../../../../utils/database');
const { buildForUser } = require('../../../../../utils/menuBuilder');

async function getMenus(user) {
  const tree = await buildForUser(user);
  return tree;
}

async function getPermissions(user) {
  const list = Array.from(user?.permissions || []);
  return list;
}

async function getFeatures(user) {
  const { org_id, role_id } = user || {};
  const defaults = {
    enable_online_orders: true,
    enable_purchase_ocr: true,
    enable_delivery: true,
  };
  let rows = [];
  try {
    rows = await executeQuery(
      `SELECT \`key\`, is_enabled, org_id, role_id
         FROM feature_flags
        WHERE (org_id = ? OR org_id IS NULL)
          AND (role_id = ? OR role_id IS NULL)
        ORDER BY (
          CASE
            WHEN org_id IS NOT NULL AND role_id IS NOT NULL THEN 1
            WHEN org_id IS NOT NULL AND role_id IS NULL THEN 2
            WHEN org_id IS NULL AND role_id IS NOT NULL THEN 3
            ELSE 4
          END
        )`,
      [org_id ?? null, role_id ?? null]
    );
  } catch (_) {
    // table may not exist; use defaults only
  }
  const flags = { ...defaults };
  for (const r of rows) flags[r.key] = !!r.is_enabled;
  return flags;
}

module.exports = {
  getMenus,
  getPermissions,
  getFeatures,
};

