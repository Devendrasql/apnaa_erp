// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import POS from './pages/POS';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import BranchesPage from './pages/Branches';
import SuppliersPage from './pages/Suppliers';
import SaleDetailsPage from './pages/SaleDetails';
import PurchaseOrdersPage from './pages/PurchaseOrders';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetail';
import UsersPage from './pages/Users';
import CategoriesPage from './pages/Categories';
import PaymentsPage from './pages/Payments';
import StockTransfersPage from './pages/StockTransfers';
import StockTransferDetailPage from './pages/StockTransferDetail';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';
import PurchasesPage from './pages/Purchases';
import PurchaseDetailPage from './pages/PurchaseDetail';
import RolesPage from './pages/Roles';
import MfgBrandManager from './pages/masters/MfgBrandManager';
import ManufacturerImport from './pages/ManufacturerImport';
import InvoicePrint from './pages/InvoicePrint';

// NOTE: No route changes required for face recognition.
// The Layout's AppBar injects a "Retrieve by Face" button on /pos.

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 0,
      keepPreviousData: false,
    },
    mutations: { retry: 0 },
  },
});

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();

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
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/branches" element={<PrivateRoute><BranchesPage /></PrivateRoute>} />
        <Route path="/suppliers" element={<PrivateRoute><SuppliersPage /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><CategoriesPage /></PrivateRoute>} />
        <Route path="/manufacturers/import" element={<PrivateRoute><ManufacturerImport /></PrivateRoute>} />
        <Route path="/manufacturers" element={<PrivateRoute><MfgBrandManager /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
        <Route path="/purchase-orders" element={<PrivateRoute><PurchaseOrdersPage /></PrivateRoute>} />
        <Route path="/purchase-orders/:id" element={<PrivateRoute><PurchaseOrderDetailPage /></PrivateRoute>} />
        <Route path="/purchases" element={<PrivateRoute><PurchasesPage /></PrivateRoute>} />
        <Route path="/purchases/:id" element={<PrivateRoute><PurchaseDetailPage /></PrivateRoute>} />
        <Route path="/stock-transfers" element={<PrivateRoute><StockTransfersPage /></PrivateRoute>} />
        <Route path="/stock-transfers/:id" element={<PrivateRoute><StockTransferDetailPage /></PrivateRoute>} />
        <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
        <Route path="/sales/:id" element={<PrivateRoute><SaleDetailsPage /></PrivateRoute>} />
        <Route path="/pos" element={<PrivateRoute><POS /></PrivateRoute>} />
        <Route path="/invoice/:id" element={<PrivateRoute><InvoicePrint /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
        <Route path="/roles" element={<PrivateRoute><RolesPage /></PrivateRoute>} />
        <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/login" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <AppRoutes />
            <Toaster position="top-right" />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;





// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import { CssBaseline } from '@mui/material';
// import { QueryClient, QueryClientProvider } from 'react-query';
// import { Toaster } from 'react-hot-toast';

// import { AuthProvider } from './contexts/AuthContext';
// import { useAuth } from './contexts/AuthContext';
// import Layout from './components/Layout';
// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import Products from './pages/Products';
// import Inventory from './pages/Inventory';
// import Sales from './pages/Sales';
// import POS from './pages/POS';
// import Customers from './pages/Customers';
// import Reports from './pages/Reports';
// import BranchesPage from './pages/Branches';
// import SuppliersPage from './pages/Suppliers';
// import SaleDetailsPage from './pages/SaleDetails';
// import PurchaseOrdersPage from './pages/PurchaseOrders';
// import PurchaseOrderDetailPage from './pages/PurchaseOrderDetail';
// import UsersPage from './pages/Users';
// import CategoriesPage from './pages/Categories';
// import PaymentsPage from './pages/Payments';
// import StockTransfersPage from './pages/StockTransfers';
// import StockTransferDetailPage from './pages/StockTransferDetail';
// import ProfilePage from './pages/Profile';
// import SettingsPage from './pages/Settings';
// import PurchasesPage from './pages/Purchases';
// import PurchaseDetailPage from './pages/PurchaseDetail';
// import RolesPage from './pages/Roles'; // 1. Import the new Roles page
// import MfgBrandManager from './pages/masters/MfgBrandManager';
// import ManufacturerImport from './pages/ManufacturerImport';

// // import BrandList from './pages/BrandList';
// // import ManufacturerList from './pages/ManufacturerList';
// // import MasterBrandConsole from './pages/masters/MasterBrandConsole';




// const theme = createTheme({
//   palette: {
//     primary: {
//       main: '#1976d2',
//     },
//     secondary: {
//       main: '#dc004e',
//     },
//   },
// });

// const queryClient = new QueryClient(
//   {
//   defaultOptions: {
//     queries: {
//       staleTime: 0,         // never consider fresh
//       cacheTime: 0,         // do not keep results in cache
//       refetchOnWindowFocus: false,
//       refetchOnReconnect: true,
//       retry: 0,
//       keepPreviousData: false,
//     },
//     mutations: { retry: 0 },
//   },
// }
// );

// function PrivateRoute({ children }) {
//   const { user } = useAuth();
//   return user ? children : <Navigate to="/login" />;
// }

// function AppRoutes() {
//   const { user } = useAuth();

//   if (!user) {
//     return (
//       <Routes>
//         <Route path="/login" element={<Login />} />
//         <Route path="*" element={<Navigate to="/login" />} />
//       </Routes>
//     );
//   }

//   return (
//     <Layout>
//       <Routes>
//         <Route path="/" element={<Navigate to="/dashboard" />} />
//         <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
//         <Route path="/branches" element={<PrivateRoute><BranchesPage /></PrivateRoute>} />
//         <Route path="/suppliers" element={<PrivateRoute><SuppliersPage /></PrivateRoute>} />
//         <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
//         <Route path="/categories" element={<PrivateRoute><CategoriesPage /></PrivateRoute>} />
//         <Route path="/manufacturers/import" element={<PrivateRoute><ManufacturerImport /></PrivateRoute>} />
//         <Route path="/manufacturers" element={<PrivateRoute><MfgBrandManager /></PrivateRoute>} />
//         {/* <Route path="/mfg-brands" element={<PrivateRoute><MfgBrandManager /></PrivateRoute>} /> */}
//         {/* <Route path="/product-masters" element={<PrivateRoute><MasterBrandConsole /></PrivateRoute>} /> */}
//         {/* <Route path="/brands" element={<PrivateRoute><BrandList /></PrivateRoute>} /> */}
//         {/* <Route path="/manufacturers" element={<PrivateRoute><ManufacturerList /></PrivateRoute>} /> */}
//         <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
//         <Route path="/purchase-orders" element={<PrivateRoute><PurchaseOrdersPage /></PrivateRoute>} />
//         <Route path="/purchase-orders/:id" element={<PrivateRoute><PurchaseOrderDetailPage /></PrivateRoute>} />
//         <Route path="/purchases" element={<PrivateRoute><PurchasesPage /></PrivateRoute>} />
//         <Route path="/purchases/:id" element={<PrivateRoute><PurchaseDetailPage /></PrivateRoute>} />
//         <Route path="/stock-transfers" element={<PrivateRoute><StockTransfersPage /></PrivateRoute>} />
//         <Route path="/stock-transfers/:id" element={<PrivateRoute><StockTransferDetailPage /></PrivateRoute>} />
//         <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} /> 
//         <Route path="/sales/:id" element={<PrivateRoute><SaleDetailsPage /></PrivateRoute>} />
//         <Route path="/pos" element={<PrivateRoute><POS /></PrivateRoute>} />
//         <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
//         <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
//         <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
//         <Route path="/roles" element={<PrivateRoute><RolesPage /></PrivateRoute>} /> {/* 2. Add the new route for Roles page */}
//         <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
//         <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
//         <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
//         <Route path="/login" element={<Navigate to="/dashboard" />} />
//         <Route path="*" element={<Navigate to="/dashboard" />} />
//       </Routes>
//     </Layout>
//   );
// }

// function App() {
//   return (
//     <QueryClientProvider client={queryClient}>
//       <ThemeProvider theme={theme}>
//         <CssBaseline />
//         <AuthProvider>
//           <Router>
//             <AppRoutes />
//             <Toaster position="top-right" />
//           </Router>
//         </AuthProvider>
//       </ThemeProvider>
//     </QueryClientProvider>
//   );
// }

// export default App;
