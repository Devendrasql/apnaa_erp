'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
// Note: This now points to your existing errorHandler, which we will move later.
const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');

// --- V1 Routes (Your existing, old routes from the /routes folder) ---
const authRoutesV1 = require('../../routes/auth');
const userRoutesV1 = require('../../routes/users');
const branchRoutesV1 = require('../../routes/branches');
const productRoutesV1 = require('../../routes/products');
const inventoryRoutesV1 = require('../../routes/inventory');
const salesRoutesV1 = require('../../routes/sales');
const purchaseRoutesV1 = require('../../routes/purchases');
const customerRoutesV1 = require('../../routes/customers');
const faceRoutesV1 = require('../../routes/face');
const supplierRoutesV1 = require('../../routes/suppliers');
const reportRoutesV1 = require('../../routes/reports');
const categoryRoutesV1 = require('../../routes/categories');
const purchaseOrderRoutesV1 = require('../../routes/purchaseOrders');
const dashboardRoutesV1 = require('../../routes/dashboard');
const paymentRoutesV1 = require('../../routes/payments');
const stockTransferRoutesV1 = require('../../routes/stockTransfers');
const settingsRoutesV1 = require('../../routes/settings');
const roleRoutesV1 = require('../../routes/roles');
const racksRouterV1 = require('../../routes/racks');
const stdDiscountsRouterV1 = require('../../routes/stdDiscounts');
const mfgBrandRoutesV1 = require('../../routes/mfgBrandRoutes');
const uiRoutesV1 = require('../../routes/ui');
const meRoutesV1 = require('../../routes/me');
const adminMenusRoutesV1 = require('../../routes/adminMenus');
const abacRoutesV1 = require('../../routes/abac');


// --- V2 Routes (The new, clean, feature-based routes) ---
const v2Routes = require('./api/v2/features'); // This is our new Route Aggregator

const app = express();

// --- Core Middleware ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Health Check ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// ===================================================================================
// === Route Registration: The key to a safe migration ===
// ===================================================================================

// 1. Register all your OLD routes under the /api/ prefix.
// Your current frontend will continue to work with these routes without any changes.
app.use('/api/auth', authRoutesV1);
app.use('/api/users', userRoutesV1);
app.use('/api/branches', branchRoutesV1);
app.use('/api/products', productRoutesV1);
app.use('/api/inventory', inventoryRoutesV1);
app.use('/api/sales', salesRoutesV1);
app.use('/api/purchases', purchaseRoutesV1);
app.use('/api/customers', customerRoutesV1);
app.use('/api/face', faceRoutesV1);
app.use('/api/suppliers', supplierRoutesV1);
app.use('/api/reports', reportRoutesV1);
app.use('/api/categories', categoryRoutesV1);
app.use('/api/purchase-orders', purchaseOrderRoutesV1);
app.use('/api/dashboard', dashboardRoutesV1);
app.use('/api/payments', paymentRoutesV1);
app.use('/api/stock-transfers', stockTransferRoutesV1);
app.use('/api/settings', settingsRoutesV1);
app.use('/api/roles', roleRoutesV1);
app.use('/api/racks', racksRouterV1);
app.use('/api/std-discounts', stdDiscountsRouterV1);
app.use('/api/mfg-brands', mfgBrandRoutesV1);
app.use('/api/ui', uiRoutesV1);
app.use('/api/me', meRoutesV1);
app.use('/api/adminMenus', adminMenusRoutesV1);
app.use('/api/abac', abacRoutesV1);

// 2. Register ALL of our NEW V2 routes under the /api/v2/ prefix.
// This allows us to build and test the new structure safely.
app.use('/api/v2', v2Routes);

// ===================================================================================

// --- Error Handling Middleware (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

