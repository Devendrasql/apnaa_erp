Shared API

- Exposes `api` object and named HTTP functions.
- Built on Axios with interceptors for auth and dev mock support.
- During migration, this layer re-exports from `src/services/api`.
- Future: move implementation here and keep `src/services/api` as a thin shim.

