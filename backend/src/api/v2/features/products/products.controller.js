'use strict';

const Service = require('./products.service');

class ProductsController {
  async list(req, res, next) {
    try {
      const { rows, total, page, limit } = await Service.listProducts({ page: req.query.page, limit: req.query.limit, search: req.query.search });
      res.json({ success: true, data: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (e) { next(e); }
  }

  async getOne(req, res, next) {
    try {
      const id = Number(req.params.id);
      const data = await Service.getProductById(id);
      if (!data) return res.status(404).json({ success: false, message: 'Product not found.' });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async lookups(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const branch_id = req.query.branch_id ? Number(req.query.branch_id) : null;
      const data = await Service.getLookups({ org_id, branch_id });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async searchIngredients(req, res, next) {
    try {
      const search = String(req.query.search || '');
      const names = await Service.searchIngredients(search);
      res.json({ success: true, data: names });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const data = await require('./products.service').createProduct(req.body || {});
      res.status(201).json({ success: true, message: 'Product created successfully.', data });
    } catch (e) { if (e.status) return res.status(e.status).json({ success: false, message: e.message }); next(e); }
  }

  async update(req, res, next) {
    try {
      await require('./products.service').updateProductWrite(Number(req.params.id), req.body || {});
      res.json({ success: true, message: 'Product updated successfully.' });
    } catch (e) { if (e.status) return res.status(e.status).json({ success: false, message: e.message }); next(e); }
  }

  async remove(req, res, next) {
    try {
      const affected = await require('./products.service').deleteProductWrite(Number(req.params.id));
      if (!affected) return res.status(404).json({ success: false, message: 'Product not found.' });
      res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (e) { next(e); }
  }
}

module.exports = new ProductsController();
