'use strict';

const { executeQuery } = require('../../../../../utils/database');

async function getStats() {
  const [productResult] = await executeQuery('SELECT COUNT(id) as totalProducts FROM product_variants WHERE is_deleted = FALSE');
  const [customerResult] = await executeQuery('SELECT COUNT(id) as totalCustomers FROM customers WHERE is_deleted = FALSE');
  const [todaySales] = await executeQuery("SELECT SUM(final_amount) as todaySales FROM sales WHERE DATE(sale_date) = CURDATE() AND is_deleted = FALSE");
  const [lowStock] = await executeQuery('SELECT COUNT(*) as lowStockCount FROM v_low_stock_products');
  return {
    totalProducts: productResult?.totalProducts || 0,
    totalCustomers: customerResult?.totalCustomers || 0,
    todaySales: todaySales?.todaySales || 0,
    lowStockCount: lowStock?.lowStockCount || 0,
  };
}

async function salesOverTime() {
  const rows = await executeQuery(
    `SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') as date, SUM(final_amount) as totalSales
       FROM sales
      WHERE sale_date >= CURDATE() - INTERVAL 7 DAY AND is_deleted = FALSE
      GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
      ORDER BY date ASC`
  );
  return rows;
}

async function topSelling() {
  const rows = await executeQuery(
    `SELECT CONCAT(p.name, ' ', COALESCE(pv.strength_label, '')) as productName,
            SUM(si.quantity) as totalQuantitySold
       FROM sale_items si
       JOIN product_variants pv ON si.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
      WHERE si.is_deleted = FALSE AND p.is_deleted = FALSE
      GROUP BY productName
      ORDER BY totalQuantitySold DESC
      LIMIT 5`
  );
  return rows;
}

async function recentSales() {
  const rows = await executeQuery(
    `SELECT s.id, s.invoice_number, s.final_amount as total_amount, s.sale_date,
            CONCAT(c.first_name, ' ', c.last_name) as customer_name
       FROM sales s
  LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.is_deleted = FALSE
      ORDER BY s.sale_date DESC
      LIMIT 5`
  );
  return rows;
}

module.exports = { getStats, salesOverTime, topSelling, recentSales };

