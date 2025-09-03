'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('../utils/logger'); // Assuming utils is moved to src/utils
const { errorHandler, notFoundHandler } = require('./api/v2/middleware/errorHandler'); // Centralized error handlers

// --- V2 API Routes ---
const authRoutesV2 = require('./api/v2/features/auth/auth.routes');
// Import other v2 routes as you create them according to the migration plan.
// const salesRoutesV2 = require('./api/v2/features/sales/sales.routes');

const app = express();

// --- Core Middleware ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Add your frontend origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Static File Serving ---
// Note: The path is relative to the project root, so we go up one level from src.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


// --- Rate Limiting ---
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const generalApiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });


// --- Public Health Check Route ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Backend OK', ts: new Date().toISOString() });
});


// ===================================================================================
// === API ROUTE WIRING (SAFE, VERSIONED APPROACH)
// ===================================================================================

// --- Your Existing V1 API (Untouched for Zero Downtime) ---
// We will import and use the old routes directly from your existing `server.js` logic.
// This is a temporary step during migration.
const v1Routes = require('../routes'); // A new file to consolidate all old route imports
app.use('/api', v1Routes);


// --- New, Secure V2 API ---
// All new development happens here.
app.use('/api/v2/auth', authLimiter, authRoutesV2);
// app.use('/api/v2/sales', generalApiLimiter, salesRoutesV2); // Example


// --- Error Handling Middleware (MUST BE LAST) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
