'use strict';

const Service = require('./dashboard.service');

class DashboardController {
  async stats(_req, res, next) {
    try { res.json({ success: true, data: await Service.getStats() }); } catch (e) { next(e); }
  }
  async salesOverTime(_req, res, next) {
    try { res.json({ success: true, data: await Service.salesOverTime() }); } catch (e) { next(e); }
  }
  async topSelling(_req, res, next) {
    try { res.json({ success: true, data: await Service.topSelling() }); } catch (e) { next(e); }
  }
  async recentSales(_req, res, next) {
    try { res.json({ success: true, data: await Service.recentSales() }); } catch (e) { next(e); }
  }
}

module.exports = new DashboardController();

