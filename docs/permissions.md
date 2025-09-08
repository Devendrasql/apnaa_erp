# Permissions Guide

This guide explains how to manage user access in the ERP using roles, attribute rules and menu permissions.

## Role‑based access control (RBAC)

1. Open **Masters → Manage Roles** from the sidebar.
2. Use **New Role** to create a role or select an existing one.
3. Tick the permissions that the role should grant (e.g. `products:read`, `sales:manage`).
4. Save the role and assign it to users from **Masters → Manage Users**.
5. A user inherits all permissions of their assigned role.

## Attribute‑based access control (ABAC)

1. Open **Masters → ABAC Policies**.
2. Each row defines a policy with:
   - **Name** – description for administrators.
   - **Effect** – `allow` or `deny`.
   - **Action** – permission name the rule targets (e.g. `sales.read`).
   - **Subject** – resource name (e.g. `sales`).
   - **Condition** – optional JSON logic evaluated against request data.
3. Example condition to allow access only to the current branch:
   ```json
   {"==": [{"var": "branch_id"}, {"var": "ctx.branchId"}]}
   ```
4. Save the policies; deny rules override allow rules.

## Menu permissions

1. Open **Masters → Menu Manager**.
2. Menus can be shown or hidden based on permission names.
3. Assign a `perm` value to a menu item so that only users with that permission see it.
4. The sidebar automatically hides entries when the current user lacks permission.

## Putting it together

- Roles grant broad capabilities through RBAC.
- ABAC policies refine access with contextual rules such as branch restrictions.
- Menu permissions ensure the navigation reflects what a user can actually access.

Define roles first, then refine with ABAC and menu rules to achieve industry‑grade access control.

## Permission hydration

- On login the backend returns an `effectivePermissions` array for the user.
- The frontend reuses this snapshot and avoids extra role lookups, preventing 403 errors for users without `roles:read` access.
- UI metadata endpoints (`/api/v2/ui/*`) now require only authentication, allowing every logged‑in user to fetch their allowed menus and features.
- If a user logs in and sees no menus, verify that their role has permissions assigned in the database. The frontend no longer tries to look up role details, so empty permission sets result in a minimal UI.
