'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const { abacEnforce } = require('../../../../../middleware/abac');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const Controller = require('./abac.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions, abacEnforce({ anyPermissions: ['abac.policy.manage'] }));

router.get('/policies', Controller.list);
router.post('/policies', validate([ body('name').notEmpty() ]), Controller.create);
router.put('/policies/:id', validate([ param('id').isInt({ min: 1 }) ]), Controller.update);
router.delete('/policies/:id', validate([ param('id').isInt({ min: 1 }) ]), Controller.remove);

module.exports = router;
