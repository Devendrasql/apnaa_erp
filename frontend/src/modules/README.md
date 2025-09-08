Modules layer

- Purpose: Feature-first, domain-scoped code grouped by business capability.
- Structure per module:
  - pages: Route-level components for this domain.
  - components: Domain-specific UI blocks (forms, tables, dialogs).
  - api: Module-specific API functions built on `@shared/api`.
  - hooks: React hooks (queries, mutations) built on module `api`.
  - model: Types, constants, mappers, adapters.
  - utils: Domain utilities only used by this module.
  - README.md: Short docs for the module (routes, main actions, data contracts).

Naming

- Folder names: kebab-case. Files: PascalCase for components, camelCase for utilities.
- Expose stable entry points via `index.js` barrels when helpful.

