// src/app/router.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ScrollToTop from '@/app/ScrollToTop';
import { routeMeta } from '@/app/routesConfig';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import RequirePermissions from '@/components/RequirePermissions';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PERMS } from '@/security/permissions';

const Login = lazy(() => import('@/features/system/LoginPage.lazy'));
const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage.lazy'));
const Products = lazy(() => import('@/features/products/ProductsPage.lazy'));
const Inventory = lazy(() => import('@/features/inventory/InventoryPage.lazy'));
const Sales = lazy(() => import('@/features/sales/SalesPage.lazy'));
const POS = lazy(() => import('@/features/pos/POSPage.lazy'));
const Customers = lazy(() => import('@/features/customers/CustomersPage.lazy'));
const Reports = lazy(() => import('@/features/reports/ReportsPage.lazy'));
const BranchesPage = lazy(() => import('@/features/branches/BranchesPage.lazy'));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage.lazy'));
const SaleDetailsPage = lazy(() => import('@/features/sales/SaleDetailsPage.lazy'));
const PurchaseOrdersPage = lazy(() => import('@/features/purchases/PurchaseOrdersPage.lazy'));
const PurchaseOrderDetailPage = lazy(() => import('@/features/purchases/PurchaseOrderDetailPage.lazy'));
const UsersPage = lazy(() => import('@/features/users/UsersPage.lazy'));
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage.lazy'));
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage.lazy'));
const StockTransfersPage = lazy(() => import('@/features/transfers/StockTransfersPage.lazy'));
const StockTransferDetailPage = lazy(() => import('@/features/transfers/StockTransferDetailPage.lazy'));
const ProfilePage = lazy(() => import('@/features/account/ProfilePage.lazy'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage.lazy'));
const PurchasesPage = lazy(() => import('@/features/purchases/PurchasesPage.lazy'));
const PurchaseDetailPage = lazy(() => import('@/features/purchases/PurchaseDetailPage.lazy'));
const RolesPage = lazy(() => import('@/features/roles/RolesPage.lazy'));
const MfgBrandManager = lazy(() => import('@/features/manufacturers/MfgBrandManagerPage.lazy'));
const ManufacturerImport = lazy(() => import('@/features/manufacturers/ManufacturerImportPage.lazy'));
const InvoicePrint = lazy(() => import('@/features/sales/InvoicePrintPage.lazy'));
const MenuAccessPage = lazy(() => import('@/features/admin/MenuAccessPage.lazy'));
const AbacPoliciesPage = lazy(() => import('@/features/admin/AbacPoliciesPage.lazy'));
const MenuManagerPage = lazy(() => import('@/features/admin/MenuManagerPage.lazy'));
const NotAuthorized = lazy(() => import('@/features/system/NotAuthorizedPage.lazy'));
const NotFound = lazy(() => import('@/features/system/NotFoundPage.lazy'));

// Map each route path pattern to its component for auto-routing
const routeComponents = new Map([
  ['/dashboard', Dashboard],
  ['/products', Products],
  ['/inventory', Inventory],
  ['/sales', Sales],
  ['/sales/:id', SaleDetailsPage],
  ['/pos', POS],
  ['/customers', Customers],
  ['/reports', Reports],
  ['/branches', BranchesPage],
  ['/suppliers', SuppliersPage],
  ['/users', UsersPage],
  ['/roles', RolesPage],
  ['/payments', PaymentsPage],
  ['/settings', SettingsPage],
  ['/categories', CategoriesPage],
  ['/manufacturers', MfgBrandManager],
  ['/manufacturers/import', ManufacturerImport],
  ['/purchase-orders', PurchaseOrdersPage],
  ['/purchase-orders/:id', PurchaseOrderDetailPage],
  ['/purchases', PurchasesPage],
  ['/purchases/:id', PurchaseDetailPage],
  ['/stock-transfers', StockTransfersPage],
  ['/stock-transfers/:id', StockTransferDetailPage],
  ['/invoice/:id', InvoicePrint],
  ['/menu-access', MenuAccessPage],
  ['/admin/menus', MenuManagerPage],
  ['/abac-policies', AbacPoliciesPage],
  ['/403', NotAuthorized],
  ['/404', NotFound],
]);

function renderRoute(meta) {
  const Comp = routeComponents.get(meta.path);
  if (!Comp) return null;
  const element = <Comp />;
  if (meta.privateOnly) {
    return (
      <Route key={meta.path} path={meta.path} element={<PrivateRoute>{element}</PrivateRoute>} />
    );
  }
  const any = meta.any || [];
  const all = meta.all || [];
  if (any.length || all.length) {
    return (
      <Route
        key={meta.path}
        path={meta.path}
        element={<ProtectedRoute any={any} all={all}>{element}</ProtectedRoute>}
      />
    );
  }
  return <Route key={meta.path} path={meta.path} element={element} />;
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function ProtectedRoute({ any = [], all = [], children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return (
    <RequirePermissions any={any} all={all}>
      {children}
    </RequirePermissions>
  );
}
function AppRoutesInner() {
  const { user } = useAuth();
  const location = useLocation();
  // Document title via routeMeta with fallback by base segment
  React.useEffect(() => {
    const path = location.pathname;
    const exact = routeMeta.find((r) => r.path === path);
    let title = exact?.title;
    if (!title) {
      const segs = path.split('/').filter(Boolean);
      if (segs.length) {
        const base = '/' + segs[0];
        const byBase = routeMeta.find((r) => r.path.startsWith(base));
        title = byBase?.title;
      }
    }
    document.title = `${title || 'Apnaa ERP'} — Apnaa ERP`;
  }, [location.pathname]);
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        {routeMeta.map((r) => renderRoute(r))}
        {/* Explicit routes not in routeMeta */}
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        {/* Standard utility routes */}
        <Route path="/403" element={<PrivateRoute><NotAuthorized /></PrivateRoute>} />
        <Route path="/404" element={<PrivateRoute><NotFound /></PrivateRoute>} />
        <Route path="/login" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </Layout>
  );
}

export function AppRouter() {
  return (
    <Router>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}> 
          <AppRoutesInner />
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
