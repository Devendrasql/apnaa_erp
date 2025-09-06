'use strict';

const { validationResult } = require('express-validator');
const Service = require('./branches.service');

class BranchesController {
  async list(_req, res, next) {
    try { res.json({ success: true, data: await Service.listBranches() }); } catch (e) { next(e); }
  }
  async getOne(req, res, next) {
    try {
      const b = await Service.getBranch(Number(req.params.id));
      if (!b) return res.status(404).json({ success: false, message: 'Branch not found.' });
      res.json({ success: true, data: b });
    } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const { id } = await Service.createBranch(req.body);
      res.status(201).json({ success: true, message: 'Branch created successfully.', data: { id } });
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Branch with this code or license number already exists.' });
      next(e);
    }
  }
  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const affected = await Service.updateBranch(Number(req.params.id), req.body);
      if (!affected) return res.status(404).json({ success: false, message: 'Branch not found or no changes made.' });
      res.json({ success: true, message: 'Branch updated successfully.' });
    } catch (e) { next(e); }
  }
  async remove(req, res, next) {
    try {
      const affected = await Service.softDeleteBranch(Number(req.params.id));
      if (!affected) return res.status(404).json({ success: false, message: 'Branch not found.' });
      res.json({ success: true, message: 'Branch deleted successfully.' });
    } catch (e) { next(e); }
  }
}

module.exports = new BranchesController();

