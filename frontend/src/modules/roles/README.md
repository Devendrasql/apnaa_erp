Roles Module

Routes

- /roles — RolesPage: list roles and manage permissions per role.

Key Components

- PermissionsFormModal: assign/unassign permissions; can create new permissions inline.

APIs

- listRoles(params)
- getRoleById(id)
- updateRole(id, payload)
- listPermissions()
- createPermission(payload)

State & Caching

- Queries: ['roles'], ['role', id], ['roles:permissions']
- Mutations invalidate: ['roles'], ['role', id], ['roles:permissions']

