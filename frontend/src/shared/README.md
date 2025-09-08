Shared layer

- Purpose: Cross-cutting building blocks reusable across modules.
- Subfolders:
  - api: HTTP client, interceptors, and base endpoints.
  - lib: Generic utilities (formatters, helpers) without domain context.
  - ui: Reusable presentational components (buttons, inputs) decoupled from domain.
  - config: App-level constants and configuration.
  - hooks: Reusable hooks not tied to a single module.

Conventions

- Keep this layer free of domain knowledge. Domain flows live in `@modules`.
- Use named exports and stable APIs; avoid importing from deep paths.

