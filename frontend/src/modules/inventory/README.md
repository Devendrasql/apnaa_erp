Inventory Module

Routes

- /inventory — InventoryPage: list, filter, add stock, adjust stock.

Key Components

- AddStockFormModal: add purchased stock to a branch.
- StockAdjustmentModal: adjust stock quantity with reason.

APIs

- listStock(params)
- addStock(payload)
- adjustStock(payload)

State & Caching

- Queries: ['inventory', params]
- Mutations invalidate: ['inventory']

