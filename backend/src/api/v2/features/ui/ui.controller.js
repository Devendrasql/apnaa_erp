'use strict';

const Service = require('./ui.service');

class UiController {
  async menus(req, res, next) {
    try {
      const data = await Service.getMenus(req.user);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async permissions(req, res, next) {
    try {
      const data = await Service.getPermissions(req.user);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async features(req, res, next) {
    try {
      const data = await Service.getFeatures(req.user);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async bootstrap(req, res, next) {
    try {
      const user = req.user || {};
      const [menus, permissions, features] = await Promise.all([
        Service.getMenus(user),
        Service.getPermissions(user),
        Service.getFeatures(user),
      ]);

      // minimal sanitized user payload for frontend bootstrap
      const me = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role: user.role,
        org_id: user.org_id,
        default_branch_id: user.default_branch_id,
        accessibleBranches: user.accessibleBranches || [],
      };

      res.json({ success: true, data: { me, menus, permissions, features } });
    } catch (e) { next(e); }
  }
}

module.exports = new UiController();
