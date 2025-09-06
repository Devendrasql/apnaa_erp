'use strict';

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const requestId = require('../middleware/requestId');
const httpLogger = require('../middleware/httpLogger');
const { executeQuery } = require('../utils/database');

// ===================================================================================
// === THE FIX ===
// We are now correctly importing your original security middleware and handlers.
const { authMiddleware } = require('../middleware/auth');
const { loadPermissions  } = require('../middleware/permissions')
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
// ===================================================================================

// --- V1 Routes (Your existing, old routes from the /routes folder) ---
const authRoutesV1 = require('../routes/auth');
const userRoutesV1 = require('../routes/users');
const branchRoutesV1 = require('../routes/branches');
const productRoutesV1 = require('../routes/products');
const inventoryRoutesV1 = require('../routes/inventory');
const salesRoutesV1 = require('../routes/sales');
const purchaseRoutesV1 = require('../routes/purchases');
const customerRoutesV1 = require('../routes/customers');
const faceRoutesV1 = require('../routes/face');
const supplierRoutesV1 = require('../routes/suppliers');
const reportRoutesV1 = require('../routes/reports');
const categoryRoutesV1 = require('../routes/categories');
const purchaseOrderRoutesV1 = require('../routes/purchaseOrders');
const dashboardRoutesV1 = require('../routes/dashboard');
const paymentRoutesV1 = require('../routes/payments');
const stockTransferRoutesV1 = require('../routes/stockTransfers');
const settingsRoutesV1 = require('../routes/settings');
const roleRoutesV1 = require('../routes/roles');
const racksRouterV1 = require('../routes/racks');
const stdDiscountsRouterV1 = require('../routes/stdDiscounts');
const mfgBrandRoutesV1 = require('../routes/mfgBrandRoutes');
const uiRoutesV1 = require('../routes/ui');
const meRoutesV1 = require('../routes/me');
const adminMenusRoutesV1 = require('../routes/adminMenus');
const abacRoutesV1 = require('../routes/abac');

// --- V2 Routes (The new, clean, feature-based routes) ---
const v2Routes = require('./api/v2/features');

const app = express();

// --- Core Middleware ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors());
app.use(requestId());
app.use(httpLogger());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// The rate limiter definitions were missing. They are now included.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const generalApiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });

// --- Health, Readiness, Version ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/ready', async (req, res) => {
  try { await executeQuery('SELECT 1 AS ok'); return res.status(200).json({ status: 'ready' }); }
  catch { return res.status(503).json({ status: 'not_ready' }); }
});
app.get('/api/version', (req, res) => {
  try {
    // Read backend package.json for name/version
    // eslint-disable-next-line global-require
    const pkg = require('../package.json');
    res.status(200).json({ name: pkg.name, version: pkg.version, env: process.env.NODE_ENV || 'development' });
  } catch {
    res.status(200).json({ name: 'pharmacy-erp-backend', version: process.env.BUILD_VERSION || '0.0.0', env: process.env.NODE_ENV || 'development' });
  }
});

// ===================================================================================
// === Route Registration: Running both APIs in parallel ===
// ===================================================================================

// 1. Register all your PUBLIC V1 routes.
app.use('/api/auth', authLimiter, authRoutesV1);

// 2. Register all your PROTECTED V1 routes with the original security middleware.
// This is the part that was broken and is now fixed.
app.use('/api/users', generalApiLimiter, authMiddleware, loadPermissions, userRoutesV1);
app.use('/api/branches', generalApiLimiter, authMiddleware, loadPermissions, branchRoutesV1);
app.use('/api/products', generalApiLimiter, authMiddleware, loadPermissions, productRoutesV1);
app.use('/api/inventory', generalApiLimiter, authMiddleware, loadPermissions, inventoryRoutesV1);
app.use('/api/sales', generalApiLimiter, authMiddleware, loadPermissions, salesRoutesV1);
app.use('/api/purchases', generalApiLimiter, authMiddleware, loadPermissions, purchaseRoutesV1);
app.use('/api/customers', generalApiLimiter, authMiddleware, loadPermissions, customerRoutesV1);
app.use('/api/face', generalApiLimiter, authMiddleware, loadPermissions, faceRoutesV1);
app.use('/api/suppliers', generalApiLimiter, authMiddleware, loadPermissions, supplierRoutesV1);
app.use('/api/reports', generalApiLimiter, authMiddleware, loadPermissions, reportRoutesV1);
app.use('/api/categories', generalApiLimiter, authMiddleware, loadPermissions, categoryRoutesV1);
app.use('/api/purchase-orders', generalApiLimiter, authMiddleware, loadPermissions, purchaseOrderRoutesV1);
app.use('/api/dashboard', generalApiLimiter, authMiddleware, loadPermissions, dashboardRoutesV1);
app.use('/api/payments', generalApiLimiter, authMiddleware, loadPermissions, paymentRoutesV1);
app.use('/api/stock-transfers', generalApiLimiter, authMiddleware, loadPermissions, stockTransferRoutesV1);
app.use('/api/settings', generalApiLimiter, authMiddleware, loadPermissions, settingsRoutesV1);
app.use('/api/roles', generalApiLimiter, authMiddleware, loadPermissions, roleRoutesV1);
app.use('/api/racks', generalApiLimiter, authMiddleware, loadPermissions, racksRouterV1);
app.use('/api/std-discounts', generalApiLimiter, authMiddleware, loadPermissions, stdDiscountsRouterV1);
app.use('/api/mfg-brands', generalApiLimiter, authMiddleware, loadPermissions, mfgBrandRoutesV1);
app.use('/api/ui', generalApiLimiter, authMiddleware, loadPermissions, uiRoutesV1);
app.use('/api/me', generalApiLimiter, authMiddleware, loadPermissions, meRoutesV1);
app.use('/api/adminMenus', generalApiLimiter, authMiddleware, loadPermissions, adminMenusRoutesV1);
app.use('/api/abac', generalApiLimiter, authMiddleware, loadPermissions, abacRoutesV1);

// 3. Register ALL of our NEW V2 routes under the /api/v2/ prefix.
// This allows us to build and test the new structure safely.
app.use('/api/v2', v2Routes);

// Serve OpenAPI (v2) spec as raw YAML for tooling/clients
app.get('/api/v2/openapi', (req, res) => {
  try {
    const spec = fs.readFileSync(path.join(__dirname, 'api', 'v2', 'openapi.yaml'), 'utf8');
    res.type('text/yaml').send(spec);
  } catch (e) {
    res.status(404).json({ error: 'OpenAPI spec not found' });
  }
});

// ===================================================================================

// --- Error Handling Middleware (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

