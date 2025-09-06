'use strict';

const { randomUUID } = require('crypto');

function requestId() {
  return (req, res, next) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
    next();
  };
}

module.exports = requestId;

