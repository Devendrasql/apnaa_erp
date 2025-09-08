Purchases Module

Routes

- /purchases — PurchasesPage: list, filter, create purchase entries.
- /purchases/:id — PurchaseDetail: view purchase details.
- /purchase-orders — PurchaseOrdersPage: list, filter, create POs.
- /purchase-orders/:id — PurchaseOrderDetail: view PO details and receive.

Key Components

- PurchaseFormModal: create purchase entries with line items.
- PurchaseOrderFormModal: create purchase orders with line items.

APIs

- Uses `@shared/api` functions: getAllPurchases, createPurchase, getPurchaseById, postPurchaseToStock, getPurchaseOrders, createPurchaseOrder, getPurchaseOrderById, receivePurchaseOrder.

State & Caching

- Queries: ['purchases', ...], ['purchase', id], ['purchase-orders', ...], ['purchase-order', id]
- Mutations invalidate: the relevant list and detail keys above

