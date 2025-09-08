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
// Prefer explicit env; otherwise, in dev use Vite proxy (same-origin) if enabled
const DEV_DEFAULT_API = import.meta.env.VITE_DEV_API_URL || 'http://localhost:3001';
const isViteDev = !!import.meta.env.DEV;
const hasProxyTarget = !!import.meta.env.VITE_API_PROXY_TARGET;
const allowDevMocksTop = String(import.meta.env.VITE_DEV_MOCKS ?? 'false').toLowerCase() === 'true';
const useProxy = hasProxyTarget && String(import.meta.env.VITE_USE_PROXY ?? 'true').toLowerCase() === 'true';
let BASE_URL = import.meta.env.VITE_API_URL || '';
if (isViteDev && (useProxy || allowDevMocksTop)) {
  // Use relative URLs so Vite dev server proxy can forward to backend
  BASE_URL = '';
} else if (!BASE_URL) {
  BASE_URL = isViteDev ? DEV_DEFAULT_API : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002');
}
axios.defaults.baseURL = BASE_URL;
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v2';

// ------------------------------------------------------------
// Dev request adapter mocks (avoid hitting network and 404s in dev)
// ------------------------------------------------------------
axios.interceptors.request.use((config) => {
  const DEV = !!import.meta.env.DEV;
  const allowDevMocks = String(import.meta.env.VITE_DEV_MOCKS ?? 'false').toLowerCase() === 'true';
  if (!DEV || !allowDevMocks) return config;

  const url = String(config.url || '');
  const method = String(config.method || 'get').toLowerCase();
  const wrap = (payload) => ({ status: 200, data: payload, headers: {}, config, request: null });
  const setAdapter = (factory) => { config.adapter = async () => factory(); return config; };

  try {
    // Auth
    if (url.includes(`${API_PREFIX}/auth/login`) && method === 'post') {
      const now = Date.now();
      const mockUser = {
        id: 1, first_name: 'Dev', last_name: 'User', email: 'dev@example.com',
        role_id: 1, default_branch_id: 1, branch_name: 'Main', accessibleBranches: [{ id: 1, name: 'Main' }],
      };
      return setAdapter(() => wrap({ data: { user: mockUser, accessToken: `dev.${now}.token`, refreshToken: `dev.${now}.refresh` } }));
    }
    if (url.includes(`${API_PREFIX}/auth/refresh`) && method === 'post') {
      const now = Date.now();
      return setAdapter(() => wrap({ data: { accessToken: `dev.${now}.token` } }));
    }
    if (url.includes(`${API_PREFIX}/ui/bootstrap`)) {
      const mockUser = {
        id: 1, first_name: 'Dev', last_name: 'User', email: 'dev@example.com',
        role_id: 1, default_branch_id: 1, branch_name: 'Main', accessibleBranches: [{ id: 1, name: 'Main' }],
      };
      return setAdapter(() => wrap({ data: { data: { me: mockUser } } }));
    }

    // UI metadata
    if (url.includes(`${API_PREFIX}/ui/menus`)) {
      return setAdapter(() => wrap({ data: [
        { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
        { key: 'sales', label: 'Sales', path: '/sales' },
        { key: 'inventory', label: 'Inventory', path: '/inventory' },
      ] }));
    }
    if (url.includes(`${API_PREFIX}/ui/permissions`)) {
      return setAdapter(() => wrap({ data: [] }));
    }
    if (url.includes(`${API_PREFIX}/ui/features`)) {
      return setAdapter(() => wrap({ data: {} }));
    }

    // RBAC/roles
    const roleMatch = url.match(new RegExp(`${API_PREFIX.replace(/\//g, '\\/')}/roles/(\\d+)`));
    if (roleMatch) {
      const id = Number(roleMatch[1] || '0');
      return setAdapter(() => wrap({ data: { data: { id, name: `role_${id}`, permissions: [] } } }));
    }

    // Dashboard
    if (url.includes(`${API_PREFIX}/dashboard/`)) {
      return setAdapter(() => wrap({ data: [] }));
    }
  } catch {}

  return config;
});

// Attach Authorization header from cookie if present
axios.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh on 401 then retry once
axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config || {};
    if (error?.response?.status === 401 && !original._retry && Cookies.get('refreshToken')) {
      try {
        original._retry = true;
        const refreshToken = Cookies.get('refreshToken');
        const res = await axios.post(`${API_PREFIX}/auth/refresh`, { refreshToken });
        const accessToken = res?.data?.data?.accessToken;
        if (accessToken) {
          Cookies.set('accessToken', accessToken, { expires: 1 });
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${accessToken}`;
          return axios.request(original);
        }
      } catch (e) {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
      }
    }
    return Promise.reject(error);
  }
);

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

// ... existing imports and setup

// Add this below axios.defaults.* lines:
export function setActiveBranchId(branchId) {
  if (branchId == null || Number.isNaN(Number(branchId))) {
    delete axios.defaults.headers.common['x-branch-id'];
  } else {
    axios.defaults.headers.common['x-branch-id'] = String(branchId);
  }
}

// keep existing axios interceptors...

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
    const isNetworkError = !error.response;
    const DEV = !!import.meta.env.DEV;
    const allowDevMocks = String(import.meta.env.VITE_DEV_MOCKS ?? 'true').toLowerCase() === 'true';

    // In dev, gracefully mock common UI endpoints when backend is unreachable
    if ((isNetworkError || [404,502,503,504].includes(error?.response?.status)) && DEV && allowDevMocks && original?.url) {
      const url = String(original.url || '');
      const wrap = (payload) => ({ status: 200, data: payload, headers: {}, config: original, request: null });
      try {
        // Auth mocks
        if (url.includes('/auth/login') && String(original.method || 'get').toLowerCase() === 'post') {
          const now = Date.now();
          const mockUser = {
            id: 1,
            first_name: 'Dev',
            last_name: 'User',
            email: 'dev@example.com',
            role_id: 1,
            default_branch_id: 1,
            branch_name: 'Main',
          };
          return wrap({ data: { user: mockUser, accessToken: `dev.${now}.token`, refreshToken: `dev.${now}.refresh` } });
        }
        if (url.includes('/auth/refresh') && String(original.method || 'get').toLowerCase() === 'post') {
          const now = Date.now();
          return wrap({ data: { accessToken: `dev.${now}.token` } });
        }
        if (url.includes('/ui/bootstrap')) {
          const mockUser = {
            id: 1,
            first_name: 'Dev',
            last_name: 'User',
            email: 'dev@example.com',
            role_id: 1,
            default_branch_id: 1,
            branch_name: 'Main',
            accessibleBranches: [{ id: 1, name: 'Main' }],
          };
          return wrap({ data: { data: { me: mockUser } } });
        }
        if (url.includes('/ui/menus')) {
          return wrap({ data: [
            { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
            { key: 'sales', label: 'Sales', path: '/sales' },
            { key: 'inventory', label: 'Inventory', path: '/inventory' },
          ]});
        }
        if (url.includes('/ui/permissions')) {
          return wrap({ data: [] });
        }
        if (url.includes('/ui/features')) {
          return wrap({ data: {} });
        }
        if (/\/roles\/(\d+)/.test(url)) {
          const id = Number((url.match(/\/roles\/(\d+)/) || [])[1] || '0');
          return wrap({ data: { data: { id, name: `role_${id}`, permissions: [] } } });
        }
        if (url.includes('/dashboard/')) {
          return wrap({ data: [] });
        }
      } catch {}
    }
    if (error.response?.status === 401 && !original._retry && Cookies.get('refreshToken')) {
      try {
        original._retry = true;
        const refreshToken = Cookies.get('refreshToken');
        const res = await axios.post(`${API_PREFIX}/auth/refresh`, { refreshToken });
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
  login: (credentials) => axios.post(`${API_PREFIX}/auth/login`, credentials),
  logout: () => axios.post(`${API_PREFIX}/auth/logout`),
  changePassword: (data) => axios.post(`${API_PREFIX}/auth/change-password`, data),

  // Dashboard
  getDashboardStats: (params) => axios.get(`${API_PREFIX}/dashboard/stats`, { params }),
  getTopSellingProducts: (params) => axios.get(`${API_PREFIX}/dashboard/top-selling`, { params }),
  getRecentSales: (params) => axios.get(`${API_PREFIX}/dashboard/recent-sales`, { params }),
  getSalesOverTime: (params) => axios.get(`${API_PREFIX}/dashboard/sales-over-time`, { params }),

  // Branches
  getBranches: (params) => axios.get(`${API_PREFIX}/branches`, { params }),
  createBranch: (data) => axios.post(`${API_PREFIX}/branches`, data),
  updateBranch: (id, data) => axios.put(`${API_PREFIX}/branches/${id}`, data),
  deleteBranch: (id) => axios.delete(`${API_PREFIX}/branches/${id}`),

  // Products
  getProducts: (params) => axios.get(`${API_PREFIX}/products`, { params }),
  getProductById: (id) => axios.get(`${API_PREFIX}/products/${id}`),
  getProductLookups: (params) => axios.get(`${API_PREFIX}/products/lookups`, { params }),
  createProduct: (data) => axios.post(`${API_PREFIX}/products`, data),
  updateProduct: (id, data) => axios.put(`${API_PREFIX}/products/${id}`, data),
  deleteProduct: (id) => axios.delete(`${API_PREFIX}/products/${id}`),
  searchIngredients: (params) => axios.get(`${API_PREFIX}/products/ingredients`, { params }),

  // Manufacturer + Brand unified API
  getMfgBrands: (params) => axios.get(`${API_PREFIX}/mfg-brands`, { params }),
  getMfgBrandById: (id) => axios.get(`${API_PREFIX}/mfg-brands/${id}`),
  createMfgBrand: (data) => axios.post(`${API_PREFIX}/mfg-brands`, data),
  updateMfgBrand: (id, data) => axios.put(`${API_PREFIX}/mfg-brands/${id}`, data),
  toggleMfgActive: (id, is_active) => axios.patch(`${API_PREFIX}/mfg-brands/${id}/active`, { is_active }),
  importManufacturers: (payload) => axios.post(`${API_PREFIX}/mfg-brands/import`, payload),

  // Categories
  getCategories: () => axios.get(`${API_PREFIX}/categories`),
  createCategory: (data) => axios.post(`${API_PREFIX}/categories`, data),
  updateCategory: (id, data) => axios.put(`${API_PREFIX}/categories/${id}`, data),
  deleteCategory: (id) => axios.delete(`${API_PREFIX}/categories/${id}`),

  // Inventory
  getStock: (params) => axios.get(`${API_PREFIX}/inventory/stock`, { params }),
  addStock: (data) => axios.post(`${API_PREFIX}/inventory/add-stock`, data),
  adjustStock: (data) => axios.post(`${API_PREFIX}/inventory/adjust-stock`, data),

  // Sales
  getSales: (params) => axios.get(`${API_PREFIX}/sales`, { params }),
  createSale: (data) => axios.post(`${API_PREFIX}/sales`, data),
  getSaleDetails: (id) => axios.get(`${API_PREFIX}/sales/${id}`),

  // Customers
  getCustomers: (params) => axios.get(`${API_PREFIX}/customers`, { params }),
  createCustomer: (data) => axios.post(`${API_PREFIX}/customers`, data),
  updateCustomer: (id, data) => axios.put(`${API_PREFIX}/customers/${id}`, data),
  deleteCustomer: (id) => axios.delete(`${API_PREFIX}/customers/${id}`),

  // Suppliers
  getSuppliers: (params) => axios.get(`${API_PREFIX}/suppliers`, { params }),
  createSupplier: (data) => axios.post(`${API_PREFIX}/suppliers`, data),
  updateSupplier: (id, data) => axios.put(`${API_PREFIX}/suppliers/${id}`, data),
  deleteSupplier: (id) => axios.delete(`${API_PREFIX}/suppliers/${id}`),
  getSupplierByGST: (gstNumber) => axios.get(`${API_PREFIX}/suppliers/gst/${gstNumber}`),

  // Reports
  getDailySalesReport: (params) => axios.get(`${API_PREFIX}/reports/daily-sales`, { params }),
  getInventoryReport: (params) => axios.get(`${API_PREFIX}/reports/inventory`, { params }),
  getProductPerformanceReport: (params) => axios.get(`${API_PREFIX}/reports/product-performance`, { params }),

  // Purchase Orders
  getPurchaseOrders: (params) => axios.get(`${API_PREFIX}/purchase-orders`, { params }),
  createPurchaseOrder: (data) => axios.post(`${API_PREFIX}/purchase-orders`, data),
  getPurchaseOrderById: (id) => axios.get(`${API_PREFIX}/purchase-orders/${id}`),
  receivePurchaseOrder: (id, data) => axios.post(`${API_PREFIX}/purchase-orders/${id}/receive`, data),

  // Purchases
  getAllPurchases: (params) => axios.get(`${API_PREFIX}/purchases`, { params }),
  createPurchase: (data) => axios.post(`${API_PREFIX}/purchases`, data),
  getPurchaseById: (id) => axios.get(`${API_PREFIX}/purchases/${id}`),
  postPurchaseToStock: (id) => axios.post(`${API_PREFIX}/purchases/${id}/post`),

  // Users
  getUsers: (params) => axios.get(`${API_PREFIX}/users`, { params }),
  getUserById: (id) => axios.get(`${API_PREFIX}/users/${id}`),
  createUser: (data) => axios.post(`${API_PREFIX}/users`, data),
  updateUser: (id, data) => axios.put(`${API_PREFIX}/users/${id}`, data),
  deleteUser: (id) => axios.delete(`${API_PREFIX}/users/${id}`),

  // Payments
  getOutstandingSales: (params) => axios.get(`${API_PREFIX}/payments/outstanding`, { params }),
  recordPayment: (data) => axios.post(`${API_PREFIX}/payments`, data),

  // Stock Transfers
  getStockTransfers: (params) => axios.get(`${API_PREFIX}/transfers`, { params }),
  createStockTransfer: (data) => axios.post(`${API_PREFIX}/transfers`, data),
  getStockTransferById: (id) => axios.get(`${API_PREFIX}/transfers/${id}`),
  updateTransferStatus: (id, status) => axios.put(`${API_PREFIX}/transfers/${id}/status`, { status }),

  // Settings
  getSettings: () => axios.get(`${API_PREFIX}/settings`),
  updateSettings: (data) => axios.put(`${API_PREFIX}/settings`, data),

  // Roles
  getAllRoles: () => axios.get(`${API_PREFIX}/roles`),
  getRoleById: (id) => axios.get(`${API_PREFIX}/roles/${id}`),
  updateRole: (id, data) => axios.put(`${API_PREFIX}/roles/${id}`, data),
  getAllPermissions: () => axios.get(`${API_PREFIX}/roles/permissions`),
  createPermission: (payload) => axios.post(`${API_PREFIX}/roles/permissions`, payload),

  // ABAC policies
  getAbacPolicies: () => axios.get(`${API_PREFIX}/abac/policies`),
  updateAbacPolicies: (payload) => axios.put(`${API_PREFIX}/abac/policies`, payload),
  // createPermission: (payload) => axios.post('/api/roles/permissions', payload),
  
  // UI (role-wise menus)
  getUIMenus: () => axios.get(`${API_PREFIX}/ui/menus`),

  // Racks
  getRacks: (params) => axios.get(`${API_PREFIX}/racks`, { params }),
  createRack: (data) => axios.post(`${API_PREFIX}/racks`, data),
  updateRack: (id, data) => axios.put(`${API_PREFIX}/racks/${id}`, data),
  deleteRack: (id) => axios.delete(`${API_PREFIX}/racks/${id}`),

  // Standard Discounts
  getStdDiscounts: (params) => axios.get(`${API_PREFIX}/discounts`, { params }),
  createStdDiscount: (data) => axios.post(`${API_PREFIX}/discounts`, data),
  updateStdDiscount: (id, data) => axios.put(`${API_PREFIX}/discounts/${id}`, data),
  deleteStdDiscount: (id) => axios.delete(`${API_PREFIX}/discounts/${id}`),

// UI menu bindings (only if your backend has these endpoints)
  getMenuBindings: (role_id) => axios.get('/api/ui/menus/bindings', { params: { role_id } }),
  updateMenuBindings: (payload) => axios.put('/api/ui/menus/bindings', payload),


  // -----------------------------
  // FACE endpoints (org_id auto)
  // -----------------------------

  /** Enroll a face for a known customer */
  enrollCustomerFace: (customerId, payloadOrBase64) =>
    axios.post(`${API_PREFIX}/face/customers/${customerId}/enroll`, withOrgId(payloadOrBase64)),

  /** Identify a customer from webcam frame (payload OR raw base64) */
  identifyCustomerFace: (payloadOrBase64) =>
    axios.post(`${API_PREFIX}/face/identify`, withOrgId(payloadOrBase64)),
};

// ------------------------------------------------------------
// Default export (object) + Named re-exports
// ------------------------------------------------------------
export default api;

// Auth
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
export const createPermission = api.createPermission;

// UI helpers (menus / permissions / features)
export const getUIMenus = () => axios.get(`${API_PREFIX}/ui/menus`);
export const getUIPermissions = () => axios.get(`${API_PREFIX}/ui/permissions`);
export const getUIFeatures = () => axios.get(`${API_PREFIX}/ui/features`);
export const getUIBootstrap = () => axios.get(`${API_PREFIX}/ui/bootstrap`);

// Auth (v2)
export const login = (payload) => axios.post(`${API_PREFIX}/auth/login`, payload);
export const refresh = (payload) => axios.post(`${API_PREFIX}/auth/refresh`, payload);
export const logoutApi = () => axios.post(`${API_PREFIX}/auth/logout`);
export const logoutAll = () => axios.post(`${API_PREFIX}/auth/logout-all`);

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

// UI menu bindings
// Use backend when VITE_MENU_BINDINGS_BACKEND === 'true', otherwise store in localStorage
const MENU_BINDINGS_BACKEND = String(import.meta.env.VITE_MENU_BINDINGS_BACKEND || '').toLowerCase() === 'true';
api.getMenuBindings = async (role_id) => {
  if (!MENU_BINDINGS_BACKEND) {
    const key = `ui:menu-bindings:${role_id}`;
    const bindings = JSON.parse(localStorage.getItem(key) || '[]');
    return { data: { bindings } };
  }
  // Backend mode
  return axios.get(`${API_PREFIX}/ui/menus/bindings`, {
    params: { role_id },
    validateStatus: () => true, // don't throw for 404; let caller/fallback handle
  }).then((res) => {
    if (res.status === 404) {
      const key = `ui:menu-bindings:${role_id}`;
      const bindings = JSON.parse(localStorage.getItem(key) || '[]');
      return { data: { bindings } };
    }
    return res;
  });
};
api.updateMenuBindings = async (payload) => {
  const roleId = payload?.role_id;
  const allowed = Array.isArray(payload?.allowed_keys) ? payload.allowed_keys : [];
  if (!MENU_BINDINGS_BACKEND) {
    const key = `ui:menu-bindings:${roleId}`;
    localStorage.setItem(key, JSON.stringify(allowed));
    return { data: { ok: true, bindings: allowed } };
  }
  // Backend mode
  return axios.put(`${API_PREFIX}/ui/menus/bindings`, payload, {
    validateStatus: () => true,
  }).then((res) => {
    if (res.status === 404) {
      const key = `ui:menu-bindings:${roleId}`;
      localStorage.setItem(key, JSON.stringify(allowed));
      return { data: { ok: true, bindings: allowed } };
    }
    return res;
  });
};

// named exports (optional)
export const getMenuBindings = api.getMenuBindings;
export const updateMenuBindings = api.updateMenuBindings;

// ABAC
export const getAbacPolicies = () => axios.get(`${API_PREFIX}/abac/policies`);

// Seed menus (optional backend route)
export const seedMenus = (payload) => axios.post(`${API_PREFIX}/ui/menus/seed`, payload);

// Menu management (backend should implement these; seedMenus acts as upsert)
export const upsertMenus = (items) => seedMenus({ items, mode: 'upsert' });
export const deleteMenu = (key) => axios.delete(`${API_PREFIX}/ui/menus/${encodeURIComponent(key)}`);

// Role permission management (backend should implement one of these)
export const updateRolePermissions = async (roleId, permissions) => {
  // Try dedicated endpoint first
  try {
    const res = await axios.put(`${API_PREFIX}/roles/${roleId}/permissions`, { permissions });
    if (res && res.status < 400) return res;
  } catch {}
  // Fallback to updating role with permissions array
  return axios.put(`${API_PREFIX}/roles/${roleId}`, { permissions });
};
