# Purchases

## Summary
- Purpose: Manage purchase orders and purchases lifecycle.
- Ownership: Procurement team.

## Primary Routes
- Paths: `/purchase-orders`, `/purchase-orders/:id`, `/purchases`, `/purchases/:id`
- Title: Purchase Orders, Purchase Order, Purchases, Purchase Details
- Guards: `PERMS.PURCHASE_ORDERS.READ` or `PERMS.PURCHASES.MANAGE`

## Responsibilities
- PO creation, tracking, and purchases reconciliation.

## Data & API
- Purchase orders and purchases endpoints.

## Key Components
- `frontend/src/features/purchases/PurchaseOrdersPage.lazy.jsx`
- `frontend/src/features/purchases/PurchaseOrderDetailPage.lazy.jsx`
- `frontend/src/features/purchases/PurchasesPage.lazy.jsx`
- `frontend/src/features/purchases/PurchaseDetailPage.lazy.jsx`

