const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('./auth.controller');
// We will create this new middleware soon
// const { verifyToken } = require('../../../middleware/authJwt');

// Public routes
router.post('/login', [
    body('username').notEmpty(),
    body('password').notEmpty()
], AuthController.login);

router.post('/refresh', [
    body('refreshToken').notEmpty()
], AuthController.refreshToken);

// Protected routes (will need middleware later)
router.post('/change-password', [
    // verifyToken,
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], AuthController.changePassword);

router.post('/logout', /* verifyToken, */ AuthController.logout);
router.post('/logout-all', /* verifyToken, */ AuthController.logoutAll);

module.exports = router;

