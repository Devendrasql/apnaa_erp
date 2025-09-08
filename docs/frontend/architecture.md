# Frontend Architecture

This frontend is structured using a feature-first (domain-first) approach that is common in industry for large React + Vite applications. The goal is to make ownership, navigation, and change impact clear and scalable.

## High-Level Layout

`src/`

- `app/`: Application wiring (router, providers, theme, global config).
- `features/`: Feature (domain) modules. Each feature owns pages, UI, hooks, and API glue needed for that domain.
- `components/`: Cross-feature UI components (layout, dialogs, utilities). Keep generic and reusable.
- `shared/`: Cross-cutting utilities (lib, hooks, API base clients) with no domain coupling.
- `security/`: Permissions and auth policies consumed by features and router.
- `services/`: Low-level HTTP client or integration helpers used by features (to be migrated into `shared/api` over time).
- `modules/` (legacy): Previous domain folders. Temporarily kept. All routing now goes through `features/` wrappers. Plan is to migrate code from `modules/` into `features/` gradually and remove `modules/`.

Path aliases are defined in `frontend/vite.config.js` and include `@` (src), `@app`, `@components`, `@features`, `@modules` (legacy), and `@shared`.

## Feature Module Layout

Each feature lives under `src/features/<feature>/` and may contain:

- `*Page.lazy.jsx`: Route entry points, split by Vite using `React.lazy`.
- `components/`: Feature-specific UI.
- `hooks/`: Feature-specific hooks.
- `api.js|ts`: Thin API layer that uses shared API client(s).
- `README (Deprecated)`: All feature documentation now lives in `docs/frontend/features/<feature>.md`.

Example:

```
src/features/products/
  ProductsPage.lazy.jsx
  components/
  hooks/
  api.js
```

## Routing

- Route metadata: `src/app/routesConfig.js` holds titles and permission guards per path.
- Router: `src/app/router.jsx` consumes metadata and uses `React.lazy` to load `features/*Page.lazy` files.

## Documentation Rules

- One document per feature under `docs/frontend/features/<feature>.md`.
- Document must capture: summary, primary routes, responsibilities, data/API surface, permissions, and key components.
- Avoid duplicating code comments or READMEs inside `src/features/`. If present, they should point to the single canonical doc.

## Migration Plan (modules -> features)

1. Route through `features/` wrappers (done): lightweight wrappers re-export legacy module pages for consistency.
2. Move code inward: incrementally move UI, hooks, and API from `src/modules/<x>` into `src/features/<x>` keeping import paths stable.
3. Remove `modules/` alias: once migrated, delete legacy folders and alias.

This staged approach keeps the app stable while improving structure.

