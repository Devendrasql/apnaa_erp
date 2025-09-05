'use strict';
const AuthService = require('./auth.service');
const { validationResult } = require('express-validator');
const logger = require('../../../../utils/logger');

class AuthController {
    async login(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { username, password } = req.body;
            const ip = req.ip;
            const userAgent = req.get('user-agent') || null;

            const data = await AuthService.login({ username, password, ip, userAgent });
            
            logger.info(`User ${username} logged in successfully`);
            res.json({ success: true, message: 'Login successful', data });
        } catch (error) {
            logger.error('Authentication error:', error.message);
            // Send a generic error for security reasons
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    }

    async refreshToken(req, res, next) {
        try {
            const token = req.body?.refreshToken;
            if (!token) {
                return res.status(400).json({ success: false, message: 'Refresh token is required' });
            }
            const data = await AuthService.refreshToken(token);
            res.json({ success: true, data });
        } catch (error) {
            res.status(403).json({ success: false, message: error.message });
        }
    }

    async changePassword(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const userId = req.user.id; // From auth middleware
            const { currentPassword, newPassword } = req.body;

            await AuthService.changePassword({ userId, currentPassword, newPassword });
            res.status(200).json({ success: true, message: 'Password changed successfully.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async logout(req, res, next) {
        try {
            const sid = req.user?.sid; // Assuming your new auth middleware adds this
            await AuthService.logout(sid);
            res.json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }

    async logoutAll(req, res, next) {
        try {
            const userId = req.user?.id;
            await AuthService.logoutAll(userId);
            res.json({ success: true, message: 'Logged out from all devices' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();

