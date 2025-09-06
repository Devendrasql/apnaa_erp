'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function dailySales({ org_id, date, branch_id }) {
  if (!date) throw new Error('date required');
  const where = ['DATE(s.sale_date) = ?', 's.is_deleted = FALSE', 'b.org_id = ?'];
  const params = [date, org_id];
  if (branch_id) { where.push('s.branch_id = ?'); params.push(branch_id); }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [summary] = await executeQuery(
    `SELECT COUNT(s.id) as total_transactions,
            COALESCE(SUM(s.final_amount), 0) as total_revenue,
            COALESCE(SUM(s.total_items), 0) as total_items_sold,
            COALESCE(AVG(s.final_amount), 0) as average_sale_value
       FROM sales s
       JOIN branches b ON b.id = s.branch_id
     ${whereSql}`,
    params
  );

  const paymentMethods = await executeQuery(
    `SELECT s.payment_method,
            COUNT(s.id) as transaction_count,
            COALESCE(SUM(s.final_amount), 0) as total_amount
       FROM sales s
       JOIN branches b ON b.id = s.branch_id
     ${whereSql}
     GROUP BY s.payment_method`,
    params
  );

  const topProducts = await executeQuery(
    `SELECT p.name as product_name,
            p.sku,
            SUM(si.quantity) as total_quantity_sold,
            SUM(si.line_total) as total_revenue
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN branches b ON b.id = s.branch_id
       JOIN products p ON si.product_id = p.id
     ${whereSql}
     GROUP BY p.id, p.name, p.sku
     ORDER BY total_quantity_sold DESC
     LIMIT 5`,
    params
  );

  return { summary, paymentMethods, topProducts };
}

async function inventoryReport({ branch_id, report_type = 'all' }) {
  let baseQuery = `SELECT * FROM v_current_stock`;
  const params = [];
  if (report_type === 'low_stock') baseQuery = `SELECT * FROM v_low_stock_products`;
  else if (report_type === 'expiring_soon') baseQuery = `SELECT * FROM v_expiring_soon`;
  if (branch_id) { baseQuery += ` WHERE branch_id = ?`; params.push(branch_id); }
  const rows = await executeQuery(baseQuery, params);
  return rows;
}

async function productPerformance({ org_id, from_date, to_date, branch_id }) {
  if (!from_date || !to_date) throw new Error('from_date and to_date required');
  const where = ['DATE(s.sale_date) BETWEEN ? AND ?', 's.is_deleted = FALSE', 'b.org_id = ?'];
  const params = [from_date, to_date, org_id];
  if (branch_id) { where.push('s.branch_id = ?'); params.push(branch_id); }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const rows = await executeQuery(
    `SELECT p.id as product_id,
            p.name as product_name,
            p.sku,
            SUM(si.quantity) as total_quantity_sold,
            SUM(si.line_total) as total_revenue,
            (SUM(si.line_total) - SUM(si.quantity * p.purchase_price)) as estimated_profit
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN branches b ON b.id = s.branch_id
       JOIN products p ON si.product_id = p.id
     ${whereSql}
     GROUP BY p.id, p.name, p.sku
     ORDER BY total_revenue DESC`,
    params
  );
  return rows;
}

module.exports = {
  dailySales,
  inventoryReport,
  productPerformance,
};

