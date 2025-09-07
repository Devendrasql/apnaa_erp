'use strict';

const { validationResult } = require('express-validator');
const Service = require('./transfers.service');

class TransfersController {
  async list(req, res, next) {
    try {
      const { rows, total, page, limit } = await Service.listTransfers({
        page: req.query.page,
        limit: req.query.limit,
        from_branch_id: req.query.from_branch_id,
        to_branch_id: req.query.to_branch_id,
        status: req.query.status,
      });
      res.json({ success: true, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: rows });
    } catch (e) { next(e); }
  }

  async getOne(req, res, next) {
    try {
      const id = Number(req.params.id);
      const data = await Service.getTransferById(id);
      if (!data) return res.status(404).json({ success: false, message: 'Stock Transfer not found.' });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const requested_by = Number(req.user?.id);
      const userBranchId = req.branchId ?? null;
      if (!userBranchId || Number(userBranchId) !== Number(req.body?.from_branch_id)) {
        return res.status(403).json({ success: false, message: 'Only the source branch can create a transfer.' });
      }
      const { transfer_number } = await Service.createTransfer(req.body, requested_by);
      res.status(201).json({ success: true, message: 'Stock transfer request created successfully.', data: { transfer_number } });
    } catch (e) { next(e); }
  }

  async updateStatus(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { status } = req.body || {};
      const userId = Number(req.user?.id);
      const userBranchId = req.branchId ?? null;
      const result = await Service.updateStatus(id, status, userId, userBranchId);
      if (result?.notFound) return res.status(404).json({ success: false, message: 'Stock Transfer not found.' });
      if (result?.forbidden) return res.status(403).json({ success: false, message: result.forbidden });
      if (result?.invalid) return res.status(400).json({ success: false, message: `Cannot change status from ${result.from} to ${status}.` });
      res.json({ success: true, message: `Transfer status updated to ${status}.` });
    } catch (e) { next(e); }
  }
}

module.exports = new TransfersController();
