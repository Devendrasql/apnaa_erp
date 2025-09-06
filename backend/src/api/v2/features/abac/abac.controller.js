'use strict';

const Service = require('./abac.service');

class AbacController {
  async list(_req, res, next) { try { res.json({ success: true, data: await Service.listPolicies() }); } catch (e) { next(e); } }
  async create(req, res, next) { try { const { id } = await Service.createPolicy(req.body || {}, req.user); res.status(201).json({ success: true, data: { id } }); } catch (e) { next(e); } }
  async update(req, res, next) { try { await Service.updatePolicy(Number(req.params.id), req.body || {}); res.json({ success: true, message: 'Updated' }); } catch (e) { next(e); } }
  async remove(req, res, next) { try { await Service.removePolicy(Number(req.params.id)); res.json({ success: true, message: 'Deleted' }); } catch (e) { next(e); } }
}

module.exports = new AbacController();

