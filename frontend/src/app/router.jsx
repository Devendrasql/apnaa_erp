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

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Products = lazy(() => import('@/features/products/ProductsPage.lazy'));
const Inventory = lazy(() => import('@/features/inventory/InventoryPage.lazy'));
const Sales = lazy(() => import('@/features/sales/SalesPage.lazy'));
const POS = lazy(() => import('@/pages/POS'));
const Customers = lazy(() => import('@/features/customers/CustomersPage.lazy'));
const Reports = lazy(() => import('@/pages/Reports'));
const BranchesPage = lazy(() => import('@/pages/Branches'));
const SuppliersPage = lazy(() => import('@/pages/Suppliers'));
const SaleDetailsPage = lazy(() => import('@/pages/SaleDetails'));
const PurchaseOrdersPage = lazy(() => import('@/pages/PurchaseOrders'));
const PurchaseOrderDetailPage = lazy(() => import('@/pages/PurchaseOrderDetail'));
const UsersPage = lazy(() => import('@/features/users/UsersPage.lazy'));
const CategoriesPage = lazy(() => import('@/pages/Categories'));
const PaymentsPage = lazy(() => import('@/pages/Payments'));
const StockTransfersPage = lazy(() => import('@/features/transfers/StockTransfersPage.lazy'));
const StockTransferDetailPage = lazy(() => import('@/pages/StockTransferDetail'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const PurchasesPage = lazy(() => import('@/pages/Purchases'));
const PurchaseDetailPage = lazy(() => import('@/pages/PurchaseDetail'));
const RolesPage = lazy(() => import('@/features/roles/RolesPage.lazy'));
const MfgBrandManager = lazy(() => import('@/pages/masters/MfgBrandManager'));
const ManufacturerImport = lazy(() => import('@/pages/ManufacturerImport'));
const InvoicePrint = lazy(() => import('@/pages/InvoicePrint'));
const MenuAccessPage = lazy(() => import('@/pages/MenuAccess'));
const AbacPoliciesPage = lazy(() => import('@/pages/AbacPolicies'));
const NotAuthorized = lazy(() => import('@/pages/NotAuthorized'));
const NotFound = lazy(() => import('@/pages/NotFound'));

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

  // Document title from central route config (handles dynamic segments)
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
    document.title = `${title || 'Apnaa ERP'} · Apnaa ERP`;
  }, [location.pathname]);

  // Lightweight document.title manager (can be replaced by a fuller solution later)
  React.useEffect(() => {
    const path = location.pathname;
    const map = new Map([
      ['/', 'Dashboard'],
      ['/dashboard', 'Dashboard'],
      ['/products', 'Products'],
      ['/inventory', 'Inventory'],
      ['/sales', 'Sales'],
      ['/pos', 'Point of Sale'],
      ['/customers', 'Customers'],
      ['/reports', 'Reports'],
      ['/branches', 'Branches'],
      ['/suppliers', 'Suppliers'],
      ['/users', 'Users'],
      ['/roles', 'Roles'],
      ['/payments', 'Payments'],
      ['/settings', 'Settings'],
      ['/stock-transfers', 'Stock Transfers'],
      ['/purchase-orders', 'Purchase Orders'],
    ]);
    // fallback by first segment
    const title = map.get(path) || map.get('/' + (path.split('/')[1] || '')) || 'Apnaa ERP';
    document.title = `${title} · Apnaa ERP`;
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
        <Route path="/dashboard" element={<ProtectedRoute any={['dashboard:view','ui:read']}><Dashboard /></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute any={['branches:read','branches:manage']}><BranchesPage /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute any={['suppliers:read','suppliers:manage']}><SuppliersPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute any={['products:read','products:manage']}><Products /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute any={['categories:read','categories:manage']}><CategoriesPage /></ProtectedRoute>} />
        <Route path="/manufacturers/import" element={<ProtectedRoute any={['products:manage','inventory:manage']}><ManufacturerImport /></ProtectedRoute>} />
        <Route path="/manufacturers" element={<ProtectedRoute any={['products:read','products:manage']}><MfgBrandManager /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute any={['inventory:read','inventory:manage']}><Inventory /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute any={['purchase_orders:read','purchases:manage']}><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="/purchase-orders/:id" element={<ProtectedRoute any={['purchase_orders:read','purchases:manage']}><PurchaseOrderDetailPage /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute any={['purchases:read','purchases:manage']}><PurchasesPage /></ProtectedRoute>} />
        <Route path="/purchases/:id" element={<ProtectedRoute any={['purchases:read','purchases:manage']}><PurchaseDetailPage /></ProtectedRoute>} />
        <Route path="/stock-transfers" element={<ProtectedRoute any={['transfers:read','inventory:manage']}><StockTransfersPage /></ProtectedRoute>} />
        <Route path="/stock-transfers/:id" element={<ProtectedRoute any={['transfers:read','inventory:manage']}><StockTransferDetailPage /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute any={['sales:read','sales:manage']}><Sales /></ProtectedRoute>} />
        <Route path="/sales/:id" element={<PrivateRoute><SaleDetailsPage /></PrivateRoute>} />
        <Route path="/pos" element={<ProtectedRoute any={['pos:use','sales:manage']}><POS /></ProtectedRoute>} />
        <Route path="/invoice/:id" element={<ProtectedRoute any={['sales:read','sales:manage']}><InvoicePrint /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute any={['customers:read','customers:manage']}><Customers /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute any={['reports:read','inventory:manage']}><Reports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute any={['users:read','users:manage']}><UsersPage /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute any={['roles:read','roles:manage']}><RolesPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute any={['payments:read','payments:manage']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/settings" element={<ProtectedRoute any={['settings:read','settings:manage']}><SettingsPage /></ProtectedRoute>} />
        <Route path="/menu-access" element={<ProtectedRoute any={['menus:manage','roles:manage']}><MenuAccessPage /></ProtectedRoute>} />
        <Route path="/abac-policies" element={<ProtectedRoute any={['abac:manage','roles:manage']}><AbacPoliciesPage /></ProtectedRoute>} />
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
