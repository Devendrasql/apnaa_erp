# System Architecture Overview

This document captures the high-level architecture of the Pharmacy ERP system across backend, frontend, and shared concerns (auth, RBAC/ABAC, observability, CI, and deployment). It is a living document — keep it updated as the system evolves.

## Goals

- Reliability, security, and maintainability first
- Clear module boundaries and API contracts (OpenAPI)
- Incremental migration: V1 (legacy) and V2 (feature-based) coexist
- Consistent developer experience with shared conventions, tooling, and docs

## High-Level Components

- Backend (Node.js/Express, MySQL): feature-based V2 API under `/api/v2`, legacy V1 routes under `/api/*` for compatibility.
- Frontend (React + Vite): service-based API client, React Query for data fetching, MUI for UI.
- Database: MySQL using `mysql2`, repositories for data access.
- Observability: structured logging (winston), request IDs, health and readiness probes.

## Backend Architecture

- Entry: `backend/server.js` boots `backend/src/app.js`.
- HTTP concerns: helmet, compression, CORS, rate limiting, JSON body limits, static files under `/uploads`.
- Security: JWT auth middleware, permissions loader, ABAC endpoints, and role-based access checks.
- Routes:
  - V1: legacy Express routers in `backend/routes/*` mounted under `/api/*` with `authMiddleware` and `loadPermissions`.
  - V2: feature-based routes under `backend/src/api/v2/*` mounted at `/api/v2`.
- Error handling: centralized `notFoundHandler` and `errorHandler` middleware.
- Data access: via `utils/database` and `repositories/*` (avoids DB logic in controllers).

## Frontend Architecture

- Central API client and helpers in `frontend/src/services/api.js` (Axios + interceptors + auth refresh).
- State: local React state and React Query where appropriate.
- UI: MUI components, feature pages in `frontend/src/pages/*`, shared components in `frontend/src/components/*`.
- Auth: `frontend/src/contexts/AuthContext.jsx` manages login, tokens, permissions, and branch state.

## API Contracts (OpenAPI)

- Versioned under `/api/v2` with a source of truth OpenAPI spec at `backend/src/api/v2/openapi.yaml`.
- Serve raw spec at `/api/v2/openapi` (YAML), enabling future Swagger UI and client generation.
- PRs that change endpoints must update the spec and examples.

## Security

- JWT tokens, refresh flow, rate limiting, and secure headers.
- Input validation on boundary (controllers/routes) using `express-validator` (or Joi in the future).
- Avoid secrets in code. Use `.env` with production-grade secret management.

## Observability

- Structured logs (winston) with request ID correlation.
- Health (`/api/health`) and readiness (`/api/ready`) endpoints.
- Future: metrics endpoint (Prometheus), tracing.

## Testing

- Backend: Jest + Supertest for API tests.
- Frontend: React Testing Library + Jest for components and hooks.

## CI/CD

- Lint and test on PR for frontend and backend.
- Build artifacts; future: Docker images and deploy pipelines.

## Migration Strategy (V1 ➜ V2)

- Incremental: keep V1 stable, build new capabilities in V2.
- Migrate feature-by-feature with parity tests and contract checks.
- Consumers move to `/api/v2` once a feature is flagged ready.

