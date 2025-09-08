# Sales

## Summary
- Purpose: Record sales, view sale details, and print invoices.
- Ownership: Sales team.

## Primary Routes
- Paths: `/sales`, `/sales/:id`, `/invoice/:id`
- Title: Sales, Sale Details, Invoice
- Guards: `PERMS.SALES.READ` or `PERMS.SALES.MANAGE`

## Responsibilities
- Sales listing, detail view, invoice printing.

## Data & API
- Sales CRUD and invoice endpoints.

## Key Components
- `frontend/src/features/sales/SalesPage.lazy.jsx`
- `frontend/src/features/sales/SaleDetailsPage.lazy.jsx`
- `frontend/src/features/sales/InvoicePrintPage.lazy.jsx`

