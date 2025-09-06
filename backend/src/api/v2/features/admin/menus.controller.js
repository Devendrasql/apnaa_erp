'use strict';

const { validationResult } = require('express-validator');
const Service = require('./menus.service');

class AdminMenusController {
  async list(_req, res, next) {
    try { res.json({ success: true, data: await Service.listMenusWithGates() }); } catch (e) { next(e); }
  }
  async setPermissions(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      const id = Number(req.params.id);
      const perms = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
      await Service.setMenuPermissions(id, perms);
      res.json({ success: true, message: 'Menu permissions updated' });
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ success: false, message: e.message });
      next(e);
    }
  }
}

module.exports = new AdminMenusController();

