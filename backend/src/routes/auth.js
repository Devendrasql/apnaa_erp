// In backend/src/routes/auth.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/auth'); // For protecting the change-password route

// 1. Import the new controller functions
const {
    login,
    refreshToken,
    changePassword,
    logout,           // NEW: optional logout to revoke session
} = require('../controllers/authController');

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login',
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    login // 2. Use the imported login function
);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    refreshToken // Use the imported refreshToken function
);

// @route   POST /api/auth/change-password
// @desc    Change user's own password
// @access  Private
router.post('/change-password',
    authMiddleware, // Protect this route
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
    ],
    changePassword // 3. Use the imported changePassword function
);

// POST /api/auth/logout (optional, protected)
router.post('/logout',
     authMiddleware, logout);


module.exports = router;




// const express = require('express');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { body, validationResult } = require('express-validator');
// const { executeQuery } = require('../utils/database');
// const logger = require('../utils/logger');

// const router = express.Router();

// // Generate JWT token
// const generateTokens = (userId) => {
//   const accessToken = jwt.sign(
//     { userId },
//     process.env.JWT_SECRET,
//     { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
//   );

//   const refreshToken = jwt.sign(
//     { userId },
//     process.env.JWT_REFRESH_SECRET,
//     { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
//   );

//   return { accessToken, refreshToken };
// };

// // Login
// router.post('/login', [
//   body('username').notEmpty().withMessage('Username is required'),
//   body('password').notEmpty().withMessage('Password is required')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }

//     const { username, password } = req.body;

//     // Get user with branch info
//     const users = await executeQuery(
//       `SELECT u.*, b.name as branch_name, b.code as branch_code 
//        FROM users u 
//        LEFT JOIN branches b ON u.branch_id = b.id 
//        WHERE u.username = ? AND u.is_active = true`,
//       [username]
//     );

//     if (users.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     const user = users[0];

//     // Check password
//     const isPasswordValid = await bcrypt.compare(password, user.password_hash);
//     if (!isPasswordValid) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user.id);

//     // Update last login
//     await executeQuery(
//       'UPDATE users SET last_login = NOW() WHERE id = ?',
//       [user.id]
//     );

//     // Remove password from response
//     delete user.password_hash;

//     logger.info(`User ${user.username} logged in successfully`);

//     res.json({
//       success: true,
//       message: 'Login successful',
//       data: {
//         user,
//         accessToken,
//         refreshToken
//       }
//     });

//   } catch (error) {
//     next(error);
//   }
// });

// // Refresh token
// router.post('/refresh', [
//   body('refreshToken').notEmpty().withMessage('Refresh token is required')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }

//     const { refreshToken } = req.body;

//     // Verify refresh token
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

//     // Check if user still exists
//     const users = await executeQuery(
//       'SELECT id FROM users WHERE id = ? AND is_active = true',
//       [decoded.userId]
//     );

//     if (users.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Generate new tokens
//     const tokens = generateTokens(decoded.userId);

//     res.json({
//       success: true,
//       message: 'Token refreshed successfully',
//       data: tokens
//     });

//   } catch (error) {
//     if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid refresh token'
//       });
//     }
//     next(error);
//   }
// });

// // Change password
// router.post('/change-password', [
//   body('currentPassword').notEmpty().withMessage('Current password is required'),
//   body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }

//     const token = req.header('Authorization')?.replace('Bearer ', '');
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'Authentication required'
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const { currentPassword, newPassword } = req.body;

//     // Get current user
//     const users = await executeQuery(
//       'SELECT password_hash FROM users WHERE id = ? AND is_active = true',
//       [decoded.userId]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Verify current password
//     const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
//     if (!isCurrentPasswordValid) {
//       return res.status(400).json({
//         success: false,
//         message: 'Current password is incorrect'
//       });
//     }

//     // Hash new password
//     const saltRounds = 12;
//     const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

//     // Update password
//     await executeQuery(
//       'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
//       [hashedNewPassword, decoded.userId]
//     );

//     logger.info(`User ${decoded.userId} changed password successfully`);

//     res.json({
//       success: true,
//       message: 'Password changed successfully'
//     });

//   } catch (error) {
//     next(error);
//   }
// });

// // Logout (optional - for logging purposes)
// router.post('/logout', async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
//     if (token) {
//       try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         logger.info(`User ${decoded.userId} logged out`);
//       } catch (error) {
//         // Token might be expired, ignore
//       }
//     }

//     res.json({
//       success: true,
//       message: 'Logged out successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// module.exports = router;
