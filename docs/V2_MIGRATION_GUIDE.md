# API v2 Migration Guide

This document maps existing v1 endpoints to their v2 counterparts and provides a checklist to validate parity without losing any features. All v1 routes remain mounted; v2 runs in parallel under `/api/v2/*` so you can switch module‑by‑module.

## How to Switch Safely
- Point a staging client at `/api/v2/*` for one feature at a time.
- Run through create/update/delete flows and data reads.
- Verify permissions (RBAC + ABAC) by exercising success/forbidden cases.
- Only then ship the client change; keep v1 live until you confirm parity.

## Endpoint Mapping (v1 → v2)

### Auth
- v1: `POST /api/auth/login` → v2: `POST /api/v2/auth/login`
- v1: `POST /api/auth/refresh` → v2: `POST /api/v2/auth/refresh`

### Users
- v1: `/api/users` → v2: `/api/v2/users`

### Roles
- v1: `/api/roles` → v2: `/api/v2/roles`

### UI / Menus / Features
- v1: `/api/ui/menus` → v2: `/api/v2/ui/menus`
- v1: `/api/ui/permissions` → v2: `/api/v2/ui/permissions`
- v1: `/api/ui/features` → v2: `/api/v2/ui/features`

### Dashboard
- v1: `/api/dashboard/*` → v2: `/api/v2/dashboard/*`

### Categories
- v1: `/api/categories/*` → v2: `/api/v2/categories/*`

### Products
- v1: `/api/products` (list, getOne) → v2: `/api/v2/products`
- v1: create/update/delete → v2: `/api/v2/products` (POST/PUT/DELETE)

### Manufacturers / Brands
- v1: `/api/mfg-brands/*` → v2: `/api/v2/mfg-brands/*`

### Suppliers
- v1: `/api/suppliers/*` → v2: `/api/v2/suppliers/*`

### Customers
- v1: `/api/customers/*` → v2: `/api/v2/customers/*`

### Branches
- v1: `/api/branches/*` → v2: `/api/v2/branches/*`

### Discounts (Standard Discounts)
- v1: `/api/std-discounts/*` → v2: `/api/v2/discounts/*`

### Settings
- v1: `/api/settings/*` → v2: `/api/v2/settings/*`

### Purchases
- v1: `/api/purchases/*` → v2: `/api/v2/purchases/*`

### Purchase Orders
- v1: `/api/purchase-orders/*` → v2: `/api/v2/purchase-orders/*`

### Inventory
- v1: `/api/inventory/stock` → v2: `/api/v2/inventory/stock`
- v1: `/api/inventory/add-stock` → v2: `/api/v2/inventory/add-stock`
- v1: `/api/inventory/adjust-stock` → v2: `/api/v2/inventory/adjust-stock`

### Transfers (Stock Transfers)
- v1: `/api/stock-transfers/*` → v2: `/api/v2/transfers/*`

### Sales
- v1: `/api/sales` (list/getOne) → v2: `/api/v2/sales`
- v1: create/cancel → v2: `POST /api/v2/sales`, `POST /api/v2/sales/:id/cancel`

### Payments
- v1: `/api/payments` → v2: `/api/v2/payments` (schema‑safe)

### Reports
- v1: `/api/reports/*` → v2: `/api/v2/reports/*`

### Admin Menus
- v1: `/api/adminMenus` → v2: `/api/v2/admin/menus`

### ABAC
- v1: `/api/abac/*` → v2: `/api/v2/abac/*`

### Face
- v1: `/api/face/*` → v2: `/api/v2/face/*`

### Me (Permission checks)
- v1: `/api/me/*` → v2: `/api/v2/me/*`

## Permissions & ABAC
- v2 keeps permission enforcement via `authMiddleware` + `loadPermissions` + `abacEnforce()`.
- Use `/api/v2/me/can?code=perm.code&branchId=#` to test code‑level permissions at a branch.
- Add ABAC policies through `/api/v2/abac/policies` for attribute‑based decisions.

## Operational Hardening
- v2 router has a general rate limiter (15 min, 1000 reqs) for defense‑in‑depth.
- All write flows (sales, purchases, POs, transfers, product writes) run in transactions.

## Smoke Test Checklist
- Products: create → list → update variants (add/remove) → delete.
- Sales: create with multiple items (decrements stock) → cancel (restores stock).
- Purchases: create + post to stock; PO: create + receive.
- Inventory: stock reflects changes after above operations.
- Transfers: create (reserve) → in_transit → received (moves stock).
- Customers, Suppliers, Branches: CRUD.
- Settings, Discounts, Brands: CRUD.
- Admin Menus + ABAC: list & update policies, verify menu visibility and access.
- Reports & Dashboard: return data without errors.
- Face: enroll → identify returns match or 404 no_match.

## Notes on Schema Variations
- Payments: if `customer_payments` table or `sales.paid_amount/balance_amount` are missing, v2 endpoints fall back to safe queries to avoid errors. If you add these later, re‑enable accurate aggregation.
- Face embedding service URL is `EMBED_URL`; adjust via env. Threshold via `FACE_THRESHOLD`.

## Rollout Plan
1) Module‑by‑module switch in staging; monitor logs.
2) Enable v2 endpoints in production per feature.
3) After 100% client cutover, deprecate the corresponding v1 routes.
