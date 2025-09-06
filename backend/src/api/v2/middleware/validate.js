'use strict';

const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  return next();
}

function validate(rules = []) {
  if (!Array.isArray(rules)) rules = [rules];
  return [...rules, handleValidation];
}

module.exports = {
  validate,
  handleValidation,
};

