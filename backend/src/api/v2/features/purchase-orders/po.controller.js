'use strict';

const { validationResult } = require('express-validator');
const Service = require('./po.service');

class POController {
  async list(req, res, next) { try {
    const { rows, total, page, limit } = await Service.listPO({ page: req.query.page, limit: req.query.limit, search: req.query.search, branch_id: req.query.branch_id, supplier_id: req.query.supplier_id });
    res.json({ success: true, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: rows });
  } catch (e) { next(e); } }

  async getOne(req, res, next) { try {
    const data = await Service.getPO(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
    res.json({ success: true, data });
  } catch (e) { next(e); } }

  async create(req, res, next) { try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { id, po_number } = await Service.createPO(req.body || {}, Number(req.user?.id));
    res.status(201).json({ success: true, data: { id, po_number } });
  } catch (e) { if (e.status) return res.status(e.status).json({ success: false, message: e.message }); next(e); } }

  async receive(req, res, next) { try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const result = await Service.receivePO(Number(req.params.id), req.body || {}, Number(req.user?.id));
    if (result?.notFound) return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
    res.json({ success: true, message: 'Purchase Order received and stock updated' });
  } catch (e) { next(e); } }
}

module.exports = new POController();

