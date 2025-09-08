// Centralized, declarative menu configuration
// Icons are imported here to keep Layout focused on rendering
import React from 'react';
import { PERMS } from '@/security/permissions';
import {
  Dashboard as DashboardIcon,
  PointOfSale as PointOfSaleIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Storefront as StorefrontIcon,
  LocalShipping as LocalShippingIcon,
  ManageAccounts as ManageAccountsIcon,
  Category as CategoryIcon,
  Payment as PaymentIcon,
  SwapHoriz as InventoryTwoTone,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Inventory2 as ProductsIcon,
  Scale as UomIcon,
  Medication as DosageIcon,
  Storage as RackIcon,
  Percent as DiscountIcon,
  ShoppingCart as ShoppingCartIcon,
  ShoppingCartCheckout as ShoppingCartCheckoutIcon,
} from '@mui/icons-material';

// Primary navigation
export const PRIMARY = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', perm: PERMS.DASHBOARD.VIEW },
  { key: 'pos', label: 'POS', icon: <PointOfSaleIcon />, path: '/pos', perm: PERMS.POS.USE },
  { key: 'sales', label: 'Sales', icon: <AssessmentIcon />, path: '/sales', perm: PERMS.SALES.READ },
  { key: 'purchase_orders', label: 'Purchase Orders', icon: <ShoppingCartIcon />, path: '/purchase-orders', perm: PERMS.LEGACY.PROCUREMENT_PO_VIEW },
  { key: 'purchases', label: 'Purchases', icon: <ShoppingCartCheckoutIcon />, path: '/purchases', perm: PERMS.PURCHASES.READ },
  { key: 'payments', label: 'Payments', icon: <PaymentIcon />, path: '/payments', perm: PERMS.PAYMENTS.READ },
  { key: 'inventory', label: 'Inventory', icon: <ShoppingCartIcon />, path: '/inventory', perm: PERMS.INVENTORY.READ },
  { key: 'stock-transfers', label: 'Stock Transfers', icon: <InventoryTwoTone />, path: '/stock-transfers', perm: PERMS.TRANSFERS.READ },
  { key: 'reports', label: 'Reports', icon: <AssessmentIcon />, path: '/reports', perm: PERMS.REPORTS.READ },
];

// Masters navigation
export const MASTERS = [
  { key: 'branches', label: 'Branches', icon: <StorefrontIcon />, path: '/branches', perm: PERMS.BRANCHES.READ },
  { key: 'customers', label: 'Customers', icon: <PeopleIcon />, path: '/customers', perm: PERMS.CUSTOMERS.READ },
  { key: 'suppliers', label: 'Suppliers', icon: <LocalShippingIcon />, path: '/suppliers', perm: PERMS.SUPPLIERS.READ },
  { key: 'users', label: 'Manage Users', icon: <ManageAccountsIcon />, path: '/users', perm: PERMS.USERS.READ },
  { key: 'roles', label: 'Manage Roles', icon: <AdminPanelSettingsIcon />, path: '/roles', perm: PERMS.ROLES.READ },
  { key: 'settings', label: 'Settings', icon: <SettingsIcon />, path: '/settings', perm: PERMS.SETTINGS.READ },
  { key: 'menu_manager', label: 'Menu Manager', icon: <AdminPanelSettingsIcon />, path: '/admin/menus', perm: PERMS.MENUS.MANAGE },
  { key: 'menu_access', label: 'Menu Access', icon: <AdminPanelSettingsIcon />, path: '/menu-access', perm: PERMS.LEGACY.RBAC_MENU_MANAGE },
  { key: 'abac_policies', label: 'ABAC Policies', icon: <SettingsIcon />, path: '/abac-policies', perm: PERMS.LEGACY.ABAC_POLICY_MANAGE },
];

// Product Masters nested group
export const PRODUCT_MASTERS = [
  { key: 'products', label: 'All Products', icon: <ProductsIcon fontSize="small" />, path: '/products', perm: PERMS.PRODUCTS.READ },
  { key: 'categories', label: 'Categories', icon: <CategoryIcon fontSize="small" />, path: '/categories', perm: PERMS.CATEGORIES.READ },
  { key: 'manufacturers', label: 'Manufacturers', icon: <StorefrontIcon fontSize="small" />, path: '/manufacturers', perm: PERMS.PRODUCTS.READ },
  { key: 'uom', label: 'UOM', icon: <UomIcon fontSize="small" />, path: '/uom' },
  { key: 'dosage-forms', label: 'Dosage Forms', icon: <DosageIcon fontSize="small" />, path: '/dosage-forms' },
  { key: 'racks', label: 'Racks', icon: <RackIcon fontSize="small" />, path: '/racks' },
  { key: 'std-discounts', label: 'Standard Discounts', icon: <DiscountIcon fontSize="small" />, path: '/std-discounts' },
];

export default { PRIMARY, MASTERS, PRODUCT_MASTERS };
