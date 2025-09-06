'use strict';

const { validationResult } = require('express-validator');
const Service = require('./suppliers.service');

class SuppliersController {
  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const org_id = Number(req.user?.org_id || 1);
      const data = await Service.createSupplier({ org_id, ...req.body });
      res.status(201).json({ success: true, message: 'Supplier created successfully.', data });
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Supplier with this code already exists.' });
      next(e);
    }
  }

  async list(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const { rows, total, page, limit } = await Service.listSuppliers({ org_id, page: req.query.page, limit: req.query.limit, search: req.query.search });
      res.status(200).json({ success: true, count: rows.length, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: rows });
    } catch (e) { next(e); }
  }

  async getOne(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const id = Number(req.params.id);
      const row = await Service.getSupplier({ org_id, id });
      if (!row) return res.status(404).json({ success: false, message: 'Supplier not found.' });
      res.json({ success: true, data: row });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const org_id = Number(req.user?.org_id || 1);
      const id = Number(req.params.id);
      const affected = await Service.updateSupplier({ org_id, id, ...req.body });
      if (!affected) return res.status(404).json({ success: false, message: 'Supplier not found or no changes made.' });
      res.json({ success: true, message: 'Supplier updated successfully.' });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const id = Number(req.params.id);
      const affected = await Service.softDeleteSupplier({ org_id, id });
      if (!affected) return res.status(404).json({ success: false, message: 'Supplier not found.' });
      res.json({ success: true, message: 'Supplier deleted successfully.' });
    } catch (e) { next(e); }
  }

  async byGST(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const gst_number = String(req.params.gst_number || '').trim();
      const row = await Service.getSupplierByGST({ org_id, gst_number });
      if (!row) return res.status(404).json({ success: false, message: 'Supplier not found for this GST number.' });
      res.json({ success: true, data: row });
    } catch (e) { next(e); }
  }
}

module.exports = new SuppliersController();

