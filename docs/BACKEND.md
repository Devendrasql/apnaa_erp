## Backend Standards

This document defines conventions and patterns for the Node.js backend.

### Folder Layout

- `server.js` — bootstrap, DB connect, graceful shutdown
- `src/app.js` — Express app with middleware and route registration
- `routes/` — legacy V1 routers
- `src/api/v2/` — V2 feature modules (routers, controllers, validators)
- `controllers/` — legacy controllers (V1)
- `repositories/` — DB access logic
- `middleware/` — cross-cutting middleware (auth, permissions, logging, error handling)
- `utils/` — shared utilities (database, logger)

### Coding Conventions

- Use async/await and return early on errors.
- Never access DB from controllers — use repositories.
- Validate all inputs at the boundary using `express-validator`.
- Use structured logs via `logger` and include `req.id` for correlation.
- Prefer small, pure functions. Push side effects to edges.

### Error Handling

- Throw domain-specific errors where useful; otherwise let central `errorHandler` convert to JSON with status code and message.
- Don’t leak internal error details in production; log them instead.

### Security

- JWT-based auth. Use `authMiddleware` for protected routes and `loadPermissions` for RBAC/ABAC.
- Apply `helmet`, `cors`, `rateLimit`, and bounded body sizes.
- Never log raw credentials or tokens.

### Versioning

- All new features go under `/api/v2` using a feature folder with `router.js`, `controller.js`, and `validators.js` where applicable.
- Update `backend/src/api/v2/openapi.yaml` with endpoints and examples.

### Testing

- Unit test repositories and services.
- Integration test routers with Supertest (`/api/v2/*` first).
- Seed isolated test data per suite.

### Observability & Ops

- Health: `/api/health`, Readiness: `/api/ready`, Version: `/api/version`.
- Logs to stdout with levels and JSON; rotate in production via the process manager.
- Future: `/metrics` (Prometheus), distributed tracing.

