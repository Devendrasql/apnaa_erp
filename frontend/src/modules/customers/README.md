Customers Module

Routes

- /customers — CustomersPage: list, search, create, edit, delete; face enroll on save.

Key Components

- CustomerFormModal: create/update with optional face capture; returns { formData, faceBase64 }.

APIs

- listCustomers(params)
- getCustomerById(id)
- createCustomer(payload)
- updateCustomer(id, payload)
- deleteCustomer(id)
- enrollCustomerFace(id, { imageBase64 })

State & Caching

- Queries: ['customers', params], ['customer', id]
- Mutations invalidate: ['customers'] and specific ['customer', id]

