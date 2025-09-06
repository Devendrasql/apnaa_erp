'use strict';

const Service = require('./reports.service');

class ReportsController {
  async dailySales(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const { date, branch_id } = req.query;
      if (!date) return res.status(400).json({ success: false, message: 'A specific date is required for the report.' });
      const { summary, paymentMethods, topProducts } = await Service.dailySales({ org_id, date, branch_id });
      res.json({ success: true, data: { report_date: date, branch_id: branch_id || 'All Branches', summary, payment_methods: paymentMethods, top_selling_products: topProducts } });
    } catch (e) { next(e); }
  }

  async inventory(req, res, next) {
    try {
      const { branch_id, report_type = 'all' } = req.query;
      const rows = await Service.inventoryReport({ branch_id, report_type });
      res.json({ success: true, count: rows.length, data: rows });
    } catch (e) { next(e); }
  }

  async productPerformance(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const { from_date, to_date, branch_id } = req.query;
      if (!from_date || !to_date) return res.status(400).json({ success: false, message: 'A date range (from_date and to_date) is required.' });
      const rows = await Service.productPerformance({ org_id, from_date, to_date, branch_id });
      res.json({ success: true, count: rows.length, data: rows });
    } catch (e) { next(e); }
  }
}

module.exports = new ReportsController();

