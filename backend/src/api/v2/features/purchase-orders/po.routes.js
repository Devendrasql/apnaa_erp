'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./po.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

// List
router.get('/', abacEnforce({ anyPermissions: ['procurement.po.view'] }), validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('search').optional().isString(),
  query('branch_id').optional().isInt({ min: 1 }),
  query('supplier_id').optional().isInt({ min: 1 }),
]), Controller.list);

// Create
router.post('/', abacEnforce({ anyPermissions: ['procurement.po.create'] }), validate([
  body('branch_id').isInt(),
  body('supplier_id').isInt(),
  body('items').isArray({ min: 1 })
]), Controller.create);

// Read one
router.get('/:id', abacEnforce({ anyPermissions: ['procurement.po.view'] }), validate([param('id').isInt({ min: 1 })]), Controller.getOne);

// Receive
router.post('/:id/receive', abacEnforce({ anyPermissions: ['inventory.grn.post'] }), validate([
  param('id').isInt({ min: 1 }),
  body('items').isArray({ min: 1 })
]), Controller.receive);

module.exports = router;
