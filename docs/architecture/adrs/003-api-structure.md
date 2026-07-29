# ADR-003: API Structure

**Title:** Use RESTful API design with resource-oriented endpoints
**Status:** Accepted
**Date:** 2026-07-29

## Context

We need to design the API structure for the Task Management application. Requirements:
- Intuitive, predictable URL patterns
- Standard HTTP methods for CRUD operations
- Nested resources where appropriate (tasks under projects)
- Consistent error handling
- Pagination, filtering, and sorting support

Options considered: RESTful, GraphQL, RPC-style.

## Decision

Use **RESTful API** design with the following conventions:

### URL Structure

> **Note:** All routes are prefixed with `/api` via NestJS global prefix configured in `main.ts`: `app.setGlobalPrefix('api')`. The listings below show the full path including the prefix.

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login
POST   /api/auth/refresh           # Refresh access token
POST   /api/auth/logout            # Logout
GET    /api/auth/me                # Current user

GET    /api/users                  # List users (admin)
GET    /api/users/:id              # Get user (admin)
PATCH  /api/users/:id              # Update user (admin or self)
DELETE /api/users/:id              # Delete user (admin)
PATCH  /api/users/:id/role         # Change role (admin)

GET    /api/projects               # List my projects
POST   /api/projects               # Create project
GET    /api/projects/:id           # Get project (requires membership)
PATCH  /api/projects/:id           # Update project (requires membership, admin)
DELETE /api/projects/:id           # Delete project (admin or creator)

GET    /api/projects/:pid/tasks    # List tasks in project
POST   /api/projects/:pid/tasks    # Create task in project

GET    /api/tasks/:id              # Get task
PATCH  /api/tasks/:id              # Update task
DELETE /api/tasks/:id              # Delete task
```

### Conventions
- Nested resources for dependent entities: `/projects/:pid/tasks`
- Query parameters for filtering: `?status=TODO&priority=HIGH&assigneeId=uuid`
- Pagination via `?page=1&limit=20` — response includes `meta: { page, limit, total, totalPages }`
- Sorting via `?sort=createdAt&order=desc`
- Consistent error format (see error-catalogue.md)

## Consequences

- **Positive:**
  - Predictable URLs that mirror the domain model
  - Standard HTTP semantics understood by all tooling
  - Easy to cache, inspect, and debug
  - Excellent Prisma/NestJS compatibility

- **Negative:**
  - N+1 query problem possible (mitigated by Prisma's `include` and `select`)
  - Over-fetching for complex views (mitigated by sparse fieldsets `?fields=title,status`)

- **Trade-off:** GraphQL would offer more flexible querying but adds complexity (schema management, resolver boilerplate) that isn't warranted for this application's scope.
