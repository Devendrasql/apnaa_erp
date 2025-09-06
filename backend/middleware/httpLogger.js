'use strict';

const logger = require('../utils/logger');

function httpLogger() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      logger.info('http_request', {
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        duration_ms: Math.round(durationMs),
        request_id: req.id,
        ip: req.ip,
        user: req.user?.id,
      });
    });
    next();
  };
}

module.exports = httpLogger;

