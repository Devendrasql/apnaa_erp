POS Module

- Route: /pos — Point of Sale flow with branch-scoped stock search, cart, face capture, and invoice print.
- Components used from shared: CustomerSearchModal, CustomerHistoryDialog, FaceCaptureDialog, InvoicePrintDialog.
- APIs: getStock, identifyCustomerFace, createSale via `@shared/api`.
- Permissions: pos.discount.edit, sales.discount.edit (controls discount editing).

