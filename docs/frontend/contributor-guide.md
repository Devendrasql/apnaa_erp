Frontend Contributor Guide

Overview

- Stack: React 18, Vite, React Router 6, MUI, react-query.
- Strategy: Feature-first modules under `src/modules/<domain>`.
- Shared code under `src/shared` (api, lib, ui, hooks, config).

Directory layout

- src/app: App shell, providers, router, route metadata, theme.
- src/modules/<domain>:
  - pages: Route components for the domain
  - components: Domain UI (dialogs, forms, tables)
  - api: Thin wrappers calling `@shared/api`
  - hooks: react-query queries/mutations
  - model: constants, mappers, types
  - utils: domain-only helpers
- src/shared:
  - api: Axios client, named endpoints, helpers
  - lib: Cross-cutting utilities (formatters, helpers)
  - hooks: Reusable hooks not tied to a single domain
  - ui: Presentational shared components (if any)
  - config: App-level constants

Path aliases

- `@` → `src`
- `@app` → `src/app`
- `@modules` → `src/modules`
- `@shared` → `src/shared`
- `@components` → `src/components` (legacy shared UI)

Conventions

- Components: PascalCase; hooks/utils: camelCase; files kebab-case or descriptive.
- React Query keys: include identifiers (e.g., branch_id) to scope caches.
- Module APIs are thin delegates to `@shared/api` for consistency.
- Keep domain knowledge inside modules; keep shared layer domain-agnostic.

Adding a new module

1) Create `src/modules/<domain>/{pages,components,api,hooks,model,utils}`
2) Implement API wrappers using `@shared/api`
3) Add hooks with react-query keys
4) Build pages that compose components and hooks
5) Export the route in `src/app/router.jsx`
6) Add a short `README.md` to the module

Coding patterns

- Use Suspense + lazy for route-level code splitting in router.
- Use `RequirePermissions` for ABAC/RBAC gates where needed.
- Invalidate fine-grained react-query keys on mutations.
- Prefer `@shared/api` and module-local utils over ad hoc fetch code.

Docs

- Architecture: `docs/frontend/architecture.md`
- Migration guide: `docs/frontend/migration.md`
- Module template: `docs/frontend/module-template.md`

