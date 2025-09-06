const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Apply a general rate limiter to all v2 endpoints (defense-in-depth)
const v2Limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
router.use(v2Limiter);

// Import the new, clean V2 feature routes as we build them
const authRoutes = require('./auth/auth.routes');
const categoryRoutes = require('./categories/categories.routes');
const racksRoutes = require('./racks/racks.routes');
const brandsRoutes = require('./brands/brands.routes');
const settingsRoutes = require('./settings/settings.routes');
const suppliersRoutes = require('./suppliers/suppliers.routes');
const paymentsRoutes = require('./payments/payments.routes');
const reportsRoutes = require('./reports/reports.routes');
const rolesRoutes = require('./roles/roles.routes');
const usersRoutes = require('./users/users.routes');
const productsRoutes = require('./products/products.routes');
const purchasesRoutes = require('./purchases/purchases.routes');
const inventoryRoutes = require('./inventory/inventory.routes');
const transfersRoutes = require('./transfers/transfers.routes');
const salesRoutes = require('./sales/sales.routes');
const uiRoutes = require('./ui/ui.routes');
const dashboardRoutes = require('./dashboard/dashboard.routes');
const customersRoutes = require('./customers/customers.routes');
const branchesRoutes = require('./branches/branches.routes');
const discountsRoutes = require('./discounts/discounts.routes');
const adminMenusRoutes = require('./admin/menus.routes');
const abacRoutes = require('./abac/abac.routes');
const faceRoutes = require('./face/face.routes');
const poRoutes = require('./purchase-orders/po.routes');
const meRoutes = require('./me/me.routes');

// Register the V2 routes
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/racks', racksRoutes);
router.use('/mfg-brands', brandsRoutes);
router.use('/settings', settingsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/roles', rolesRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/purchases', purchasesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/transfers', transfersRoutes);
router.use('/sales', salesRoutes);
router.use('/ui', uiRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/customers', customersRoutes);
router.use('/branches', branchesRoutes);
router.use('/discounts', discountsRoutes);
router.use('/admin/menus', adminMenusRoutes);
router.use('/abac', abacRoutes);
router.use('/face', faceRoutes);
router.use('/purchase-orders', poRoutes);
router.use('/me', meRoutes);

module.exports = router;

