'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const Controller = require('./branches.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

router.get('/', abacEnforce({ anyPermissions: ['branches:read', 'branches:manage'] }), Controller.list);
router.get('/:id', abacEnforce({ anyPermissions: ['branches:read', 'branches:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.getOne);
router.post('/',
  abacEnforce({ anyPermissions: ['branches:create', 'branches:manage'] }),
  validate([
    body('name').notEmpty(), body('code').notEmpty(), body('address').notEmpty(), body('city').notEmpty(), body('state').notEmpty(), body('pincode').notEmpty(), body('license_number').notEmpty()
  ]),
  Controller.create
);
router.put('/:id',
  abacEnforce({ anyPermissions: ['branches:update', 'branches:manage'] }),
  validate([param('id').isInt({ min: 1 })]),
  Controller.update
);
router.delete('/:id', abacEnforce({ anyPermissions: ['branches:delete', 'branches:manage'] }), validate([param('id').isInt({ min: 1 })]), Controller.remove);

module.exports = router;
