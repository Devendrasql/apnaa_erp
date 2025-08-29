'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { connectDatabase } = require('./utils/database');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ✅ Auth only handles identity + user profile (no RBAC)
const { authMiddleware } = require('./middleware/auth');
// ✅ NEW: RBAC loader attaches req.user.permissions = Set(...)
const { loadPermissions } = require('./middleware/permissions');



// Routes
const uiRoutes = require('./routes/ui');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const branchRoutes = require('./routes/branches');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const purchaseRoutes = require('./routes/purchases');
const customerRoutes = require('./routes/customers');
const faceRoutes = require('./routes/face');
const supplierRoutes = require('./routes/suppliers');
const reportRoutes = require('./routes/reports');
const categoryRoutes = require('./routes/categories');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const dashboardRoutes = require('./routes/dashboard');
const paymentRoutes = require('./routes/payments');
const stockTransferRoutes = require('./routes/stockTransfers');
const settingsRoutes = require('./routes/settings');
const roleRoutes = require('./routes/roles');
const racksRouter = require('./routes/racks');
const stdDiscountsRouter = require('./routes/stdDiscounts');
const mfgBrandRoutes = require('./routes/mfgBrandRoutes');


const app = express();

// Helmet: allow images/files to be embedded cross-origin (fixes NotSameOrigin)
/**
 * Security headers. We allow cross-origin resource policy for your uploaded images/files
 * so the frontend (potentially on different origin during dev) can display them.
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(compression());

/**
 * CORS for local dev: CRA (3000) and Vite (5173).
 * If your frontend runs on another origin, add it here or use a regex function.
 */
const corsOptions = {
  origin: [
    'http://localhost:3000',  // CRA
    'http://localhost:5173',  // Vite
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsers (base64 images)
/** JSON & URL-encoded parsers (10MB to allow images/base64) */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads (face snapshots visible at http://localhost:3001/uploads/...)
/** Static file hosting for uploads (face snapshots, OCR files, etc.) */
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '1d',
    index: false,
  })
);

// Rate limits
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const generalApiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });

// Health
app.get('/api/health', (req, res) => {
  res.status(200)
  .json({ success: true, message: 'Backend OK', ts: new Date().toISOString() });
});

/**
 * PUBLIC ROUTES (no JWT)
 * - /api/auth typically includes login/refresh/password reset...
 */
app.use('/api/auth', authLimiter, authRoutes);

/**
 * PROTECTED ROUTER WRAPPER
 * We apply, in order:
 *   1) generalApiLimiter (protect API from abuse)
 *   2) authMiddleware (verifies JWT, loads user profile → req.user)
 *   3) loadPermissions (loads RBAC set → req.user.permissions)
 *
 * All downstream routes can safely use req.user and (if needed) check permissions
 * either via your route-level `authorize([...])` or custom guards.
 */
const protectedApi = express.Router();
protectedApi.use(generalApiLimiter, authMiddleware, loadPermissions);

// -------------------- Protected routes --------------------
app.use('/api/ui', protectedApi, uiRoutes);
app.use('/api/dashboard', generalApiLimiter, authMiddleware, dashboardRoutes);
app.use('/api/users', generalApiLimiter, authMiddleware, userRoutes);
app.use('/api/branches', generalApiLimiter, authMiddleware, branchRoutes);
app.use('/api/suppliers', generalApiLimiter, authMiddleware, supplierRoutes);
app.use('/api/products', generalApiLimiter, authMiddleware, productRoutes);
app.use('/api/categories', generalApiLimiter, authMiddleware, categoryRoutes);
app.use('/api/inventory', generalApiLimiter, authMiddleware, inventoryRoutes);
app.use('/api/purchase-orders', generalApiLimiter, authMiddleware, purchaseOrderRoutes);
app.use('/api/sales', generalApiLimiter, authMiddleware, salesRoutes);
app.use('/api/customers', generalApiLimiter, authMiddleware, customerRoutes);
app.use('/api/face', generalApiLimiter, authMiddleware, faceRoutes);
app.use('/api/reports', generalApiLimiter, authMiddleware, reportRoutes);
app.use('/api/payments', generalApiLimiter, authMiddleware, paymentRoutes);
app.use('/api/stock-transfers', generalApiLimiter, authMiddleware, stockTransferRoutes);
app.use('/api/settings', generalApiLimiter, authMiddleware, settingsRoutes);
app.use('/api/purchases', generalApiLimiter, authMiddleware, purchaseRoutes);
app.use('/api/roles', generalApiLimiter, authMiddleware, roleRoutes);
app.use('/api/racks', generalApiLimiter, authMiddleware, racksRouter);
app.use('/api/std-discounts', generalApiLimiter, authMiddleware, stdDiscountsRouter);
app.use('/api/mfg-brands', generalApiLimiter, authMiddleware, mfgBrandRoutes);
// -----------------------------------------------------------

/**
 * 404 handler for unmatched routes, then centralized error handler.
 * Keep these LAST.
 */
// Errors
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
/**
 * Boot sequence: connect DB, then start server.
 */
(async () => {
  try {
    await connectDatabase();
    // logger.info('DB connected');
    logger.info(`Apnaa ERP Backend server is running on port ${PORT}`);
    app.listen(PORT, () => {
      logger.info(`API on :${PORT}`);
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      // console.log(`→ http://localhost:${PORT}`);
      console.log(`📊 API Documentation: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    logger.error('Failed start', err);
    process.exit(1);
  }
})();

