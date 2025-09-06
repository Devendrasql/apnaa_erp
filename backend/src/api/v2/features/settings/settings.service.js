'use strict';

const { executeQuery, executeTransaction } = require('../../../../../utils/database');

async function getEditableSettings() {
  const rows = await executeQuery(
    `SELECT setting_key, setting_value, setting_type, description
       FROM settings
      WHERE is_editable = TRUE AND is_deleted = FALSE`
  );
  const map = {};
  for (const r of rows) {
    map[r.setting_key] = {
      value: r.setting_value,
      type: r.setting_type,
      description: r.description,
    };
  }
  return map;
}

async function updateSettings(obj = {}) {
  const entries = Object.entries(obj);
  if (!entries.length) return 0;
  const queries = entries.map(([key, val]) => ({
    query: `UPDATE settings SET setting_value = ? WHERE setting_key = ? AND is_editable = TRUE`,
    params: [val, key],
  }));
  await executeTransaction(queries);
  return entries.length;
}

module.exports = {
  getEditableSettings,
  updateSettings,
};

