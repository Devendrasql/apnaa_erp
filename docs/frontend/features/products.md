# Products

## Summary
- Purpose: Manage catalog of products and related metadata.
- Ownership: Inventory team.

## Primary Routes
- Path: `/products`
- Title: Products
- Guards: `PERMS.PRODUCTS.READ` or `PERMS.PRODUCTS.MANAGE`

## Responsibilities
- Product listing, search, create/update product details.

## Data & API
- Product CRUD endpoints (see `src/services/api.js`).

## Key Components
- `frontend/src/features/products/ProductsPage.lazy.jsx`

## Notes
- Consider moving legacy API helpers into `shared/api`.

