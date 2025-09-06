'use strict';

const { validationResult } = require('express-validator');
const Service = require('./purchases.service');

class PurchasesController {
  async list(req, res, next) {
    try {
      const { rows, total, page, limit } = await Service.listPurchases({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        branch_id: req.query.branch_id,
        supplier_id: req.query.supplier_id,
      });
      res.json({ success: true, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: rows });
    } catch (e) { next(e); }
  }

  async getOne(req, res, next) {
    try {
      const id = Number(req.params.id);
      const data = await Service.getPurchaseById(id);
      if (!data) return res.status(404).json({ success: false, message: 'Purchase not found.' });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const created_by = Number(req.user?.id);
      const { id } = await Service.createPurchase(req.body, created_by);
      res.status(201).json({ success: true, message: 'Purchase created', data: { id } });
    } catch (e) { next(e); }
  }

  async postToStock(req, res, next) {
    try {
      const id = Number(req.params.id);
      const posted_by = Number(req.user?.id);
      const result = await Service.postToStock(id, posted_by);
      if (result?.notFoundOrPosted) return res.status(404).json({ success: false, message: 'Purchase not found or already posted.' });
      res.json({ success: true, message: 'Purchase posted to stock successfully.' });
    } catch (e) { next(e); }
  }
}

module.exports = new PurchasesController();

