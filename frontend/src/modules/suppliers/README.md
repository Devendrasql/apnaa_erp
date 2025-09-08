Suppliers Module

Routes

- /suppliers — SuppliersPage: list, search, create, edit, delete; supports GST lookup.

Key Components

- SupplierFormModal: create/update supplier; inline GST fetch by GSTIN.

APIs

- Uses `@shared/api` functions: getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierByGST.

State & Caching

- Query: ['suppliers', page, limit, search]
- Mutations invalidate: ['suppliers']

