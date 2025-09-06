'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function ensureUniqueCategoryCode(orgId, name) {
  const letters = String(name || '')
    .normalize('NFKD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  const base = (letters || 'CAT').slice(0, 3).padEnd(3, 'X');

  let code = base;
  let rows = await executeQuery(
    'SELECT id FROM categories WHERE org_id = ? AND code = ? LIMIT 1',
    [orgId, code]
  );
  if (!rows.length) return code;
  for (let i = 1; i < 1000; i++) {
    const tryCode = `${base}${String(i).padStart(3, '0')}`;
    const r = await executeQuery(
      'SELECT id FROM categories WHERE org_id = ? AND code = ? LIMIT 1',
      [orgId, tryCode]
    );
    if (!r.length) return tryCode;
  }
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}

async function listCategories(orgId) {
  const query = `
    SELECT c1.*, c2.name AS parent_name
      FROM categories c1
 LEFT JOIN categories c2 ON c1.parent_id = c2.id
     WHERE c1.is_deleted = FALSE AND c1.org_id = ?
  ORDER BY c1.name ASC
  `;
  return executeQuery(query, [orgId]);
}

async function createCategory({ org_id, name, parent_id = null, is_active = true }) {
  const code = await ensureUniqueCategoryCode(org_id, name);
  const query = `
    INSERT INTO categories (org_id, code, name, parent_id, is_active)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [org_id, code, name, parent_id, is_active ? 1 : 0];
  const result = await executeQuery(query, params);
  return { id: result.insertId };
}

async function updateCategory(id, { org_id, name, parent_id = null, is_active = true }) {
  const query = `
    UPDATE categories
       SET name = ?, parent_id = ?, is_active = ?
     WHERE id = ? AND org_id = ? AND is_deleted = FALSE
  `;
  const params = [name, parent_id, is_active ? 1 : 0, id, org_id];
  const result = await executeQuery(query, params);
  return result.affectedRows;
}

async function softDeleteCategory(id, org_id) {
  const query = `UPDATE categories SET is_deleted = TRUE, is_active = FALSE WHERE id = ? AND org_id = ?`;
  const result = await executeQuery(query, [id, org_id]);
  return result.affectedRows;
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  softDeleteCategory,
};
