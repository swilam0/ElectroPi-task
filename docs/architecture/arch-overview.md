# Architecture Overview

## System Context Diagram

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│            (Next.js App Router SSR)                  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
                       │ Authorization: Bearer <JWT>
                       ▼
┌─────────────────────────────────────────────────────┐
│                NestJS API Server                      │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐  │
│  │ AuthGuard │─▶│ RoleGuard│─▶│ Validation│─▶│Controller│
│  └──────────┘  └──────────┘  │ Pipeline │  └───┬──┘  │
│                              └──────────┘      │     │
│                                                ▼     │
│  ┌─────────────────────────────────────────┐         │
│  │           Service Layer                  │         │
│  │  (AuthService, UsersService, etc.)      │         │
│  └──────────────────┬──────────────────────┘         │
│                     ▼                                 │
│  ┌─────────────────────────────────────────┐         │
│  │          Repository Layer                │         │
│  │      (PrismaService + Repos)            │         │
│  └──────────────────┬──────────────────────┘         │
└─────────────────────┼────────────────────────────────┘
                      │ DATABASE_URL
                      ▼
┌─────────────────────────────────────────────────────┐
│                   PostgreSQL                          │
│           (via Prisma ORM)                           │
└─────────────────────────────────────────────────────┘
```

## Auth Flow — Sequence Diagram

```
Client                 NestJS API                 PostgreSQL
  │                       │                         │
  │  POST /auth/login     │                         │
  │  {email, password}    │                         │
  │──────────────────────▶│                         │
  │                       │  SELECT user by email   │
  │                       │────────────────────────▶│
  │                       │◀────────────────────────│
  │                       │                         │
  │                       │  bcrypt.compare()       │
  │                       │  Generate JWT tokens    │
  │                       │  Store refresh_hash     │
  │                       │────────────────────────▶│
  │                       │                         │
  │◀──────────────────────│                         │
  │  200 {accessToken,    │                         │
  │  refreshToken, user}  │                         │
  │                       │                         │
  │  GET /projects        │                         │
  │  Authorization: Bearer│                         │
  │──────────────────────▶│                         │
  │                       │  Verify JWT             │
  │                       │  Extract userId + role  │
  │                       │  Query projects by      │
  │                       │  membership             │
  │                       │────────────────────────▶│
  │                       │◀────────────────────────│
  │◀──────────────────────│                         │
  │  200 {data: [...]}    │                         │
```

## Request Lifecycle

```
Request
  │
  ▼
[1] LoggerMiddleware        — Logs method, URL, duration, requestId
  │
  ▼
[2] JwtAuthGuard            — Extracts + verifies Bearer token
  │                            Populates req.user with {id, email, role}
  │
  ▼
[3] RolesGuard              — If endpoint has @Roles(), checks user.role
  │                            Returns 403 if role doesn't match
  │
  ▼
[4] ValidationPipe          — Validates DTO with class-validator
  │                            Returns 400 with field-level errors
  │
  ▼
[5] Controller              — Parses params, body, calls service
  │
  ▼
[6] Service                 — Business logic, orchestrates repositories
  │
  ▼
[7] Repository              — Prisma ORM queries
  │
  ▼
[8] Response                — Transformed to JSend envelope
  │
  ▼
[9] ExceptionFilter         — Catches unhandled errors, formats response
```

> **Note:** All API routes are prefixed with `/api` via NestJS global prefix (`app.setGlobalPrefix('api')` in `main.ts`). Sequence diagrams above show paths without the prefix for readability. The client always calls `/api/auth/login`, `/api/projects`, etc.

## Component Layers

### Presentation Layer
- **Controllers** — Handle HTTP concerns only: extract request data, delegate to services, return responses
- **Guards** — Authentication (`JwtAuthGuard`) and authorization (`RolesGuard`)
- **Pipes** — Input validation and transformation
- **Filters** — Global exception handling, JSEND-compliant error responses

### Application Layer
- **Services** — Business logic, validation, orchestration. No direct DB access.
- **DTOs** — Input/output schemas validated at the boundary
- **Decorators** — Custom decorators for `@CurrentUser()`, `@Roles()`

### Domain Layer
- **Enums** — `TaskStatus`, `Role`, `Priority`
- **Interfaces** — Repository contracts (`ITaskRepository`, `IProjectRepository`)
- **Types** — Shared type definitions

### Infrastructure Layer
- **PrismaModule** — Database connection lifecycle management
- **PrismaService** — Extends `PrismaClient`, handles connection pooling
- **Repositories** — Concrete implementations of domain repository interfaces
- **JwtService** — Token generation, verification, refresh rotation
- **BcryptService** — Password hashing and comparison

## Deployment Architecture

```
                       ┌──────────┐
                       │  CDN     │
                       │(Vercel)  │
                       └────┬─────┘
                            │
               ┌────────────┴────────────┐
               │     Next.js (SSR)        │
               │   app.example.com        │
               └────────────┬────────────┘
                            │
               ┌────────────┴────────────┐
               │   NestJS API             │
               │   api.example.com        │
               └────────────┬────────────┘
                            │
               ┌────────────┴────────────┐
               │   PostgreSQL             │
               │   (Managed DB service)   │
               └─────────────────────────┘
```

All API requests go through a single domain. The browser talks to Next.js, which renders pages via Server Components or Client Components as appropriate. API calls are made from the browser or from Server Components directly.
