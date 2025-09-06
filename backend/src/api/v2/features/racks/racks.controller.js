'use strict';

const { validationResult } = require('express-validator');
const Service = require('./racks.service');
const logger = require('../../../../../utils/logger');

class RacksController {
  async list(req, res, next) {
    try {
      const orgId = req.user?.org_id || 1;
      const branchId = req.query.branch_id ? Number(req.query.branch_id) : null;
      const rows = await Service.listRacks({ orgId, branchId });
      res.json({ success: true, data: rows });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      const orgId = req.user?.org_id || 1;
      const { branch_id, rack_code, rack_name, is_active = true } = req.body;
      await Service.createRack({ orgId, branch_id, rack_code, rack_name, is_active });
      res.status(201).json({ success: true, message: 'Rack created' });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      const orgId = req.user?.org_id || 1;
      const id = Number(req.params.id);
      const affected = await Service.updateRack(id, { orgId, ...req.body });
      if (!affected) return res.json({ success: true, message: 'No changes' });
      res.json({ success: true, message: 'Rack updated' });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const orgId = req.user?.org_id || 1;
      const id = Number(req.params.id);
      await Service.deactivateRack(id, { orgId });
      res.json({ success: true, message: 'Rack deactivated' });
    } catch (e) { next(e); }
  }
}

module.exports = new RacksController();

