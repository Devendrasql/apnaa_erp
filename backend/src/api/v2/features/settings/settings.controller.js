'use strict';

const Service = require('./settings.service');

class SettingsController {
  async list(req, res, next) {
    try {
      const data = await Service.getEditableSettings();
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const changed = await Service.updateSettings(req.body || {});
      if (!changed) return res.status(400).json({ success: false, message: 'No settings to update provided.' });
      res.status(200).json({ success: true, message: 'Settings updated successfully.' });
    } catch (e) { next(e); }
  }
}

module.exports = new SettingsController();

