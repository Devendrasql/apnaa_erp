'use strict';

const { validationResult } = require('express-validator');
const Service = require('./inventory.service');

class InventoryController {
  async stock(req, res, next) {
    try {
      const { rows, total, page, limit } = await Service.getStockLevels({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        branch_id: req.query.branch_id,
        expiring_soon: req.query.expiring_soon,
      });
      res.json({ success: true, count: rows.length, pagination: { total, limit, page, totalPages: Math.ceil(total / limit) }, data: rows });
    } catch (e) { next(e); }
  }

  async addStock(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const affected = await Service.addStock(req.body);
      res.json({ success: true, message: 'Stock updated successfully', data: { affectedRows: affected } });
    } catch (e) { next(e); }
  }

  async adjustStock(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const result = await Service.adjustStock({ stock_id: req.body.stock_id, quantity_change: req.body.quantity_change });
      if (result?.notFound) return res.status(404).json({ success: false, message: 'Stock item not found.' });
      res.json({ success: true, message: 'Stock adjusted successfully.' });
    } catch (e) { next(e); }
  }
}

module.exports = new InventoryController();

