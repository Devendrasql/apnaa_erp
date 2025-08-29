// src/services/api.js
// ------------------------------------------------------------
// Centralized API client with:
// - axios interceptors (auth + refresh)
// - default + named exports
// - org_id auto-injection for face endpoints
// ------------------------------------------------------------

import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import Papa from 'papaparse'; // kept if you use it elsewhere

// ------------------------------------------------------------
// Base URL
// ------------------------------------------------------------
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
axios.defaults.baseURL = BASE_URL;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Build absolute URL for files served from /uploads */
export const buildImageUrl = (p) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return `${BASE_URL}${p}`;
};

/** Safe JWT payload decoder (no external deps) */
function parseJwt(token) {
  try {
    const part = token.split('.')[1];
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Derive org_id from user cookie or JWT payload */
function deriveOrgId() {
  // 1) Try user cookie (if you store it)
  const userCookie = Cookies.get('user');
  if (userCookie) {
    try {
      const u = JSON.parse(userCookie);
      const id = u?.org_id ?? u?.orgId ?? u?.org;
      if (id != null) return id;
    } catch {}
  }

  // 2) Try access token (JWT) claims
  // const token = Cookies.get('accessToken');
  // if (token) {
  //   const payload = parseJwt(token);
  //   return payload?.org_id ?? payload?.orgId ?? payload?.org ?? null;
  // }
  // cookie: accessToken (JWT)
   const token = Cookies.get('accessToken');
  if (token) {
    const payload = parseJwt(token);
    const id = payload?.org_id ?? payload?.orgId ?? payload?.org;
    if (id != null) return id;
  }

  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    const id = u?.org_id ?? u?.orgId ?? u?.org;
    if (id != null) return id;
  } catch {}
  try {
    const p = JSON.parse(localStorage.getItem('profile') || 'null');
    const id = p?.org_id ?? p?.orgId ?? p?.org;
    if (id != null) return id;
  } catch {}
  try {
    const t = JSON.parse(localStorage.getItem('tenant') || 'null');
    const id = t?.org_id ?? t?.orgId ?? t?.org;
    if (id != null) return id;
  } catch {}

  // env
  if (import.meta.env.VITE_ORG_ID) return Number(import.meta.env.VITE_ORG_ID);
  if (import.meta.env.REACT_APP_ORG_ID) return Number(import.meta.env.REACT_APP_ORG_ID);

  // final fallback (dev only)
  return 1;
}

/** Ensure face payload has org_id; accept raw base64 string too */
function withOrgId(payloadOrBase64) {
  const body =
    typeof payloadOrBase64 === 'string'
      ? { imageBase64: payloadOrBase64 }
      : { ...(payloadOrBase64 || {}) };

  if (body.org_id == null) {
    body.org_id = deriveOrgId();
  }
  return body;
}

// ------------------------------------------------------------
// Axios Interceptors
// ------------------------------------------------------------

// Attach Bearer token if present
axios.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && Cookies.get('refreshToken')) {
      try {
        original._retry = true;
        const refreshToken = Cookies.get('refreshToken');
        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken } = res.data.data;
        Cookies.set('accessToken', accessToken, { expires: 1 });
        original.headers.Authorization = `Bearer ${accessToken}`;
        return axios.request(original);
      } catch (e) {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('user');
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    if (error.response?.data?.message) toast.error(error.response.data.message);
    return Promise.reject(error);
  }
);

// ------------------------------------------------------------
// API methods (object form)
// ------------------------------------------------------------
export const api = {
  
  // Auth
  login: (credentials) => axios.post('/api/auth/login', credentials),
  logout: () => axios.post('/api/auth/logout'),
  changePassword: (data) => axios.post('/api/auth/change-password', data),

  // Dashboard
  getDashboardStats: (params) => axios.get('/api/dashboard/stats', { params }),
  getTopSellingProducts: (params) => axios.get('/api/dashboard/top-selling', { params }),
  getRecentSales: (params) => axios.get('/api/dashboard/recent-sales', { params }),
  getSalesOverTime: (params) => axios.get('/api/dashboard/sales-over-time', { params }),

  // Branches
  getBranches: (params) => axios.get('/api/branches', { params }),
  createBranch: (data) => axios.post('/api/branches', data),
  updateBranch: (id, data) => axios.put(`/api/branches/${id}`, data),
  deleteBranch: (id) => axios.delete(`/api/branches/${id}`),

  // Products
  getProducts: (params) => axios.get('/api/products', { params }),
  getProductById: (id) => axios.get(`/api/products/${id}`),
  getProductLookups: (params) => axios.get('/api/products/lookups', { params }),
  createProduct: (data) => axios.post('/api/products', data),
  updateProduct: (id, data) => axios.put(`/api/products/${id}`, data),
  deleteProduct: (id) => axios.delete(`/api/products/${id}`),
  searchIngredients: (params) => axios.get('/api/products/ingredients', { params }),

  // Manufacturer + Brand unified API
  getMfgBrands: (params) => axios.get('/api/mfg-brands', { params }),
  getMfgBrandById: (id) => axios.get(`/api/mfg-brands/${id}`),
  createMfgBrand: (data) => axios.post('/api/mfg-brands', data),
  updateMfgBrand: (id, data) => axios.put(`/api/mfg-brands/${id}`, data),
  toggleMfgActive: (id, is_active) => axios.patch(`/api/mfg-brands/${id}/active`, { is_active }),
  importManufacturers: (payload) => axios.post('/api/mfg-brands/import', payload),

  // Categories
  getCategories: () => axios.get('/api/categories'),
  createCategory: (data) => axios.post('/api/categories', data),
  updateCategory: (id, data) => axios.put(`/api/categories/${id}`, data),
  deleteCategory: (id) => axios.delete(`/api/categories/${id}`),

  // Inventory
  getStock: (params) => axios.get('/api/inventory/stock', { params }),
  addStock: (data) => axios.post('/api/inventory/add-stock', data),
  adjustStock: (data) => axios.post('/api/inventory/adjust-stock', data),

  // Sales
  getSales: (params) => axios.get('/api/sales', { params }),
  createSale: (data) => axios.post('/api/sales', data),
  getSaleDetails: (id) => axios.get(`/api/sales/${id}`),

  // Customers
  getCustomers: (params) => axios.get('/api/customers', { params }),
  createCustomer: (data) => axios.post('/api/customers', data),
  updateCustomer: (id, data) => axios.put(`/api/customers/${id}`, data),
  deleteCustomer: (id) => axios.delete(`/api/customers/${id}`),

  // Suppliers
  getSuppliers: (params) => axios.get('/api/suppliers', { params }),
  createSupplier: (data) => axios.post('/api/suppliers', data),
  updateSupplier: (id, data) => axios.put(`/api/suppliers/${id}`, data),
  deleteSupplier: (id) => axios.delete(`/api/suppliers/${id}`),
  getSupplierByGST: (gstNumber) => axios.get(`/api/suppliers/gst/${gstNumber}`),

  // Reports
  getDailySalesReport: (params) => axios.get('/api/reports/daily-sales', { params }),
  getInventoryReport: (params) => axios.get('/api/reports/inventory', { params }),
  getProductPerformanceReport: (params) => axios.get('/api/reports/product-performance', { params }),

  // Purchase Orders
  getPurchaseOrders: (params) => axios.get('/api/purchase-orders', { params }),
  createPurchaseOrder: (data) => axios.post('/api/purchase-orders', data),
  getPurchaseOrderById: (id) => axios.get(`/api/purchase-orders/${id}`),
  receivePurchaseOrder: (id, data) => axios.post(`/api/purchase-orders/${id}/receive`, data),

  // Purchases
  getAllPurchases: (params) => axios.get('/api/purchases', { params }),
  createPurchase: (data) => axios.post('/api/purchases', data),
  getPurchaseById: (id) => axios.get(`/api/purchases/${id}`),
  postPurchaseToStock: (id) => axios.post(`/api/purchases/${id}/post`),

  // Users
  getUsers: (params) => axios.get('/api/users', { params }),
  getUserById: (id) => axios.get(`/api/users/${id}`),
  createUser: (data) => axios.post('/api/users', data),
  updateUser: (id, data) => axios.put(`/api/users/${id}`, data),
  deleteUser: (id) => axios.delete(`/api/users/${id}`),

  // Payments
  getOutstandingSales: (params) => axios.get('/api/payments/outstanding', { params }),
  recordPayment: (data) => axios.post('/api/payments', data),

  // Stock Transfers
  getStockTransfers: (params) => axios.get('/api/stock-transfers', { params }),
  createStockTransfer: (data) => axios.post('/api/stock-transfers', data),
  getStockTransferById: (id) => axios.get(`/api/stock-transfers/${id}`),
  updateTransferStatus: (id, status) => axios.put(`/api/stock-transfers/${id}/status`, { status }),

  // Settings
  getSettings: () => axios.get('/api/settings'),
  updateSettings: (data) => axios.put('/api/settings', data),

  // Roles
  getAllRoles: () => axios.get('/api/roles'),
  getRoleById: (id) => axios.get(`/api/roles/${id}`),
  updateRole: (id, data) => axios.put(`/api/roles/${id}`, data),
  getAllPermissions: () => axios.get('/api/roles/permissions'),
  // createPermission: (payload) => axios.post('/api/roles/permissions', payload),
  
  // UI (role-wise menus)
  getUIMenus: () => axios.get('/api/ui/menus'),

  // Racks
  getRacks: (params) => axios.get('/api/racks', { params }),
  createRack: (data) => axios.post('/api/racks', data),
  updateRack: (id, data) => axios.put(`/api/racks/${id}`, data),
  deleteRack: (id) => axios.delete(`/api/racks/${id}`),

  // Standard Discounts
  getStdDiscounts: (params) => axios.get('/api/std-discounts', { params }),
  createStdDiscount: (data) => axios.post('/api/std-discounts', data),
  updateStdDiscount: (id, data) => axios.put(`/api/std-discounts/${id}`, data),
  deleteStdDiscount: (id) => axios.delete(`/api/std-discounts/${id}`),

  // -----------------------------
  // FACE endpoints (org_id auto)
  // -----------------------------

  /** Enroll a face for a known customer */
  enrollCustomerFace: (customerId, payloadOrBase64) =>
    axios.post(`/api/face/customers/${customerId}/enroll`, withOrgId(payloadOrBase64)),

  /** Identify a customer from webcam frame (payload OR raw base64) */
  identifyCustomerFace: (payloadOrBase64) =>
    axios.post('/api/face/identify', withOrgId(payloadOrBase64)),
};

// ------------------------------------------------------------
// Default export (object) + Named re-exports
// ------------------------------------------------------------
export default api;

// Auth
export const login = api.login;
export const logout = api.logout;
export const changePassword = api.changePassword;

// Dashboard
export const getDashboardStats = api.getDashboardStats;
export const getTopSellingProducts = api.getTopSellingProducts;
export const getRecentSales = api.getRecentSales;
export const getSalesOverTime = api.getSalesOverTime;

// Branches
export const getBranches = api.getBranches;
export const createBranch = api.createBranch;
export const updateBranch = api.updateBranch;
export const deleteBranch = api.deleteBranch;

// Products
export const getProducts = api.getProducts;
export const getProductById = api.getProductById;
export const getProductLookups = api.getProductLookups;
export const createProduct = api.createProduct;
export const updateProduct = api.updateProduct;
export const deleteProduct = api.deleteProduct;
export const searchIngredients = api.searchIngredients;

// Manufacturer + Brand
export const getMfgBrands = api.getMfgBrands;
export const getMfgBrandById = api.getMfgBrandById;
export const createMfgBrand = api.createMfgBrand;
export const updateMfgBrand = api.updateMfgBrand;
export const toggleMfgActive = api.toggleMfgActive;
export const importManufacturers = api.importManufacturers;

// Categories
export const getCategories = api.getCategories;
export const createCategory = api.createCategory;
export const updateCategory = api.updateCategory;
export const deleteCategory = api.deleteCategory;

// Inventory
export const getStock = api.getStock;
export const addStock = api.addStock;
export const adjustStock = api.adjustStock;

// Sales
export const getSales = api.getSales;
export const createSale = api.createSale;
export const getSaleDetails = api.getSaleDetails;

// Customers
export const getCustomers = api.getCustomers;
export const createCustomer = api.createCustomer;
export const updateCustomer = api.updateCustomer;
export const deleteCustomer = api.deleteCustomer;

// Suppliers
export const getSuppliers = api.getSuppliers;
export const createSupplier = api.createSupplier;
export const updateSupplier = api.updateSupplier;
export const deleteSupplier = api.deleteSupplier;
export const getSupplierByGST = api.getSupplierByGST;

// Reports
export const getDailySalesReport = api.getDailySalesReport;
export const getInventoryReport = api.getInventoryReport;
export const getProductPerformanceReport = api.getProductPerformanceReport;

// Purchase Orders
export const getPurchaseOrders = api.getPurchaseOrders;
export const createPurchaseOrder = api.createPurchaseOrder;
export const getPurchaseOrderById = api.getPurchaseOrderById;
export const receivePurchaseOrder = api.receivePurchaseOrder;

// Purchases
export const getAllPurchases = api.getAllPurchases;
export const createPurchase = api.createPurchase;
export const getPurchaseById = api.getPurchaseById;
export const postPurchaseToStock = api.postPurchaseToStock;

// Users
export const getUsers = api.getUsers;
export const getUserById = api.getUserById;
export const createUser = api.createUser;
export const updateUser = api.updateUser;
export const deleteUser = api.deleteUser;

// Payments
export const getOutstandingSales = api.getOutstandingSales;
export const recordPayment = api.recordPayment;

// Stock Transfers
export const getStockTransfers = api.getStockTransfers;
export const createStockTransfer = api.createStockTransfer;
export const getStockTransferById = api.getStockTransferById;
export const updateTransferStatus = api.updateTransferStatus;

// Settings
export const getSettings = api.getSettings;
export const updateSettings = api.updateSettings;

// Roles
export const getAllRoles = api.getAllRoles;
export const getRoleById = api.getRoleById;
export const updateRole = api.updateRole;
export const getAllPermissions = api.getAllPermissions;
// export const createPermission = api.createPermission;

// UI helpers (menus / permissions / features)
export const getUIMenus = () => axios.get('/api/ui/menus');
export const getUIPermissions = () => axios.get('/api/ui/permissions');
export const getUIFeatures = () => axios.get('/api/ui/features');

// Racks
export const getRacks = api.getRacks;
export const createRack = api.createRack;
export const updateRack = api.updateRack;
export const deleteRack = api.deleteRack;

// Standard Discounts
export const getStdDiscounts = api.getStdDiscounts;
export const createStdDiscount = api.createStdDiscount;
export const updateStdDiscount = api.updateStdDiscount;
export const deleteStdDiscount = api.deleteStdDiscount;

// Face
export const enrollCustomerFace = api.enrollCustomerFace;
export const identifyCustomerFace = api.identifyCustomerFace;





// import axios from 'axios';
// import Cookies from 'js-cookie';
// import toast from 'react-hot-toast';
// import Papa from 'papaparse'; // Import PapaParse for CSV parsing

// // Set base URL for all requests
// axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// // axios.defaults.headers.common['Cache-Control'] = 'no-store';
// // axios.defaults.headers.common['Pragma'] = 'no-cache';
// // axios.defaults.headers.common['Expires'] = '0';


// // Request interceptor – attach access token if present
// axios.interceptors.request.use((config) => {
//   const token = Cookies.get('accessToken');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Response interceptor – try refresh flow on 401
// axios.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const original = error.config;

//     if (error.response?.status === 401 && !original._retry && Cookies.get('refreshToken')) {
//       try {
//         original._retry = true;
//         const refreshToken = Cookies.get('refreshToken');
//         const res = await axios.post('/api/auth/refresh', { refreshToken });
//         const { accessToken } = res.data.data;

//         Cookies.set('accessToken', accessToken, { expires: 1 });
//         original.headers.Authorization = `Bearer ${accessToken}`;
//         return axios.request(original);
//       } catch (refreshError) {
//         Cookies.remove('accessToken');
//         Cookies.remove('refreshToken');
//         Cookies.remove('user');
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//     }

//     // Optional toast for other errors
//     if (error.response?.data?.message) {
//       toast.error(error.response.data.message);
//     }

//     return Promise.reject(error);
//   }
// );

// // API methods
// export const api = {
//   // Auth
//   login: (credentials) => axios.post('/api/auth/login', credentials),
//   logout: () => axios.post('/api/auth/logout'),
//   changePassword: (data) => axios.post('/api/auth/change-password', data),

//   // Dashboard
//   getDashboardStats: (params) => axios.get('/api/dashboard/stats', { params }),
//   getTopSellingProducts: (params) => axios.get('/api/dashboard/top-selling', { params }),
//   getRecentSales: (params) => axios.get('/api/dashboard/recent-sales', { params }),
//   getSalesOverTime: (params) => axios.get('/api/dashboard/sales-over-time', { params }),

//   // Branches
//   getBranches: (params) => axios.get('/api/branches', { params }),
//   createBranch: (data) => axios.post('/api/branches', data),
//   updateBranch: (id, data) => axios.put(`/api/branches/${id}`, data),
//   deleteBranch: (id) => axios.delete(`/api/branches/${id}`),

//   // Products
//   getProducts: (params) => axios.get('/api/products', { params }),
//   getProductById: (id) => axios.get(`/api/products/${id}`),
//   // getProductLookups: () => axios.get('/api/products/lookups'),
//   getProductLookups: (params) => axios.get('/api/products/lookups', { params }),
//   createProduct: (data) => axios.post('/api/products', data),
//   updateProduct: (id, data) => axios.put(`/api/products/${id}`, data),
//   deleteProduct: (id) => axios.delete(`/api/products/${id}`),
//   // ✅ hits your backend route; do NOT import server code
//   searchIngredients: (params) => axios.get('/api/products/ingredients', { params }),

//   // // Brands
//   // getBrands: (params) => axios.get('/api/brands', { params }),
//   // getBrandById: (id) => axios.get(`/api/brands/${id}`),
//   // createBrand: (data) => axios.post('/api/brands', data),
//   // updateBrand: (id, data) => axios.put(`/api/brands/${id}`, data),
//   // deleteBrand: (id) => axios.delete(`/api/brands/${id}`),

//   // // Manufacturers
//   // getManufacturers: (params) => axios.get('/api/manufacturers', { params }),
//   // getManufacturerById: (id) => axios.get(`/api/manufacturers/${id}`),
//   // createManufacturer: (data) => axios.post('/api/manufacturers', data),
//   // updateManufacturer: (id, data) => axios.put(`/api/manufacturers/${id}`, data),
//   // deleteManufacturer: (id) => axios.delete(`/api/manufacturers/${id}`),
//   // importManufacturers: (payload) => axios.post('/api/manufacturers/import', payload),

//   // Manufacturer + Brand unified API
//   getMfgBrands: (params) => axios.get('/api/mfg-brands', { params }),
//   getMfgBrandById: (id) => axios.get(`/api/mfg-brands/${id}`),
//   createMfgBrand: (data) => axios.post('/api/mfg-brands', data),
//   updateMfgBrand: (id, data) => axios.put(`/api/mfg-brands/${id}`, data),
//   toggleMfgActive: (id, is_active) => axios.patch(`/api/mfg-brands/${id}/active`, { is_active }),
//   importManufacturers: (payload) => axios.post('/api/mfg-brands/import', payload),
  

//   // Categories
//   getCategories: () => axios.get('/api/categories'),
//   createCategory: (data) => axios.post('/api/categories', data),
//   updateCategory: (id, data) => axios.put(`/api/categories/${id}`, data),
//   deleteCategory: (id) => axios.delete(`/api/categories/${id}`),

//   // Inventory
//   getStock: (params) => axios.get('/api/inventory/stock', { params }),
//   addStock: (data) => axios.post('/api/inventory/add-stock', data),
//   adjustStock: (data) => axios.post('/api/inventory/adjust-stock', data),

//   // Sales
//   getSales: (params) => axios.get('/api/sales', { params }),
//   createSale: (data) => axios.post('/api/sales', data),
//   getSaleDetails: (id) => axios.get(`/api/sales/${id}`),

//   // Customers
//   getCustomers: (params) => axios.get('/api/customers', { params }),
//   createCustomer: (data) => axios.post('/api/customers', data),
//   updateCustomer: (id, data) => axios.put(`/api/customers/${id}`, data),
//   deleteCustomer: (id) => axios.delete(`/api/customers/${id}`),

//   // Suppliers
//   getSuppliers: (params) => axios.get('/api/suppliers', { params }),
//   createSupplier: (data) => axios.post('/api/suppliers', data),
//   updateSupplier: (id, data) => axios.put(`/api/suppliers/${id}`, data),
//   deleteSupplier: (id) => axios.delete(`/api/suppliers/${id}`),
//   getSupplierByGST: (gstNumber) => axios.get(`/api/suppliers/gst/${gstNumber}`),

//   // Reports
//   getDailySalesReport: (params) => axios.get('/api/reports/daily-sales', { params }),
//   getInventoryReport: (params) => axios.get('/api/reports/inventory', { params }),
//   getProductPerformanceReport: (params) => axios.get('/api/reports/product-performance', { params }),

//   // Purchase Orders
//   getPurchaseOrders: (params) => axios.get('/api/purchase-orders', { params }),
//   createPurchaseOrder: (data) => axios.post('/api/purchase-orders', data),
//   getPurchaseOrderById: (id) => axios.get(`/api/purchase-orders/${id}`),
//   receivePurchaseOrder: (id, data) => axios.post(`/api/purchase-orders/${id}/receive`, data),

//   // Purchases
//   getAllPurchases: (params) => axios.get('/api/purchases', { params }),
//   createPurchase: (data) => axios.post('/api/purchases', data),
//   getPurchaseById: (id) => axios.get(`/api/purchases/${id}`),
//   postPurchaseToStock: (id) => axios.post(`/api/purchases/${id}/post`),

//   // Users
//   getUsers: (params) => axios.get('/api/users', { params }),
//   getUserById: (id) => axios.get(`/api/users/${id}`),
//   createUser: (data) => axios.post('/api/users', data),
//   updateUser: (id, data) => axios.put(`/api/users/${id}`, data),
//   deleteUser: (id) => axios.delete(`/api/users/${id}`),

//   // Payments
//   getOutstandingSales: (params) => axios.get('/api/payments/outstanding', { params }),
//   recordPayment: (data) => axios.post('/api/payments', data),

//   // Stock Transfers
//   getStockTransfers: (params) => axios.get('/api/stock-transfers', { params }),
//   createStockTransfer: (data) => axios.post('/api/stock-transfers', data),
//   getStockTransferById: (id) => axios.get(`/api/stock-transfers/${id}`),
//   updateTransferStatus: (id, status) => axios.put(`/api/stock-transfers/${id}/status`, { status }),

//   // Settings
//   getSettings: () => axios.get('/api/settings'),
//   updateSettings: (data) => axios.put('/api/settings', data),

//   // Roles
//   getAllRoles: () => axios.get('/api/roles'),
//   getRoleById: (id) => axios.get(`/api/roles/${id}`),
//   updateRole: (id, data) => axios.put(`/api/roles/${id}`, data),
//   getAllPermissions: () => axios.get('/api/roles/permissions'),

//   // Racks
// getRacks: (params) => axios.get('/api/racks', { params }),
// createRack: (data) => axios.post('/api/racks', data),
// updateRack: (id, data) => axios.put(`/api/racks/${id}`, data),
// deleteRack: (id) => axios.delete(`/api/racks/${id}`),

// // Standard Discounts
// getStdDiscounts: (params) => axios.get('/api/std-discounts', { params }),
// createStdDiscount: (data) => axios.post('/api/std-discounts', data),
// updateStdDiscount: (id, data) => axios.put(`/api/std-discounts/${id}`, data),
// deleteStdDiscount: (id) => axios.delete(`/api/std-discounts/${id}`),

// // -----------------------------
//   // FACE: new endpoints (frontend)
//   // -----------------------------

//   // Enroll a face template for a known customer
//   // payload: { imageBase64, org_id, imageUrl? }
//   enrollCustomerFace: (customerId, payload) => axios.post(`/api/face/customers/${customerId}/enroll`, payload),

//   // Identify a customer by a webcam frame (POS)
//   // payload: { imageBase64, org_id, store_id?, pos_id? }
//   identifyCustomerFace: (payload) => axios.post('/api/face/identify', payload),

// };

// export default api;
