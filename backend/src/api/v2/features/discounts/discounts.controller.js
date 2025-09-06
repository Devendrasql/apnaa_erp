'use strict';

const { validationResult } = require('express-validator');
const Service = require('./discounts.service');

class DiscountsController {
  async list(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const branch_id = req.query.branch_id ? Number(req.query.branch_id) : undefined;
      const rows = await Service.listDiscounts({ org_id, branch_id });
      res.json({ success: true, data: rows });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const org_id = Number(req.user?.org_id || 1);
      await Service.createDiscount({ org_id, ...req.body });
      res.status(201).json({ success: true, message: 'Standard discount created' });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const org_id = Number(req.user?.org_id || 1);
      const id = Number(req.params.id);
      const affected = await Service.updateDiscount(id, org_id, req.body);
      if (!affected) return res.json({ success: true, message: 'No changes' });
      res.json({ success: true, message: 'Standard discount updated' });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const org_id = Number(req.user?.org_id || 1);
      const id = Number(req.params.id);
      await Service.deactivateDiscount(id, org_id);
      res.json({ success: true, message: 'Standard discount deactivated' });
    } catch (e) { next(e); }
  }
}

module.exports = new DiscountsController();

