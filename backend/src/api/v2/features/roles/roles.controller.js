'use strict';

const { validationResult } = require('express-validator');
const Service = require('./roles.service');

class RolesController {
  async listPermissions(_req, res, next) {
    try {
      const data = await Service.listPermissions();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async createPermission(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { name, description, category } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Permission `name` is required' });
      await Service.createPermission({ name, description, category });
      res.status(201).json({ success: true, message: 'Permission created' });
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Permission name already exists' });
      next(e);
    }
  }

  async listRoles(_req, res, next) {
    try { res.json({ success: true, data: await Service.listRoles() }); } catch (e) { next(e); }
  }

  async getRole(req, res, next) {
    try {
      const role = await Service.getRole(Number(req.params.id));
      if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
      res.json({ success: true, data: role });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const id = Number(req.params.id);
      const { name, description, permissions } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Role `name` is required' });
      await Service.updateRolePermissions(id, { name, description, permissions });
      res.json({ success: true, message: 'Role permissions updated' });
    } catch (e) { next(e); }
  }
}

module.exports = new RolesController();

