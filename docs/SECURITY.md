## Security Guidelines

### Authentication & Authorization

- JWT access tokens with refresh tokens; short-lived access tokens.
- Enforce `authMiddleware` on protected routes and load permissions before controllers.
- Favor least-privilege and capability checks; audit ABAC policies.

### Input Validation

- Validate request payloads at the route/controller boundary with `express-validator`.
- Sanitize all user-provided strings; never trust client-side validation alone.

### Secrets & Configuration

- No secrets in source control. Use `.env` locally, managed secrets in production.
- Rotate credentials periodically; principle of least privilege for DB users.

### Transport & Headers

- Enforce HTTPS in production, HSTS via reverse proxy.
- Apply `helmet` defaults; review CSP for pages serving uploads/public files.

### Logging

- Log security-relevant events (auth failures, permission denials) without sensitive payloads.
- Correlate with request IDs.

### Dependencies

- Keep dependencies updated and monitor advisories. Lock to known-good versions.

