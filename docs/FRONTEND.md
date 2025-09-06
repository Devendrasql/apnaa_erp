## Frontend Standards

This document defines conventions and patterns for the React (Vite) frontend.

### Tech Stack

- React 18, Vite, MUI
- Axios API client with interceptors and refresh flow
- React Router v6
- React Query (v3) where server state benefits from caching/invalidation

### Folder Layout (conventions)

- `src/services/api.js` — central API client and endpoints
- `src/contexts/*` — global app contexts (auth, UI)
- `src/pages/*` — routed feature pages
- `src/components/*` — reusable UI components
- `src/assets/*` — images, static files

### API Usage

- Prefer named exports from `services/api` for clarity.
- Avoid building URLs inline in components; add helpers in `services/api`.
- Keep mutations and queries colocated with pages/components but call through `services/api`.

### Auth & Permissions

- Use `AuthContext` for login/logout, tokens, and permissions.
- Use `hasPermission()` for guarded UI and actions.
- Store only non-sensitive data in localStorage; tokens are cookies (http-only when served by backend).

### Testing

- Use React Testing Library and Jest.
- Test major flows: auth, navigation, critical forms.

### Styling

- Use MUI theme and design tokens consistently.
- Prefer MUI system props and styled API; avoid inline styles.

