Sales Module

Routes

- /sales — SalesPage: list, filter, view details, print invoice.
- /sales/:id — SaleDetails page handled elsewhere (detail view module TBD).

APIs

- listSales(params)
- getSaleById(id)
- createSale(payload)

State & Caching

- Queries: ['sales', params], ['sale', id]
- Mutations invalidate: ['sales']

