// Central metadata for routes: path, title, and default permissions
// Note: Dynamic segments (e.g., :id) should come after their base path in lookups

export const routeMeta = [
  { path: '/dashboard', title: 'Dashboard', any: ['dashboard:view', 'ui:read'] },

  { path: '/products', title: 'Products', any: ['products:read', 'products:manage'] },
  { path: '/inventory', title: 'Inventory', any: ['inventory:read', 'inventory:manage'] },
  { path: '/sales', title: 'Sales', any: ['sales:read', 'sales:manage'] },
  { path: '/sales/:id', title: 'Sale Details', privateOnly: true },
  { path: '/pos', title: 'Point of Sale', any: ['pos:use', 'sales:manage'] },
  { path: '/invoice/:id', title: 'Invoice', any: ['sales:read', 'sales:manage'] },

  { path: '/customers', title: 'Customers', any: ['customers:read', 'customers:manage'] },
  { path: '/reports', title: 'Reports', any: ['reports:read', 'inventory:manage'] },

  { path: '/branches', title: 'Branches', any: ['branches:read', 'branches:manage'] },
  { path: '/suppliers', title: 'Suppliers', any: ['suppliers:read', 'suppliers:manage'] },
  { path: '/users', title: 'Users', any: ['users:read', 'users:manage'] },
  { path: '/roles', title: 'Roles', any: ['roles:read', 'roles:manage'] },
  { path: '/payments', title: 'Payments', any: ['payments:read', 'payments:manage'] },
  { path: '/settings', title: 'Settings', any: ['settings:read', 'settings:manage'] },

  { path: '/categories', title: 'Categories', any: ['categories:read', 'categories:manage'] },
  { path: '/manufacturers', title: 'Manufacturers', any: ['products:read', 'products:manage'] },
  { path: '/manufacturers/import', title: 'Import Manufacturers', any: ['products:manage', 'inventory:manage'] },

  { path: '/purchase-orders', title: 'Purchase Orders', any: ['purchase_orders:read', 'purchases:manage'] },
  { path: '/purchase-orders/:id', title: 'Purchase Order', any: ['purchase_orders:read', 'purchases:manage'] },
  { path: '/purchases', title: 'Purchases', any: ['purchases:read', 'purchases:manage'] },
  { path: '/purchases/:id', title: 'Purchase Details', any: ['purchases:read', 'purchases:manage'] },

  { path: '/stock-transfers', title: 'Stock Transfers', any: ['transfers:read', 'inventory:manage'] },
  { path: '/stock-transfers/:id', title: 'Stock Transfer', any: ['transfers:read', 'inventory:manage'] },

  { path: '/menu-access', title: 'Menu Access', any: ['menus:manage', 'roles:manage'] },
  { path: '/abac-policies', title: 'ABAC Policies', any: ['abac:manage', 'roles:manage'] },

  { path: '/403', title: 'Not Authorized', privateOnly: true },
  { path: '/404', title: 'Not Found', privateOnly: true },
];

