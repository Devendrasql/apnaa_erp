# Customers

## Summary
- Purpose: Manage customer master data and history.
- Ownership: Sales/CRM team.

## Primary Routes
- Path: `/customers`
- Title: Customers
- Guards: `PERMS.CUSTOMERS.READ` or `PERMS.CUSTOMERS.MANAGE`

## Responsibilities
- Customer listing, search, creation, and basic analytics.

## Data & API
- Customer CRUD endpoints.

## Key Components
- `frontend/src/features/customers/CustomersPage.lazy.jsx`

