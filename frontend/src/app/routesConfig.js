// Central metadata for routes: path, title, and default permissions
// Note: Dynamic segments (e.g., :id) should come after their base path in lookups
import { PERMS } from '@/security/permissions';

export const routeMeta = [
  { path: '/dashboard', title: 'Dashboard', any: [PERMS.DASHBOARD.VIEW, PERMS.UI.READ] },

  { path: '/products', title: 'Products', any: [PERMS.PRODUCTS.READ, PERMS.PRODUCTS.MANAGE] },
  { path: '/inventory', title: 'Inventory', any: [PERMS.INVENTORY.READ, PERMS.INVENTORY.MANAGE] },
  { path: '/sales', title: 'Sales', any: [PERMS.SALES.READ, PERMS.SALES.MANAGE] },
  { path: '/sales/:id', title: 'Sale Details', privateOnly: true },
  { path: '/pos', title: 'Point of Sale', any: [PERMS.POS.USE, PERMS.SALES.MANAGE] },
  { path: '/invoice/:id', title: 'Invoice', any: [PERMS.SALES.READ, PERMS.SALES.MANAGE] },

  { path: '/customers', title: 'Customers', any: [PERMS.CUSTOMERS.READ, PERMS.CUSTOMERS.MANAGE] },
  { path: '/reports', title: 'Reports', any: [PERMS.REPORTS.READ, PERMS.INVENTORY.MANAGE] },

  { path: '/branches', title: 'Branches', any: [PERMS.BRANCHES.READ, PERMS.BRANCHES.MANAGE] },
  { path: '/suppliers', title: 'Suppliers', any: [PERMS.SUPPLIERS.READ, PERMS.SUPPLIERS.MANAGE] },
  { path: '/users', title: 'Users', any: [PERMS.USERS.READ, PERMS.USERS.MANAGE] },
  { path: '/roles', title: 'Roles', any: [PERMS.ROLES.READ, PERMS.ROLES.MANAGE] },
  { path: '/payments', title: 'Payments', any: [PERMS.PAYMENTS.READ, PERMS.PAYMENTS.MANAGE] },
  { path: '/settings', title: 'Settings', any: [PERMS.SETTINGS.READ, PERMS.SETTINGS.MANAGE] },

  { path: '/categories', title: 'Categories', any: [PERMS.CATEGORIES.READ, PERMS.CATEGORIES.MANAGE] },
  { path: '/manufacturers', title: 'Manufacturers', any: [PERMS.PRODUCTS.READ, PERMS.PRODUCTS.MANAGE] },
  { path: '/manufacturers/import', title: 'Import Manufacturers', any: [PERMS.PRODUCTS.MANAGE, PERMS.INVENTORY.MANAGE] },

  { path: '/purchase-orders', title: 'Purchase Orders', any: [PERMS.PURCHASE_ORDERS.READ, PERMS.PURCHASES.MANAGE] },
  { path: '/purchase-orders/:id', title: 'Purchase Order', any: [PERMS.PURCHASE_ORDERS.READ, PERMS.PURCHASES.MANAGE] },
  { path: '/purchases', title: 'Purchases', any: [PERMS.PURCHASES.READ, PERMS.PURCHASES.MANAGE] },
  { path: '/purchases/:id', title: 'Purchase Details', any: [PERMS.PURCHASES.READ, PERMS.PURCHASES.MANAGE] },

  { path: '/stock-transfers', title: 'Stock Transfers', any: [PERMS.TRANSFERS.READ, PERMS.INVENTORY.MANAGE] },
  { path: '/stock-transfers/:id', title: 'Stock Transfer', any: [PERMS.TRANSFERS.READ, PERMS.INVENTORY.MANAGE] },

  { path: '/menu-access', title: 'Menu Access', any: [PERMS.MENUS.MANAGE, PERMS.ROLES.MANAGE] },
  { path: '/admin/menus', title: 'Menu Manager', any: [PERMS.MENUS.MANAGE, PERMS.ROLES.MANAGE] },
  { path: '/abac-policies', title: 'ABAC Policies', any: [PERMS.ABAC.MANAGE, PERMS.ROLES.MANAGE] },

  { path: '/403', title: 'Not Authorized', privateOnly: true },
  { path: '/404', title: 'Not Found', privateOnly: true },
];
