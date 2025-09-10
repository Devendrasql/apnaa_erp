// Centralized permission keys to avoid string drift across the app
// Grouped by domain for readability. Keep values aligned with backend names.

export const PERMS = {
  DASHBOARD: { VIEW: 'dashboard:view' },
  UI: { READ: 'ui:read' },

  PRODUCTS: {
    CREATE: 'products:create',
    READ: 'products:read',
    UPDATE: 'products:update',
    DELETE: 'products:delete',
    MANAGE: 'products:manage',
  },
  CATEGORIES: {
    CREATE: 'category:create',
    READ: 'category:read',
    UPDATE: 'category:update',
    DELETE: 'category:delete',
    MANAGE: 'category:manage',
  },
  INVENTORY: {
    CREATE: 'inventory:create',
    READ: 'inventory:read',
    UPDATE: 'inventory:update',
    DELETE: 'inventory:delete',
    MANAGE: 'inventory:manage',
  },
  SALES: {
    CREATE: 'sales:create',
    READ: 'sales:read',
    UPDATE: 'sales:update',
    DELETE: 'sales:delete',
    MANAGE: 'sales:manage',
  },
  POS: { USE: 'pos:use' },
  CUSTOMERS: {
    CREATE: 'customers:create',
    READ: 'customers:read',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete',
    MANAGE: 'customers:manage',
  },
  REPORTS: { READ: 'reports:read' },
  BRANCHES: {
    CREATE: 'branches:create',
    READ: 'branches:read',
    UPDATE: 'branches:update',
    DELETE: 'branches:delete',
    MANAGE: 'branches:manage',
  },
  SUPPLIERS: {
    CREATE: 'suppliers:create',
    READ: 'suppliers:read',
    UPDATE: 'suppliers:update',
    DELETE: 'suppliers:delete',
    MANAGE: 'suppliers:manage',
  },
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    MANAGE: 'users:manage',
  },
  ROLES: {
    CREATE: 'roles:create',
    READ: 'roles:read',
    UPDATE: 'roles:update',
    DELETE: 'roles:delete',
    MANAGE: 'roles:manage',
  },
  PAYMENTS: {
    CREATE: 'payments:create',
    READ: 'payments:read',
    UPDATE: 'payments:update',
    DELETE: 'payments:delete',
    MANAGE: 'payments:manage',
  },
  SETTINGS: {
    CREATE: 'settings:create',
    READ: 'settings:read',
    UPDATE: 'settings:update',
    DELETE: 'settings:delete',
    MANAGE: 'settings:manage',
  },

  PURCHASES: {
    CREATE: 'purchases:create',
    READ: 'purchases:read',
    UPDATE: 'purchases:update',
    DELETE: 'purchases:delete',
    MANAGE: 'purchases:manage',
  },
  PURCHASE_ORDERS: {
    CREATE: 'purchase_orders:create',
    READ: 'purchase_orders:read',
    UPDATE: 'purchase_orders:update',
    DELETE: 'purchase_orders:delete',
    MANAGE: 'purchase_orders:manage',
  },
  TRANSFERS: {
    CREATE: 'transfers:create',
    READ: 'transfers:read',
    UPDATE: 'transfers:update',
    DELETE: 'transfers:delete',
    MANAGE: 'transfers:manage',
  },

  MENUS: { MANAGE: 'menus:manage' },
  ABAC: { MANAGE: 'abac:manage' },

  // Alternative/legacy keys present in some UI pieces
  LEGACY: {
    RBAC_MENU_MANAGE: 'rbac.menu.manage',
    ABAC_POLICY_MANAGE: 'abac.policy.manage',
    PROCUREMENT_PO_VIEW: 'procurement.po.view',
  },
};

export default PERMS;

