# Dashboard

## Summary
- Purpose: Provide KPIs and at-a-glance operational metrics.
- Ownership: Core UI team.

## Primary Routes
- Path: `/dashboard`
- Title: Dashboard
- Guards: `PERMS.DASHBOARD.VIEW` or `PERMS.UI.READ`

## Responsibilities
- Surface key metrics and navigation shortcuts.

## Data & API
- Aggregated metrics from backend endpoints (see feature code).

## Key Components
- `frontend/src/features/dashboard/DashboardPage.lazy.jsx`

## Notes
- Further split into widgets as needed.

