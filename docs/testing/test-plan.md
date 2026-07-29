# Test Plan

## Testing Approach

- **Unit tests:** NestJS services with mocked repositories. Jest.
- **Integration tests:** Controllers + services with real Prisma + test database. Supertest.
- **E2E tests:** Full request lifecycle through HTTP. Supertest + PostgreSQL test container.

### Test Configuration
- Test database: Separate PostgreSQL database (`taskflow_test`)
- Jest config: `test/jest-e2e.json` for integration/E2E tests
- Run before each test suite: `npx prisma migrate deploy` + `npx prisma db seed`

---

## Test Cases

### TC-01: Register a new user

| Field | Value |
|-------|-------|
| **What is tested** | POST /auth/register with valid data creates a user and returns tokens |
| **Input** | `{ email: "new@test.com", password: "Password123!", name: "New User" }` |
| **Expected output** | HTTP 201, JSEND success, response contains `user.id`, `accessToken`, `refreshToken` |
| **Why it matters** | Registration is the entry point for all users. If this breaks, no one can create accounts. Ensures bcrypt hashing works, JWT generation works, and the user is stored correctly with default MEMBER role. |
| **Auth** | Public |

### TC-02: Login with valid credentials

| Field | Value |
|-------|-------|
| **What is tested** | POST /auth/login with correct email/password returns tokens |
| **Input** | `{ email: "admin@taskflow.com", password: "Password123!" }` (from seed) |
| **Expected output** | HTTP 200, JSEND success, response contains `accessToken`, `refreshToken`, `user` object |
| **Why it matters** | Login is the primary authentication flow. Validates bcrypt comparison, JWT payload correctness (userId, email, role), and refresh token storage in DB. |
| **Auth** | Public |

### TC-03: Login with wrong password returns 401

| Field | Value |
|-------|-------|
| **What is tested** | POST /auth/login with incorrect password returns 401 with generic error |
| **Input** | `{ email: "admin@taskflow.com", password: "WrongPassword1" }` |
| **Expected output** | HTTP 401, error code `A-004`, message `"Invalid credentials"` (generic — no hint about which field is wrong) |
| **Why it matters** | Prevents user enumeration attacks. The error message must be identical whether the email exists or the password is wrong. |
| **Auth** | Public |

### TC-04: Create project without authentication returns 401

| Field | Value |
|-------|-------|
| **What is tested** | POST /projects without a Bearer token returns 401 |
| **Input** | No `Authorization` header, body: `{ title: "My Project", description: "" }` |
| **Expected output** | HTTP 401, error code `A-001` |
| **Why it matters** | Ensures JwtAuthGuard is properly applied to protected endpoints. A public endpoint leak would expose project creation to unauthenticated users. |
| **Auth** | None (intentionally) |

### TC-05: Non-member cannot view project tasks

| Field | Value |
|-------|-------|
| **What is tested** | GET /projects/:pid/tasks returns 403 for a user who is not a member of the project |
| **Input** | Authenticate as Bob (MEMBEr of Website Redesign), request tasks of Mobile App MVP (Bob IS a member — adjust: use Carol who is NOT a member of Mobile App MVP) |
| **Expected output** | HTTP 403, error code `P-001` |
| **Why it matters** | Enforces project isolation. A non-member must not be able to see or enumerate tasks. This is the core access control mechanism for data privacy. |
| **Auth** | Authenticated as Carol (not a member of Mobile App MVP) |

### TC-06: MEMBER cannot add members to a project

| Field | Value |
|-------|-------|
| **What is tested** | POST /projects/:id/members returns 403 for a MEMBER user |
| **Input** | Authenticate as Bob (MEMBER), try to add Carol to Website Redesign |
| **Expected output** | HTTP 403, error code `Z-001` |
| **Why it matters** | Membership management is an ADMIN-only privilege. A MEMBER adding other members violates the role model and could lead to privilege escalation. |
| **Auth** | Authenticated as Bob (MEMBER) |

### TC-07: ADMIN adds a member to a project

| Field | Value |
|-------|-------|
| **What is tested** | POST /projects/:id/members returns 201 for an ADMIN user |
| **Input** | Authenticate as Alice (ADMIN), add Carol to Mobile App MVP |
| **Expected output** | HTTP 201, JSEND success, project now has 3 members (Bob, Alice, Carol) |
| **Why it matters** | Verifies ADMIN role correctly grants membership management privileges. Also verifies the duplicate membership check works. |
| **Auth** | Authenticated as Alice (ADMIN) |

### TC-08: Valid task status transitions

| Field | Value |
|-------|-------|
| **What is tested** | PATCH /tasks/:id/status follows the state machine (TODO → IN_PROGRESS → DONE) |
| **Input** | Step 1: Authenticated as Carol (assignee of "Design homepage mockup"), PATCH task status to `IN_PROGRESS`. Step 2: PATCH to `DONE`. |
| **Expected output** | Step 1: HTTP 200, status changes to `IN_PROGRESS`. Step 2: HTTP 200, status changes to `DONE`. |
| **Why it matters** | The state machine is a core domain rule. If transitions fail or bypass validation, task workflow integrity is compromised. Tests both forward progression and role-based access (assignee is allowed). |
| **Auth** | Authenticated as Carol (assignee) |

### TC-09: Invalid status transition returns 400

| Field | Value |
|-------|-------|
| **What is tested** | PATCH /tasks/:id from TODO directly to DONE returns 400 |
| **Input** | Authenticated as Carol, PATCH task "Design homepage mockup" status to `DONE` (skipping `IN_PROGRESS`) |
| **Expected output** | HTTP 400, error code `T-003` |
| **Why it matters** | Prevents invalid state transitions. Tasks must follow the defined workflow. |
| **Auth** | Authenticated as Carol (assignee) |

### TC-10: MEMBER cannot reopen a DONE task

| Field | Value |
|-------|-------|
| **What is tested** | PATCH /tasks/:id from DONE to TODO returns 403 for non-Admin |
| **Input** | Authenticated as Bob, PATCH "Set up CI/CD pipeline" (status = DONE) to TODO |
| **Expected output** | HTTP 403, error code `T-004` |
| **Why it matters** | Reopening completed tasks is an Admin-only operation. A MEMBER bypassing this rule undermines workflow integrity. |
| **Auth** | Authenticated as Bob (MEMBER) |

---

## Test Execution Commands

```bash
# Unit tests
cd backend && npm run test

# Integration/E2E tests
cd backend && npm run test:e2e

# With coverage
cd backend && npm run test:cov
```

## Test Database Setup

```bash
# Create test database
createdb taskflow_test

# Run migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskflow_test" npx prisma migrate deploy
```
