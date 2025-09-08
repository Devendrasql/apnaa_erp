# Point of Sale (POS)

## Summary
- Purpose: Operate counter sales with barcode and quick actions.
- Ownership: Sales team.

## Primary Routes
- Path: `/pos`
- Title: Point of Sale
- Guards: `PERMS.POS.USE` or `PERMS.SALES.MANAGE`

## Responsibilities
- Transaction workflow for in-store sales.

## Data & API
- POS endpoints for cart, checkout, and payments.

## Key Components
- `frontend/src/features/pos/POSPage.lazy.jsx`

