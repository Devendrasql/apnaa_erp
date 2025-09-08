# Stock Transfers

## Summary
- Purpose: Manage inter-branch stock transfers.
- Ownership: Inventory team.

## Primary Routes
- Paths: `/stock-transfers`, `/stock-transfers/:id`
- Title: Stock Transfers, Stock Transfer
- Guards: `PERMS.TRANSFERS.READ` or `PERMS.INVENTORY.MANAGE`

## Responsibilities
- Create and track stock transfer requests and receipts.

## Data & API
- Transfer endpoints.

## Key Components
- `frontend/src/features/transfers/StockTransfersPage.lazy.jsx`
- `frontend/src/features/transfers/StockTransferDetailPage.lazy.jsx`

