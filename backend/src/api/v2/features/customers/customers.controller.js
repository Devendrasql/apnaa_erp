'use strict';

const { validationResult } = require('express-validator');
const Service = require('./customers.service');

class CustomersController {
  async list(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 0) || undefined;
      const { rows, total, page, limit } = await Service.listCustomers({ page: req.query.page, limit: req.query.limit, search: req.query.search, org_id });
      res.json({ success: true, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: rows });
    } catch (e) { next(e); }
  }

  async getOne(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 0) || undefined;
      const id = Number(req.params.id);
      const c = await Service.getCustomer(id, org_id);
      if (!c) return res.status(404).json({ success: false, message: 'Customer not found.' });
      res.json({ success: true, data: c });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const org_id = Number(req.user?.org_id || process.env.DEFAULT_ORG_ID || 1);
      const { id } = await Service.createCustomer({ org_id, ...req.body });
      res.status(201).json({ success: true, message: 'Customer created successfully.', data: { id } });
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Customer with this phone number already exists.' });
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const org_id = Number(req.user?.org_id || 0) || undefined;
      const id = Number(req.params.id);
      const affected = await Service.updateCustomer(id, org_id, req.body);
      if (!affected) return res.status(404).json({ success: false, message: 'Customer not found or no changes made.' });
      res.json({ success: true, message: 'Customer updated successfully.' });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 0) || undefined;
      const id = Number(req.params.id);
      const affected = await Service.softDeleteCustomer(id, org_id);
      if (!affected) return res.status(404).json({ success: false, message: 'Customer not found.' });
      res.json({ success: true, message: 'Customer deleted successfully.' });
    } catch (e) { next(e); }
  }
}

module.exports = new CustomersController();

