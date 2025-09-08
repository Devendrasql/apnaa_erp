Frontend Migration Guide

Goals

- Move to feature-first modules under `src/modules/<domain>`.
- Keep routes and imports working during migration with compatibility shims.

Steps per module

1) Create `src/modules/<domain>/{pages,components,api,hooks,model,utils}`.
2) Move the page from `src/pages` to `src/modules/<domain>/pages`.
3) Move related dialogs/forms from `src/components` into `src/modules/<domain>/components`.
4) Move feature `api.js`, `hooks.js`, `utils.js` from `src/features/<domain>` into `src/modules/<domain>`.
5) Update imports inside the module to use `@shared/api` and local paths.
6) Keep a lazy bridge in `src/features/<domain>/<Page>.lazy.jsx` re-exporting the new module page.
7) Update docs: add or edit `src/modules/<domain>/README.md` with routes/APIs/caching details.

Aliases

- Use `@modules/<domain>/...` for module imports.
- Use `@shared/api` for base HTTP client and helpers.

Verification

- Run dev server and navigate to the migrated route.
- Check modals, CRUD flows, and react-query cache invalidations.

