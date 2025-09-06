'use strict';

const { getConnection, executeQuery } = require('../../../../../utils/database');

async function recordPayment({ user_id, org_id, sale_id, amount_paid, payment_method, payment_date, notes }) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    // Lock the sale row and ensure it belongs to the same org via branch
    const [sales] = await conn.execute(
      `SELECT s.*
         FROM sales s
         JOIN branches b ON b.id = s.branch_id
        WHERE s.id = ? AND s.is_deleted = FALSE AND b.org_id = ?
        FOR UPDATE`,
      [sale_id, org_id]
    );
    if (!sales.length) {
      await conn.rollback();
      return { notFound: true };
    }
    const sale = sales[0];

    // Use sales.balance_amount if available
    const saleFinal = Number(sale.final_amount);
    const saleBalance = sale.balance_amount != null ? Number(sale.balance_amount) : saleFinal;
    if (Number(amount_paid) > saleBalance) {
      await conn.rollback();
      return { invalidAmount: true };
    }

    // Try to insert into customer_payments; ignore if table missing
    try {
      await conn.execute(
        `INSERT INTO customer_payments (sale_id, amount_paid, payment_method, payment_date, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sale_id, amount_paid, payment_method, payment_date, notes || null, user_id]
      );
    } catch (e) {
      if (e?.code !== 'ER_NO_SUCH_TABLE') throw e;
    }

    // Update balance if column exists
    try {
      await conn.execute(
        'UPDATE sales SET balance_amount = GREATEST(balance_amount - ?, 0) WHERE id = ?',
        [amount_paid, sale_id]
      );
    } catch (e) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') throw e;
    }

    await conn.commit();
    return { ok: true };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

async function getOutstandingSales({ org_id, page = 1, limit = 20, search, branchId }) {
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const offset = (p - 1) * l;

  const where = ['s.is_deleted = FALSE', 's.final_amount > 0', 'b.org_id = ?'];
  const params = [org_id];
  if (branchId) { where.push('s.branch_id = ?'); params.push(Number(branchId)); }
  if (search) { where.push('s.invoice_number LIKE ?'); params.push(`%${search}%`); }
  const w = ` WHERE ${where.join(' AND ')}`;

  const rows = await executeQuery(
    `SELECT s.id, s.invoice_number, s.sale_date, s.final_amount,
            0 AS paid_amount,
            s.final_amount AS balance_amount,
            CONCAT(c.first_name, ' ', c.last_name) as customer_name,
            b.name as branch_name
       FROM sales s
  LEFT JOIN customers c ON s.customer_id = c.id
  LEFT JOIN branches b ON s.branch_id = b.id
     ${w}
   ORDER BY s.sale_date ASC
      LIMIT ${l} OFFSET ${offset}`,
    params
  );

  const [tot] = await executeQuery(
    `SELECT COUNT(*) AS total
       FROM sales s
       JOIN branches b ON b.id = s.branch_id
     ${w}`,
    params
  );

  return { rows, total: tot.total || 0, page: p, limit: l };
}

module.exports = {
  recordPayment,
  getOutstandingSales,
};
