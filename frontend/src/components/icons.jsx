import React from 'react';
import {
  Dashboard as DashboardIcon,
  PointOfSale as PointOfSaleIcon,
  Assessment as AssessmentIcon,
  Inventory2 as ProductsIcon,
  Storefront as StorefrontIcon,
  LocalShipping as LocalShippingIcon,
  ManageAccounts as ManageAccountsIcon,
  Category as CategoryIcon,
  Payment as PaymentIcon,
  SwapHoriz as InventoryTwoTone,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Settings as SettingsIcon,
  ShoppingCart as ShoppingCartIcon,
  ShoppingCartCheckout as ShoppingCartCheckoutIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

export function iconForKey(key) {
  const k = String(key || '').toLowerCase();
  switch (k) {
    case 'dashboard': return <DashboardIcon />;
    case 'pos': return <PointOfSaleIcon />;
    case 'sales': return <AssessmentIcon />;
    case 'purchase_orders': return <ShoppingCartIcon />;
    case 'purchases': return <ShoppingCartCheckoutIcon />;
    case 'payments': return <PaymentIcon />;
    case 'inventory': return <ShoppingCartIcon />;
    case 'stock-transfers': return <InventoryTwoTone />;
    case 'reports': return <AssessmentIcon />;
    case 'branches': return <StorefrontIcon />;
    case 'customers': return <PeopleIcon />;
    case 'suppliers': return <LocalShippingIcon />;
    case 'users': return <ManageAccountsIcon />;
    case 'roles': return <AdminPanelSettingsIcon />;
    case 'settings': return <SettingsIcon />;
    case 'products': return <ProductsIcon fontSize="small" />;
    case 'categories': return <CategoryIcon fontSize="small" />;
    case 'manufacturers': return <StorefrontIcon fontSize="small" />;
    default: return <DashboardIcon />;
  }
}
