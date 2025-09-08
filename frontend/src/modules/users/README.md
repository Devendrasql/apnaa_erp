Users Module

Routes

- /users — UsersPage: list, search, create, edit, delete.

Key Components

- UserFormModal: create/update user profile and role.

APIs

- listUsers(params)
- getUserById(id)
- createUser(payload)
- updateUser(id, payload)
- deleteUser(id)

State & Caching

- Queries: ['users', params], ['user', id]
- Mutations invalidate: ['users'] and specific ['user', id]

