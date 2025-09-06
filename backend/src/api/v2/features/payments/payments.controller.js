'use strict';

const { validationResult } = require('express-validator');
const Service = require('./payments.service');

class PaymentsController {
  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const user_id = Number(req.user?.id);
      const org_id = Number(req.user?.org_id || 1);
      const { sale_id, amount_paid, payment_method, payment_date, notes } = req.body;
      const result = await Service.recordPayment({ user_id, org_id, sale_id, amount_paid, payment_method, payment_date, notes });
      if (result.notFound) return res.status(404).json({ success: false, message: 'Sale not found.' });
      if (result.invalidAmount) return res.status(400).json({ success: false, message: 'Payment amount cannot exceed the balance amount.' });
      return res.status(201).json({ success: true, message: 'Payment recorded successfully.' });
    } catch (e) { next(e); }
  }

  async outstanding(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const branchId = req.branchId ? Number(req.branchId) : undefined;
      const { rows, total, page, limit } = await Service.getOutstandingSales({ org_id, page: req.query.page, limit: req.query.limit, search: req.query.search, branchId });
      res.status(200).json({ success: true, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: rows });
    } catch (e) { next(e); }
  }
}

module.exports = new PaymentsController();

