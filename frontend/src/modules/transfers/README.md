Stock Transfers Module

Routes

- /stock-transfers — StockTransfersPage: list, filter, create transfer.
- /stock-transfers/:id — StockTransferDetail: view, dispatch, receive, cancel.

Key Components

- StockTransferFormModal: create transfer by selecting source branch and items.

APIs

- listTransfers(params)
- getTransferById(id)
- createTransfer(payload)
- updateTransferStatus(id, status)

State & Caching

- Queries: ['transfers', params], ['transfer', id]
- Mutations invalidate: ['transfers'] and specific ['transfer', id]

