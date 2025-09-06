'use strict';

const { validationResult } = require('express-validator');
const Service = require('./brands.service');

class BrandsController {
  async list(req, res, next) {
    try {
      const orgId = Number(req.user?.org_id || 1);
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);
      const search = (req.query.search || '').trim();
      const includeInactive = String(req.query.include_inactive || 'false') === 'true';
      const { data, total } = await Service.listManufacturers({ orgId, page, limit, search, includeInactive });
      res.json({ success: true, data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (e) { next(e); }
  }

  async get(req, res, next) {
    try {
      const orgId = Number(req.user?.org_id || 1);
      const id = parseInt(req.params.id, 10);
      const data = await Service.getManufacturer({ orgId, id });
      if (!data) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const orgId = Number(req.user?.org_id || 1);
      const { name, category = null, is_active = true, brands = [] } = req.body;
      const { id } = await Service.createManufacturerWithBrands({ orgId, name, category, is_active, brands });
      res.status(201).json({ success: true, message: 'Created', data: { id } });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const orgId = Number(req.user?.org_id || 1);
      const id = parseInt(req.params.id, 10);
      const { name, category, is_active, brands = [] } = req.body;
      await Service.updateManufacturerWithBrands({ orgId, id, name, category, is_active, brands });
      res.json({ success: true, message: 'Updated' });
    } catch (e) { next(e); }
  }

  async toggleActive(req, res, next) {
    try {
      const orgId = Number(req.user?.org_id || 1);
      const id = parseInt(req.params.id, 10);
      const { is_active } = req.body;
      await Service.toggleManufacturerActive({ orgId, id, is_active });
      res.json({ success: true, message: 'Status updated' });
    } catch (e) { next(e); }
  }

  async import(req, res, next) {
    try {
      const orgId = Number(req.user?.org_id || 1);
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      const summary = await Service.importManufacturers({ orgId, rows });
      res.status(201).json({ success: true, summary });
    } catch (e) { next(e); }
  }
}

module.exports = new BrandsController();

