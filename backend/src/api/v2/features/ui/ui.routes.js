'use strict';

const express = require('express');
const { authMiddleware } = require('../../../../../middleware/auth');
const { loadPermissions } = require('../../../../../middleware/permissions');
const Controller = require('./ui.controller');

const router = express.Router();

router.use(authMiddleware, loadPermissions);

router.get('/menus', Controller.menus);
router.get('/permissions', Controller.permissions);
router.get('/features', Controller.features);
router.get('/bootstrap', Controller.bootstrap);

module.exports = router;
