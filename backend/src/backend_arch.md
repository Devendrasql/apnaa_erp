Apnaa ERP - Backend Architecture GuideThis document outlines the scalable, feature-based architecture for the Apnaa ERP backend.Project StructureThe new code will be organized inside a src/ directory. This isolates our application logic and keeps the root directory clean./apnaa_erp
|-- src/
|   |-- api/                # API versioning (e.g., v1, v2)
|   |   |-- v2/
|   |       |-- features/   # All business logic is here, separated by feature
|   |       |   |-- auth/
|   |       |   |   |-- auth.controller.js
|   |       |   |   |-- auth.service.js
|   |       |   |   |-- auth.routes.js
|   |       |   |   |-- auth.validation.js
|   |       |   |
|   |       |   |-- users/
|   |       |   |-- products/
|   |       |   |-- sales/
|   |       |   |-- assessments/  # The new module
|   |       |
|   |       |-- middleware/     # Shared middleware for auth, validation, etc.
|   |       |   |-- authJwt.js
|   |       |   |-- checkPermissions.js (RBAC)
|   |       |   |-- checkPolicy.js (ABAC)
|   |       |
|   |       |-- services/       # Shared, core services
|   |       |   |-- policy.engine.js
|   |       |
|   |       |-- config/         # Database, environment variables
|   |       |-- models/         # Sequelize/DB models
|   |       |-- app.js          # Express app setup and middleware wiring
|   |
|-- server.js               # The entry point that starts the server
|-- package.json
|-- APNAA_ERP_BACKEND_GUIDE.md  # This file
|-- APNAA_ERP_FRONTEND_GUIDE.md # Guide for the frontend team
Core PrinciplesFeature-Based Modules: Each business domain (Auth, Users, Products) has its own folder containing its routes, controller, service, and validation. This makes the code easy to find and manage.Service Layer: All database logic MUST go in the service.js files. Controllers should never talk to the database directly.Controller Layer: Controllers handle incoming HTTP requests, validate data (using validation files), and call the appropriate service. They are the "traffic cops."Middleware: Authorization and other cross-cutting concerns are handled in middleware to keep the controller logic clean.Versioned API: All new routes will be under /api/v2/. This ensures the existing /api/ routes are not affected, guaranteeing zero downtime for your current application.