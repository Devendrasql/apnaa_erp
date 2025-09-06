'use strict';

const bcrypt = require('bcryptjs');
const { executeQuery, getConnection } = require('../../../../../utils/database');

async function listUsers({ page = 1, limit = 20, search }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (p - 1) * l;

  let baseQuery = `
    SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone,
           u.role_id, r.name as role_name, u.default_branch_id, u.is_active, b.name as branch_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
 LEFT JOIN branches b ON u.default_branch_id = b.id`;
  let countQuery = `SELECT COUNT(u.id) as total FROM users u`;

  const where = ['u.is_deleted = FALSE'];
  const params = [];
  if (search) {
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  const whereSql = ` WHERE ${where.join(' AND ')}`;
  const finalQuery = `${baseQuery}${whereSql} ORDER BY u.first_name, u.last_name ASC LIMIT ${l} OFFSET ${offset}`;
  const finalCount = countQuery + whereSql;

  const rows = await executeQuery(finalQuery, params);
  const [tot] = await executeQuery(finalCount, params);
  return { rows, total: tot.total || 0, page: p, limit: l };
}

async function getUserById(id) {
  const [user] = await executeQuery(
    'SELECT id, first_name, last_name, username, email, phone, role_id, default_branch_id, is_active FROM users WHERE id = ? AND is_deleted = FALSE',
    [id]
  );
  if (!user) return null;
  const accRows = await executeQuery(
    'SELECT branch_id FROM user_branch_access WHERE user_id = ?',
    [id]
  );
  user.accessible_branch_ids = accRows.map(r => r.branch_id);
  return user;
}

async function createUser({ first_name, last_name, username, email, password, phone, role_id, default_branch_id, accessible_branch_ids }) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [userResult] = await conn.execute(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, phone, role_id, default_branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, username, email, password_hash, phone || null, role_id, default_branch_id || null]
    );
    const userId = userResult.insertId;

    if (Array.isArray(accessible_branch_ids) && accessible_branch_ids.length) {
      const tuples = accessible_branch_ids.map(bid => [userId, Number(bid)]);
      const placeholders = tuples.map(() => '(?, ?)').join(', ');
      await conn.execute(
        `INSERT INTO user_branch_access (user_id, branch_id) VALUES ${placeholders}`,
        tuples.flat()
      );
    }

    await conn.commit();
    return { id: userId };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

async function updateUser(id, { first_name, last_name, username, email, phone, role_id, default_branch_id, is_active, password, accessible_branch_ids }) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const fields = [
      'first_name = ?', 'last_name = ?', 'username = ?', 'email = ?', 'phone = ?',
      'role_id = ?', 'default_branch_id = ?', 'is_active = ?'
    ];
    const params = [
      first_name, last_name, username, email, phone || null,
      role_id, default_branch_id || null, is_active ? 1 : 0
    ];
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      fields.push('password_hash = ?');
      params.push(hash);
    }
    params.push(id);
    await conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`, params);

    await conn.execute('DELETE FROM user_branch_access WHERE user_id = ?', [id]);
    if (Array.isArray(accessible_branch_ids) && accessible_branch_ids.length) {
      const tuples = accessible_branch_ids.map(bid => [id, Number(bid)]);
      const placeholders = tuples.map(() => '(?, ?)').join(', ');
      await conn.execute(`INSERT INTO user_branch_access (user_id, branch_id) VALUES ${placeholders}`, tuples.flat());
    }

    await conn.commit();
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

async function softDeleteUser(id) {
  const result = await executeQuery('UPDATE users SET is_deleted = TRUE, is_active = FALSE WHERE id = ?', [id]);
  return result.affectedRows;
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  softDeleteUser,
};

