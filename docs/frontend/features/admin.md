# Admin

## Summary
- Purpose: Administrative capabilities including menu access and ABAC policies.
- Ownership: Admin team.

## Primary Routes
- Paths: `/menu-access`, `/admin/menus`, `/abac-policies`
- Title: Menu Access, Menu Manager, ABAC Policies
- Guards: `PERMS.MENUS.MANAGE`, `PERMS.ABAC.MANAGE`, or `PERMS.ROLES.MANAGE`

## Responsibilities
- Manage UI menus, access control policies, and role mappings.

## Data & API
- Admin and security endpoints.

## Key Components
- `frontend/src/features/admin/MenuAccessPage.lazy.jsx`
- `frontend/src/features/admin/MenuManagerPage.lazy.jsx`
- `frontend/src/features/admin/AbacPoliciesPage.lazy.jsx`

