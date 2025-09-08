# Manufacturers

## Summary
- Purpose: Manage manufacturers and brands.
- Ownership: Inventory team.

## Primary Routes
- Paths: `/manufacturers`, `/manufacturers/import`
- Title: Manufacturers, Import Manufacturers
- Guards: `PERMS.PRODUCTS.READ` or `PERMS.PRODUCTS.MANAGE`

## Responsibilities
- Manage brand master data and import flows.

## Data & API
- Manufacturer CRUD and import endpoints.

## Key Components
- `frontend/src/features/manufacturers/MfgBrandManagerPage.lazy.jsx`
- `frontend/src/features/manufacturers/ManufacturerImportPage.lazy.jsx`

