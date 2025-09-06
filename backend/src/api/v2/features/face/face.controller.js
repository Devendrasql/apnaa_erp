'use strict';

const Service = require('./face.service');

class FaceController {
  async enroll(req, res, next) {
    try {
      const customerId = Number(req.params.id);
      const orgId = (req.user && req.user.org_id) ?? req.body?.org_id ?? null;
      const { imageBase64, imageUrl } = req.body || {};
      const data = await Service.enrollForCustomer({ customerId, imageBase64, imageUrl, orgId });
      res.json({ ok: true, ...data });
    } catch (e) {
      const status = e.status || 500;
      res.status(status).json({ ok: false, error: e.message, similarity: e.similarity });
    }
  }

  async identify(req, res, next) {
    try {
      const org_id = (req.user && req.user.org_id) ?? req.body?.org_id;
      const { imageBase64, store_id } = req.body || {};
      const data = await Service.identifyCustomer({ imageBase64, org_id, store_id });
      res.json({ ok: true, ...data });
    } catch (e) {
      const status = e.status || 500;
      res.status(status).json({ ok: false, error: e.message, similarity: e.similarity });
    }
  }
}

module.exports = new FaceController();

