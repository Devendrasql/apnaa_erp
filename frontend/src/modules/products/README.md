Products Module

Routes

- /products — ProductsPage: list, search, create, edit, delete.

Key Components

- ProductFormModal: create/update product and its variants.

APIs

- listProducts(params)
- getProductById(id)
- createProduct(payload)
- updateProduct(id, payload)
- deleteProduct(id)
- searchIngredients(params)

State & Caching

- Queries: ['products', params], ['product', id], ['products:ingredients', params]
- Mutations invalidate: ['products'] and specific ['product', id]

