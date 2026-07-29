# Implementation Roadmap — ElectroPi Task Management

## Phase 1a: Project Scaffolding & Docker

### Goal
Bootable NestJS project with all dependencies declared, Docker services configured, and a health check confirming the server and global prefix work.

### Dependencies
None — start here.

### Documents
- `backend-structure.md`
- `env-variables.md`
- `docker-compose-setup.md`
- `constitution.md` (§25)

### Deliverables
- NestJS project initialized with TypeScript
- All npm dependencies installed (prisma, @nestjs/jwt, @nestjs/passport, passport, passport-jwt, ioredis, class-validator, class-transformer, bcrypt, @nestjs/throttler, @nestjs/config, @nestjs/swagger)
- `docker-compose.yml` with postgres:15-alpine and redis:7-alpine services
- `.env` and `.env.example` files with all variables from env-variables.md
- Global NestJS prefix `/api` configured in `main.ts`
- `env.config.ts` validating all environment variables at startup
- Basic `AppController` with `GET /api/health` returning `{ "status": "success", "data": null }`
- CORS configured for `http://localhost:3000`

### Checklist
- [ ] `npm install` completes without errors
- [ ] `npm run start:dev` boots the server on port 3001
- [ ] `GET /api/health` returns `{ "status": "success", "data": null }`
- [ ] `GET /api` without the prefix returns 404 (prefix is enforced)
- [ ] `docker compose up` starts PostgreSQL and Redis without errors
- [ ] All env vars from `.env` are loadable at startup
- [ ] CORS headers allow requests from `http://localhost:3000`

---

## Phase 1b: Database Layer

### Goal
Prisma schema, PrismaModule, and first migration creating all tables.

### Dependencies
- Phase 1a

### Documents
- `database-schema.md`
- `constitution.md` (§13–14)

### Deliverables
- `prisma/schema.prisma` with all 5 models (User, RefreshToken, Project, ProjectMember, Task) and 3 enums (Role, TaskStatus, Priority), including all relations, indexes, unique constraints, and `@@map` / `@map` naming
- `PrismaModule` + `PrismaService` (global module, extends PrismaClient with lifecycle hooks)
- First migration creating all tables with correct column types, defaults, foreign keys, and indexes
- `prisma generate` configured as postinstall step

### Checklist
- [ ] `npx prisma generate` succeeds and produces `@prisma/client`
- [ ] `npx prisma migrate dev` creates all 5 tables with correct columns and constraints
- [ ] Tables are named using snake_case: `users`, `refresh_tokens`, `projects`, `project_members`, `tasks`
- [ ] Enums created: `Role` (ADMIN, MEMBER), `TaskStatus` (TODO, IN_PROGRESS, DONE), `Priority` (LOW, MEDIUM, HIGH)
- [ ] Foreign keys have correct `onDelete` behavior (Cascade for memberships/tasks/refresh_tokens, Restrict for task creator)
- [ ] Unique constraint exists on `(userId, projectId)` in `project_members`
- [ ] PrismaService connects to PostgreSQL at startup

---

## Phase 1c: Redis & Error Infrastructure

### Goal
Redis module, JSEND exception handling, validation pipe, and repository interfaces.

### Dependencies
- Phase 1a
- Phase 1b (repository interfaces reference Prisma-generated types)

### Documents
- `backend-structure.md`
- `error-catalogue.md`
- `principles.md` (interface segregation, dependency inversion)

### Deliverables
- `RedisModule` + `RedisService` (global module, wraps ioredis client)
- Global `HttpExceptionFilter` — catches all exceptions and formats JSEND responses (`status: "success" | "fail" | "error"`) with correct HTTP status codes, `code` field for application errors, and field-level `data` for validation failures
- Global `ValidationPipe` — uses `class-validator` and `class-transformer`, returns 400 with field-level errors in JSEND format
- Repository interfaces in `common/interfaces/`: `ITaskRepository`, `IProjectRepository`, `IUserRepository`, plus segregated `ITaskReader` / `ITaskWriter` interfaces
- Centralized error code constants in `common/constants/error-codes.ts`

### Checklist
- [ ] Redis connection is established at startup (log message confirms)
- [ ] An unhandled exception returns `{ "status": "error", "message": "Internal server error", "code": "G-001" }`
- [ ] A 401 is returned as JSEND with code `A-001`
- [ ] A 403 is returned as JSEND with code `Z-001`
- [ ] A DTO validation failure returns `{ "status": "fail", "data": { "field": "error message" } }`
- [ ] Validation pipe is registered globally and applies to all endpoints
- [ ] Repository interfaces compile and declare correct method signatures
- [ ] No framework imports leak into domain interfaces

---

## Phase 1d: Auth Guards & Decorators

### Goal
JWT authentication guard, role-based authorization guard, and reusable decorators.

### Dependencies
- Phase 1a (NestJS project, JWT packages)
- Phase 1c (Redis for blacklist check, exception filter for error responses)

### Documents
- `backend-structure.md` (guards, decorators)
- `constitution.md` (§8–9)

### Deliverables
- `JwtAuthGuard` — extends Passport `AuthGuard('jwt')`, verifies JWT signature and expiration, checks `jti` against Redis blacklist (rejects blacklisted tokens with 401 A-001), populates `req.user` with `{ id, email, role }`
- `RolesGuard` — reads `@Roles()` metadata from handler/class, compares `user.role` against required roles, returns 403 Z-001 if mismatch
- `@CurrentUser()` parameter decorator — extracts `req.user` from the request
- `@Roles()` method decorator — sets role metadata for `RolesGuard` to read

### Checklist
- [ ] Hitting a guarded endpoint without a token returns 401 A-001
- [ ] Hitting a guarded endpoint with a valid token returns the endpoint data
- [ ] Hitting a guarded endpoint with a blacklisted token returns 401 A-001
- [ ] Hitting an `@Roles('ADMIN')` endpoint as MEMBER returns 403 Z-001
- [ ] Hitting an `@Roles('ADMIN')` endpoint as ADMIN succeeds
- [ ] `@CurrentUser()` returns the correct `{ id, email, role }` from a valid token

---

## Phase 2a: Registration, Login & JWT Strategy

### Goal
User registration with anti-enumeration, login with credential verification and account lockout, and the JWT strategy that underpins all authenticated requests.

### Dependencies
- Phases 1a–1d

### Documents
- `auth-module.md` (register, login sections)
- `error-catalogue.md` (A-003, A-004, A-005, A-006)
- `threatmodel.md` (T-01, T-10)
- `constitution.md` (§1–3, §8–9)
- `002-auth-strategy.md`

### Deliverables
- `AuthModule` with controller, service, repository (user methods only)
- Passport JWT strategy (`jwt.strategy.ts`) — configures secret, token extraction from `Authorization: Bearer`, and validation callback that checks Redis blacklist
- DTOs: `RegisterDto`, `LoginDto`
- `AuthService.register` — bcrypt hash, create user, return generic message (same response whether email is new or already exists)
- `AuthService.login` — lookup user by email, bcrypt.compare, account lockout check, increment failed attempts, generate access + refresh token pair
- `AuthRepository` — `findByEmail`, `createUser`, `updateFailedAttempts`, `setLockedUntil`
- Rate limiting via `@nestjs/throttler` on register and login endpoints (10 req / 60s)
- Account lockout: 10 consecutive failed attempts locks account for 15 min (A-006)
- `AuthModule` registers PassportModule and JwtModule with secrets from env config

### Checklist
- [ ] `POST /api/auth/register` with valid data returns `200` with `{ "message": "If the email is not already registered, an account has been created." }`
- [ ] `POST /api/auth/register` with an existing email returns the same `200` message (anti-enumeration)
- [ ] `POST /api/auth/login` with valid credentials returns `200` with `{ user, accessToken, refreshToken }`
- [ ] `POST /api/auth/login` with wrong password returns `401` with code `A-004` and generic `"Invalid credentials"`
- [ ] `POST /api/auth/login` with non-existent email returns `401` with same `A-004` (identical message, no enumeration)
- [ ] `POST /api/auth/login` — 10 consecutive failures locks the account, returns `423` A-006
- [ ] Locked account returns `423` A-006 even with correct password (until 15 min cooldown)
- [ ] `POST /api/auth/register` and `/api/auth/login` return `429` G-002 when rate limit exceeded

---

## Phase 2b: Token Refresh, Logout & Current User

### Goal
Token refresh with rotation and theft detection, logout with full session invalidation, and current user profile retrieval.

### Dependencies
- Phase 2a (login must work to produce tokens; JWT strategy and AuthModule already registered)

### Documents
- `auth-module.md` (refresh, logout, me sections)
- `error-catalogue.md` (A-001, A-007, A-008)
- `threatmodel.md` (T-02, T-09)
- `constitution.md` (§4–5)

### Deliverables
- DTO: `RefreshDto`
- `AuthService.refresh` — hash the incoming refresh token, lookup in DB, verify JWT signature and expiry, delete old record, issue new access + refresh pair; if old token not found (already used), invalidate ALL sessions for that user (theft detection → A-007)
- `AuthService.logout` — delete the refresh token record from DB, add access token `jti` to Redis with TTL equal to remaining token lifetime
- `AuthService.me` — return `{ id, email, name, role, createdAt }` from `req.user`
- `AuthRepository` — `findRefreshTokenByHash`, `createRefreshToken`, `deleteRefreshToken`, `deleteAllRefreshTokensForUser`
- All endpoints wired into the existing `AuthController`

### Checklist
- [ ] `POST /api/auth/refresh` with a valid refresh token returns `200` with new `{ accessToken, refreshToken }` pair
- [ ] `POST /api/auth/refresh` — the old refresh token is invalidated (using it again returns `401` A-007 — theft detected)
- [ ] `POST /api/auth/refresh` with an expired refresh token returns `401` A-008
- [ ] `POST /api/auth/refresh` with a malformed refresh token returns `401` A-008
- [ ] `POST /api/auth/logout` with a valid access token + refresh token returns `200`, refresh token is deleted from DB, access token `jti` is blacklisted in Redis
- [ ] After logout, using the same access token on a guarded endpoint returns `401` A-001
- [ ] After logout, using the same refresh token returns `401` A-007
- [ ] `GET /api/auth/me` with a valid access token returns `{ id, email, name, role, createdAt }`
- [ ] `GET /api/auth/me` without a token returns `401` A-001

---

## Phase 3a: User Listing & Profile Management

### Goal
User listing, profile retrieval, and profile updates (self-service or by admin).

### Dependencies
- Phases 2a–2b (all endpoints behind JwtAuthGuard; JWT auth and guards required)

### Documents
- `users-module.md` (list, get, update sections)
- `error-catalogue.md` (Z-001, Z-002)
- `constitution.md` (§11)

### Deliverables
- `UsersModule` with controller, service, repository
- DTO: `UpdateUserDto`
- `UsersService.list` — paginated list with search (partial match on name/email) and role filter; ADMIN sees all users, MEMBER gets 403 Z-001
- `UsersService.findById` — get single user by ID; ADMIN sees any user, MEMBER gets 403 Z-001
- `UsersService.updateProfile` — update name and/or email; user can update own profile, admin can update any; email uniqueness enforced on change
- `UsersRepository` — `findAll` (paginated, with search and role filter), `findById`, `findByEmail` (for uniqueness check), `update`

### Checklist
- [ ] `GET /api/users` — ADMIN sees paginated user list with `meta` (page, limit, total, totalPages)
- [ ] `GET /api/users` — MEMBER gets `403` Z-001
- [ ] `GET /api/users` — search by name/email and filter by role work correctly
- [ ] `GET /api/users/:id` — ADMIN sees the user; MEMBER gets `403` Z-001
- [ ] `PATCH /api/users/:id` — user can update own name and email
- [ ] `PATCH /api/users/:id` — ADMIN can update any user's name and email
- [ ] `PATCH /api/users/:id` — MEMBER trying to update another user gets `403` Z-002
- [ ] Email uniqueness is enforced when changing email (duplicate returns `400` A-003)

---

## Phase 3b: Role, Password & User Deletion

### Goal
Admin security operations — role changes with self-demotion prevention, password changes (self-service and admin reset), and user deletion with ownership checks.

### Dependencies
- Phase 3a (users must exist; user repository and module already in place)

### Documents
- `users-module.md` (role, password, delete sections)
- `error-catalogue.md` (Z-001, Z-003, U-001, U-002)

### Deliverables
- DTOs: `ChangeRoleDto`, `ChangePasswordDto`
- `UsersService.changeRole` — change a user's role; ADMIN only; cannot change own role (403 Z-003); valid roles: ADMIN, MEMBER
- `UsersService.changePassword` — self-service requires `currentPassword` for verification; admin reset requires only `newPassword`; `newPassword` validated (min 8 chars, max 128, at least 1 letter + 1 number); bcrypt hashed at cost >= 12
- `UsersService.deleteUser` — ADMIN only; cannot delete self (403 Z-003); check user has no owned projects or tasks (409 U-002 if they do); cascading removal of project memberships
- `UsersRepository` — `updateRole`, `updatePassword`, `countOwnedProjects`, `countOwnedTasks`, `delete` (additions to the Phase 3a repository)

### Checklist
- [ ] `PATCH /api/users/:id/role` — ADMIN can change role; MEMBER gets `403` Z-001
- [ ] `PATCH /api/users/:id/role` — ADMIN cannot change own role (`403` Z-003)
- [ ] `PATCH /api/users/:id/password` — self-service with correct `currentPassword` succeeds
- [ ] `PATCH /api/users/:id/password` — self-service with wrong `currentPassword` returns `400` A-003
- [ ] `PATCH /api/users/:id/password` — ADMIN can reset any user's password without `currentPassword`
- [ ] `DELETE /api/users/:id` — ADMIN can delete; MEMBER gets `403` Z-001
- [ ] `DELETE /api/users/:id` — ADMIN cannot delete self (`403` Z-003)
- [ ] `DELETE /api/users/:id` — user with owned projects or tasks gets `409` U-002 (deletion blocked)

---

## Phase 4a: Project CRUD

### Goal
Project creation, listing, retrieval, and updates with membership-based access control.

### Dependencies
- Phases 2a–2b (JwtAuthGuard)
- Phase 3a (user lookup for membership; basic user repository methods)

### Documents
- `projects-module.md` (create, list, get, update sections)
- `error-catalogue.md`
- `constitution.md` (§16–18)

### Deliverables
- `ProjectsModule` with controller, service, repository
- DTOs: `CreateProjectDto`, `UpdateProjectDto`
- `ProjectsService.create` — create project, auto-add creator as MEMBER of the project
- `ProjectsService.list` — ADMIN sees all projects; MEMBER sees only projects they are a member of; pagination (page/limit), search (partial title match), sort (createdAt, title, updatedAt)
- `ProjectsService.findById` — get single project with members list; ADMIN bypasses membership check; MEMBER must be a member (403 P-001 if not)
- `ProjectsService.update` — any project member or any ADMIN can update title/description
- `ProjectsRepository` — `create`, `findAll` (paginated, with search and sort), `findById`, `update`, `isMember`

### Checklist
- [ ] `GET /api/projects` — ADMIN sees all projects; MEMBER sees only own; pagination/search/sort work correctly
- [ ] `POST /api/projects` — creates project with title/description, creator auto-added as member, returns `201`
- [ ] `GET /api/projects/:id` — member or admin can view project with members list; non-member gets `403` P-001
- [ ] `PATCH /api/projects/:id` — any project member can update title/description; admin can update any project
- [ ] Project response includes `creator: { id, name }`, `memberCount`, `taskCount`

---

## Phase 4b: Project Deletion & Membership Management

### Goal
Project deletion with cascade, and member add/remove operations restricted to admins.

### Dependencies
- Phase 4a (projects must exist before they can be deleted or have members managed)

### Documents
- `projects-module.md` (delete, members sections)
- `error-catalogue.md`
- `constitution.md` (§17, §20)

### Deliverables
- DTO: `AddMemberDto`
- `ProjectsService.delete` — hard delete per Constitution §15; ADMIN can delete any project; MEMBER can delete only projects they created (Z-002 if not); cascade removes all tasks and project memberships
- `ProjectsService.addMember` — ADMIN only (Z-001 for MEMBER); user must exist (U-001); user must not already be a member (409 P-003)
- `ProjectsService.removeMember` — ADMIN only (Z-001 for MEMBER); cannot remove the project creator (403 P-004); removed user's task assignments set to null
- `ProjectsRepository` — `delete`, `addMember`, `removeMember`, `isMember`, `findMember` (additions to the Phase 4a repository)

### Checklist
- [ ] `DELETE /api/projects/:id` — ADMIN can delete any project; creator can delete own project; member-non-creator gets `403` Z-002
- [ ] `DELETE /api/projects/:id` — project not found returns `404` P-002; non-member trying to delete gets `403` P-001
- [ ] Project deletion cascades — all associated tasks and project memberships are removed
- [ ] `POST /api/projects/:id/members` — ADMIN adds a user; MEMBER gets `403` Z-001; already a member gets `409` P-003
- [ ] `DELETE /api/projects/:id/members/:userId` — ADMIN removes a user; cannot remove the project creator (`403` P-004)
- [ ] After removing a member, their task assignments in that project are set to null

---

## Phase 5a: Task CRUD — Create, Read, List, Delete

### Goal
Task creation, listing by project, single-task retrieval, and deletion — the basic lifecycle without status transitions.

### Dependencies
- Phases 2a–2b (JwtAuthGuard)
- Phase 4a (project CRUD and membership checks)

### Documents
- `tasks-module.md` (create, list, get, delete sections)
- `error-catalogue.md`
- `constitution.md` (§12, §15)

### Deliverables
- `TasksModule` with controller, service, repository
- DTOs: `CreateTaskDto`, `TaskFilterDto`
- `TasksService.create` — create task in a project, auto-set `createdById` to the authenticated user; assignee must be a member of the parent project (400 T-001)
- `TasksService.listByProject` — list tasks in a project; scoped to project membership; filterable by status, priority, assigneeId; sortable by createdAt, dueDate, priority, status; paginated (page/limit)
- `TasksService.findById` — get single task by ID; scoped to project membership of the authenticated user (non-member gets 404 T-002)
- `TasksService.delete` — hard delete per Constitution §15; ADMIN or task creator can delete; MEMBER who is not the creator gets 403 Z-002
- `TasksRepository` — `create`, `findByProject` (with filters, sort, pagination), `findById` (with project membership join), `isMemberOfProject`, `delete`

### Checklist
- [ ] `GET /api/projects/:pid/tasks` — lists tasks in the project (members only); filters by status/priority/assigneeId work; sort and pagination work
- [ ] `POST /api/projects/:pid/tasks` — creates task with title, description, status (default TODO), priority (default MEDIUM), dueDate, assigneeId; auto-sets creator; returns `201`
- [ ] `POST /api/projects/:pid/tasks` — assigning a non-member returns `400` T-001
- [ ] `GET /api/tasks/:id` — returns the task (scoped to project membership); non-member gets `404` T-002
- [ ] `DELETE /api/tasks/:id` — ADMIN or creator can delete; MEMBER who is not the creator gets `403` Z-002
- [ ] Task deletion is a hard delete (record removed from database)

---

## Phase 5b: Task Updates & State Machine

### Goal
Task field updates, status transitions with state machine enforcement, and administrative status operations (reopening, unassigning DONE tasks).

### Dependencies
- Phase 5a (tasks must exist before they can be updated)

### Documents
- `tasks-module.md` (update section, state machine, assignee rules)
- `error-catalogue.md`
- `constitution.md` (§12)

### Deliverables
- DTO: `UpdateTaskDto`
- `TasksService.update` — update title, description, priority, dueDate, assigneeId, and/or status on an existing task
- `StatusTransitionValidator` — enforces the state machine rules:
  - Allowed: TODO↔IN_PROGRESS↔DONE (happy path), IN_PROGRESS↔TODO (rollback)
  - Blocked: TODO→DONE directly (400 T-003)
  - Admin-only: DONE→TODO and DONE→IN_PROGRESS (403 T-004 for MEMBER)
  - Assignee required before TODO→IN_PROGRESS (400 T-005)
- Assignee changes: reassign to any project member; setting to null (unassign) is ADMIN-only when task is DONE; any member can unassign non-DONE tasks
- `TasksRepository` — `update`, `findById` (additions to Phase 5a repository)

### Checklist
- [ ] `PATCH /api/tasks/:id` — any project member can update title, description, priority, dueDate
- [ ] `TODO → IN_PROGRESS` succeeds (happy path forward)
- [ ] `TODO → DONE` directly returns `400` T-003 (skip not allowed)
- [ ] `IN_PROGRESS → DONE` succeeds
- [ ] `IN_PROGRESS → TODO` succeeds (rollback allowed)
- [ ] `DONE → TODO` or `DONE → IN_PROGRESS` — ADMIN succeeds, MEMBER gets `403` T-004
- [ ] Unassigned task moving to `IN_PROGRESS` returns `400` T-005
- [ ] Any member can reassign a non-DONE task to another project member
- [ ] Only ADMIN can unassign (set assigneeId to null) a DONE task

---

## Phase 6: Seed Data

### Goal
Reproducible seed data for development and testing.

### Dependencies
- Phases 5a–5b (all tables and modules exist)

### Documents
- `seed-data.md`

### Deliverables
- `prisma/seeds/seed.ts` matching the seed specification exactly
- `package.json` prisma seed configuration
- 3 users (Alice Admin, Bob Builder, Carol Coder), 2 projects (Website Redesign, Mobile App MVP), 5 tasks

### Checklist
- [ ] `npx prisma db seed` completes without errors
- [ ] Alice (ADMIN), Bob (MEMBER), Carol (MEMBER) exist, all with password `Password123!`
- [ ] Website Redesign has 3 members; Mobile App MVP has 2 members
- [ ] 5 tasks exist with correct statuses, priorities, assignees, and due dates
- [ ] `npx prisma migrate reset --force` + `npx prisma db seed` works cleanly

---

## Phase 7a: Test Infrastructure & Unit Tests

### Goal
Reusable test infrastructure and comprehensive unit tests for every backend service (mocked repositories).

### Dependencies
- Phases 1a–1d, 2a–2b, 3a–3b, 4a–4b, 5a–5b, 6 (all backend code must exist)

### Documents
- `test-plan.md`
- `constitution.md` (§26–28)

### Deliverables
- Jest config with test database isolation, global setup/teardown
- Test factories and helpers for every entity (createUser, createProject, createTask, etc.)
- Unit tests for AuthService (token creation, validation, refresh rotation, revocation)
- Unit tests for UsersService (CRUD, role changes, password changes, self-deletion prevention)
- Unit tests for ProjectsService (CRUD, membership add/remove)
- Unit tests for TasksService (CRUD, all state transitions, assignee validation, permission checks)
- Unit tests for AuditService (log creation, list queries)

### Checklist
- [ ] `npm run test` passes (all unit tests)
- [ ] Auth unit tests cover token creation, validation, refresh rotation, revocation
- [ ] User unit tests cover CRUD, role/password changes, self-deletion prevention
- [ ] Project unit tests cover CRUD, membership add/remove
- [ ] Task unit tests cover CRUD, all allowed/blocked state transitions, permission checks
- [ ] Audit unit tests cover log creation and list queries
- [ ] Test factories generate valid entities for every model

---

## Phase 7b: Integration & E2E Tests

### Goal
Full integration test suite covering all API endpoints against a real database, plus auth role coverage.

### Dependencies
- Phase 7a (test infrastructure, factories, helpers)
- Phases 1a–1d, 2a–2b, 3a–3b, 4a–4b, 5a–5b, 6 (all backend endpoints must exist)

### Documents
- `test-plan.md`
- `constitution.md` (§26–28)

### Deliverables
- Test database (`taskflow_test`) with migration + seed before each suite
- Integration tests for every endpoint (success path + at least one error/edge case)
- TC-01 through TC-10 as defined in test-plan.md
- Auth-specific tests: verify both 401 (unauthenticated) and 403 (forbidden) for every protected endpoint
- Negative tests: invalid data, missing fields, duplicate emails, stale/expired tokens, etc.

### Checklist
- [ ] All 10 test cases (TC-01 through TC-10) pass
- [ ] `npm run test:e2e` passes (integration/E2E)
- [ ] Auth tests verify both 401 and 403 cases for protected endpoints
- [ ] Test database is isolated from development database
- [ ] Each endpoint has at least one success and one error test
- [ ] Token refresh, rotation, and revocation integration tests pass
- [ ] State machine integration tests pass for all allowed and blocked transitions

---

## Phase 8: Frontend Scaffolding & Auth UI

### Goal
Bootable Next.js app with authentication screens and auth state management.

### Dependencies
- Phases 2a–2b (full backend auth API must be available)

### Documents
- `frontend-structure.md`
- `auth-module.md`
- `004-frontend-state.md`
- `env-variables.md`

### Deliverables
- Next.js App Router project with TypeScript and Tailwind
- Root layout with React Query provider (`QueryProvider`)
- Auth pages: `/login` (form), `/register` (form), `/logout` (server component)
- `lib/api.ts` — fetch wrapper with auth header injection
- `lib/auth.ts` — token storage (access in memory, refresh in localStorage)
- `hooks/use-auth.ts` — React Query hooks for login/register/logout/me
- `stores/ui-store.ts` — Zustand for UI state (sidebar, toasts)
- `components/layout/auth-check.tsx` — redirects unauthenticated users
- `components/ui/` — button, input, card, spinner, toast primitives
- `(auth)/layout.tsx` — centered card layout, no sidebar

### Checklist
- [ ] `/login` renders form; valid credentials redirect to `/dashboard`
- [ ] `/register` renders form; submission shows success message
- [ ] `/logout` clears tokens and redirects to `/login`
- [ ] Unauthenticated user accessing `/dashboard` redirected to `/login`
- [ ] Authenticated user accessing `/login` redirected to `/dashboard`
- [ ] API calls include `Authorization: Bearer` header
- [ ] React Query caches and serves auth data

---

## Phase 9: Frontend Dashboard & Projects UI

### Goal
Dashboard layout with project CRUD and member management.

### Dependencies
- Phase 8 (frontend auth)
- Phases 4a–4b (backend projects API)

### Documents
- `frontend-structure.md`
- `projects-module.md`

### Deliverables
- `(dashboard)/layout.tsx` — sidebar + header with auth info
- `components/layout/sidebar.tsx` — navigation with active state
- `components/layout/header.tsx` — user name, logout button
- Projects list page (fetches on server)
- Project detail page (info + tasks + members)
- Project create form (client component)
- Project settings page (title/description update)
- Member management page (admin-only: add/remove members)
- `hooks/use-projects.ts` — React Query hooks for project CRUD

### Checklist
- [ ] Dashboard shows project list with member count and task count
- [ ] Create project form works; new project appears in list
- [ ] Project detail shows title, description, members, tasks
- [ ] Project settings allows updating title/description
- [ ] Admin can add/remove members (cannot remove creator)
- [ ] MEMBER sees "not a member" for inaccessible projects
- [ ] Sidebar navigation highlights active route

---

## Phase 10: Frontend Tasks UI

### Goal
Task board, task detail, and task CRUD with state machine enforcement.

### Dependencies
- Phase 9 (project pages)
- Phases 5a–5b (backend tasks API)

### Documents
- `frontend-structure.md`
- `tasks-module.md`

### Deliverables
- Task board (kanban-style, columns: TODO / IN_PROGRESS / DONE)
- Task card component (title, priority badge, assignee, due date)
- Task detail page with all fields
- Create task form (modal or page) — title, description, priority, due date, assignee
- Edit task form — status dropdown, assignee change, field edits
- `hooks/use-tasks.ts` — React Query hooks for task CRUD + filters
- State machine enforcement on status changes

### Checklist
- [ ] Task board shows tasks grouped by status
- [ ] Task card shows title, priority (color-coded), assignee, due date
- [ ] Create task form assigns to project members only
- [ ] Edit task allows changing status via dropdown
- [ ] `TODO → IN_PROGRESS → DONE` progression works
- [ ] `TODO → DONE` is blocked with error message
- [ ] Admin can reopen DONE tasks; MEMBER cannot
- [ ] Assignee can be changed to any project member
- [ ] Unassigned task cannot move to IN_PROGRESS
- [ ] Delete task works (admin or creator)

---

## Phase 11: Frontend Admin Panel & Polish

### Goal
User management UI for admins, error boundaries, loading states, and polish.

### Dependencies
- Phase 8 (auth)
- Phases 3a–3b (backend users API)

### Documents
- `frontend-structure.md`
- `users-module.md`

### Deliverables
- Users list page (admin-only) with search/filter by role
- User detail/edit page (admin-only) — change name, email, role, reset password
- Delete user flow with confirmation (admin-only)
- Global error boundary (`app/error.tsx`)
- Loading states (`loading.tsx` for each route group)
- Toast notification system for success/error feedback

### Checklist
- [ ] Admin can view all users with pagination
- [ ] Admin can change user role (cannot demote self)
- [ ] Admin can reset any user's password
- [ ] Admin can delete a user (cannot delete self)
- [ ] Users list has search and role filter
- [ ] MEMBER navigating to admin routes sees 403 or redirect
- [ ] Loading spinners show during API calls
- [ ] Error toasts appear on API failures
- [ ] 404 page renders for unknown routes
- [ ] `error.tsx` catches rendering errors

---

## Phase 12: Production Configuration

### Goal
Production-ready build, Swagger docs, and deployment artifacts.

### Dependencies
- Phases 1a–1d (can run in parallel with frontend work)

### Documents
- `deployment-guide.md`
- `docker-compose-setup.md`
- `backend-structure.md` (Swagger section)

### Deliverables
- Swagger UI at `/api/docs` (dev only, disabled in production)
- Production Docker Compose with build config for backend and frontend
- PM2 ecosystem file (optional)
- Production checklist items from deployment-guide.md verified

### Checklist
- [ ] `npm run build` succeeds for backend and frontend
- [ ] Swagger UI loads at `/api/docs` in dev; disabled when `NODE_ENV=production`
- [ ] `docker compose up --build` starts all 4 services
- [ ] Frontend at `localhost:3000` calls backend at `localhost:3001/api`
- [ ] CORS only allows the frontend origin
