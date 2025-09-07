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

// Legacy V1 routes intentionally not loaded (clean v2-only surface)

// --- V2 Routes (The new, clean, feature-based routes) ---
const v2Routes = require('./api/v2/features');

const app = express();
// Disable ETag on API responses to avoid 304/empty-body issues with XHR
app.set('etag', false);

// --- Core Middleware ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors());
app.use(requestId());
app.use(httpLogger());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Prevent caching of API JSON responses
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
  }
  next();
});

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
// === Route Registration: v2-only surface ==========================================
// ===================================================================================
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

