'use strict';

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { loadPermissions } = require('../middleware/permissions');
const { requirePermissionCode } = require('../middleware/rbac');
const { listPolicies, createPolicy, updatePolicy, removePolicy } = require('../controllers/abacController');

router.use(authMiddleware, loadPermissions, requirePermissionCode('abac.policy.manage'));

router.get('/policies', listPolicies);
router.post('/policies', createPolicy);
router.put('/policies/:id', updatePolicy);
router.delete('/policies/:id', removePolicy);

module.exports = router;
