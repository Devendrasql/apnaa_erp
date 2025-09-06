const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('./auth.controller');
const { authMiddleware } = require('../../../../../middleware/auth');

// Tighter limiter for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

// Public routes
router.post('/login', authLimiter, [
    body('username').notEmpty(),
    body('password').notEmpty()
], AuthController.login);

router.post('/refresh', authLimiter, [
    body('refreshToken').notEmpty()
], AuthController.refreshToken);

// Protected routes
router.post('/change-password', authMiddleware, [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], AuthController.changePassword);

router.post('/logout', authMiddleware, AuthController.logout);
router.post('/logout-all', authMiddleware, AuthController.logoutAll);

module.exports = router;

