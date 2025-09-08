# System

## Summary
- Purpose: System-level pages like login and error pages.
- Ownership: Core UI team.

## Primary Routes
- Paths: `/login`, `/403`, `/404`
- Title: Login, Not Authorized, Not Found
- Guards: Login public; others private-only by router.

## Responsibilities
- Authentication entry point and system error views.

## Data & API
- Auth endpoints for login.

## Key Components
- `frontend/src/features/system/LoginPage.lazy.jsx`
- `frontend/src/features/system/NotAuthorizedPage.lazy.jsx`
- `frontend/src/features/system/NotFoundPage.lazy.jsx`

