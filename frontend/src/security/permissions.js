// Centralized permission keys to avoid string drift across the app
// Grouped by domain for readability. Keep values aligned with backend names.

export const PERMS = {
  DASHBOARD: { VIEW: 'dashboard:view' },
  UI: { READ: 'ui:read' },

  PRODUCTS: { READ: 'products:read', MANAGE: 'products:manage' },
  CATEGORIES: { READ: 'categories:read', MANAGE: 'categories:manage' },
  INVENTORY: { READ: 'inventory:read', MANAGE: 'inventory:manage' },
  SALES: { READ: 'sales:read', MANAGE: 'sales:manage' },
  POS: { USE: 'pos:use' },
  CUSTOMERS: { READ: 'customers:read', MANAGE: 'customers:manage' },
  REPORTS: { READ: 'reports:read' },
  BRANCHES: { READ: 'branches:read', MANAGE: 'branches:manage' },
  SUPPLIERS: { READ: 'suppliers:read', MANAGE: 'suppliers:manage' },
  USERS: { READ: 'users:read', MANAGE: 'users:manage' },
  ROLES: { READ: 'roles:read', MANAGE: 'roles:manage' },
  PAYMENTS: { READ: 'payments:read', MANAGE: 'payments:manage' },
  SETTINGS: { READ: 'settings:read', MANAGE: 'settings:manage' },

  PURCHASES: { READ: 'purchases:read', MANAGE: 'purchases:manage' },
  PURCHASE_ORDERS: { READ: 'purchase_orders:read' },
  TRANSFERS: { READ: 'transfers:read' },

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

