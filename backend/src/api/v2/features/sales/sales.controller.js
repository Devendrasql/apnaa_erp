'use strict';

const Service = require('./sales.service');

class SalesController {
  async list(req, res, next) {
    try {
      const { rows, total, page, limit } = await Service.listSales({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        branch_id: req.query.branch_id,
        customer_id: req.query.customer_id,
      });
      res.json({ success: true, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: rows });
    } catch (e) { next(e); }
  }

  async getOne(req, res, next) {
    try {
      const id = Number(req.params.id);
      const sale = await Service.getSaleById(id);
      if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
      res.json({ success: true, data: sale });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const cashier_id = Number(req.user?.id);
      const data = await Service.createSale(req.body || {}, cashier_id);
      res.status(201).json({ success: true, message: 'Sale completed successfully', data });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ success: false, message: e.message });
      next(e);
    }
  }

  async cancel(req, res, next) {
    try {
      const id = Number(req.params.id);
      const result = await Service.cancelSale(id, Number(req.user?.id));
      if (result?.notFound) return res.status(404).json({ success: false, message: 'Sale not found' });
      if (result?.alreadyCancelled) return res.status(200).json({ success: true, message: 'Sale already cancelled' });
      res.json({ success: true, message: 'Sale cancelled and stock restored' });
    } catch (e) { next(e); }
  }
}

module.exports = new SalesController();
