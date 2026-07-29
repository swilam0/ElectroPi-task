# Threat Model — Auth Threats, OWASP Top Risks & Mitigations

## Risk Rating Legend
- **High** — Exploitable remotely, low skill, high impact (data leak, account takeover)
- **Medium** — Requires conditions or moderate skill, moderate impact
- **Low** — Requires privileged access or complex conditions

---

## Threat Inventory

### T-01: Brute Force Login

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Vector** | Repeated POST /auth/login with guessed credentials |
| **Impact** | Account takeover, data exposure |
| **Mitigation** | Rate limiting via `@nestjs/throttler` — 10 attempts per IP per 15 minutes. Gradual response delay on failure. Account lockout after 10 consecutive failures (15 min cooldown). |
| **Status** | Planned |

### T-02: JWT Theft / Replay

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Vector** | XSS, insecure storage, man-in-the-middle, token leak in logs |
| **Impact** | Full account impersonation, access to all authorized resources |
| **Mitigation** | Short access token TTL (15 min). Refresh token rotation (old token invalidated on refresh). Token blacklist on logout. `localStorage` for refresh tokens (per ADR-002 decision). Never log tokens. HTTPS only in production. |
| **Status** | Planned |

### T-03: Insecure Direct Object Reference (IDOR) on Tasks

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Vector** | Authenticated MEMBER changes URL from `/tasks/abc` to `/tasks/def` to access another project's task |
| **Impact** | Cross-project task leak, unauthorized task modification |
| **Mitigation** | Every task-scoped query MUST join through the user's project membership. Service layer enforces: `WHERE task.project_id IN (SELECT project_id FROM project_members WHERE user_id = :userId)`. Never trust the client-provided ID without ownership check. |
| **Status** | Planned |

### T-04: IDOR on Projects

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Vector** | Authenticated user changes project ID in route to access a project they don't belong to |
| **Impact** | Unauthorized project data access, task listing |
| **Mitigation** | `ProjectsService.findById()` checks membership before returning data. Same pattern as T-03 — always scope queries by the authenticated user's membership. 403 for non-members (differentiates "not found" from "no access"), 404 only when the resource does not exist. |
| **Status** | Planned |

### T-05: Privilege Escalation (Member → Admin)

| Field | Value |
|-------|-------|
| **Risk** | High |
| **Vector** | MEMBER calls `PATCH /users/:id/role` or `POST /projects/:id/members` |
| **Impact** | Unauthorized role elevation, unauthorized membership changes |
| **Mitigation** | Role-based guard at controller level (`RolesGuard`). Role check also enforced in service layer (defense in depth). `@Roles(ADMIN)` decorator on every admin-only endpoint. Never trust the client's role — read from the JWT payload. |
| **Status** | Planned |

### T-06: SQL Injection

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Vector** | Malicious input in search fields, filter parameters, or sort expressions |
| **Impact** | Data exfiltration, data destruction, authentication bypass |
| **Mitigation** | Prisma ORM uses parameterized queries by default — raw SQL is forbidden (Constitution §21). All user input is typed via DTOs with `class-validator`. Filter parameters are whitelisted. |
| **Status** | Mitigated by design (Prisma) |

### T-07: Cross-Site Scripting (XSS)

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Vector** | Malicious script in task title, description, or user display name rendered in the browser |
| **Impact** | Session hijacking, token theft, phishing |
| **Mitigation** | Next.js auto-escapes output by default. API never returns raw HTML. Content-Security-Policy headers. No `dangerouslySetInnerHTML`. Input sanitization on the backend for free-text fields. |
| **Status** | Mitigated by design (Next.js + no HTML rendering) |

### T-08: Cross-Site Request Forgery (CSRF)

| Field | Value |
|-------|-------|
| **Risk** | Low |
| **Vector** | Malicious site triggers authenticated API call via the user's browser cookies |
| **Impact** | Unauthorized state-changing actions |
| **Mitigation** | JWT is sent in `Authorization: Bearer` header (not in cookies) for API requests. Since the browser won't auto-attach the header on cross-origin requests, CSRF is inherently mitigated. CORS is strictly configured to whitelist only the frontend origin. |
| **Status** | Mitigated by design (Bearer token, not cookie) |

### T-09: Refresh Token Theft

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Vector** | Malicious actor steals refresh token from database compromise or insecure storage |
| **Impact** | Long-term access without credentials (up to 7 days) |
| **Mitigation** | Refresh tokens stored as SHA-256 hashes in the database. Token rotation invalidates old tokens. If a stolen refresh token is used after the legitimate user has already rotated it, the system detects a "theft" pattern and invalidates ALL sessions for that user. |
| **Status** | Planned |

### T-10: Enumeration Attacks

| Field | Value |
|-------|-------|
| **Risk** | Medium |
| **Vector** | Repeated registration attempts to discover which emails are already taken |
| **Impact** | User email list exposure |
| **Mitigation** | Registration endpoint returns generic "success" response regardless of whether the email already exists. Login error messages are identical for "user not found" and "wrong password." |
| **Status** | Planned |

---

## OWASP Top 10 (2021) Coverage

| OWASP Category | Covered By |
|----------------|------------|
| A01: Broken Access Control | T-03, T-04, T-05 — IDOR checks, role guards, membership scoping |
| A02: Cryptographic Failures | Constitution §1-3 — bcrypt ≥12, JWT signing, HTTPS |
| A03: Injection | T-06 — Prisma parameterized queries, DTO validation |
| A04: Insecure Design | Principles.md — Clean Architecture boundaries, validation at boundary |
| A05: Security Misconfiguration | Env vars for secrets, strict CORS, error handling (Constitution §10) |
| A06: Vulnerable Components | `npm audit` in CI, lockfile verification, dependency updates |
| A07: Auth Failures | T-01, T-02, T-09 — rate limiting, token rotation, blacklist |
| A08: Data Integrity Failures | Refresh token rotation + theft detection |
| A09: Logging & Monitoring | Structured JSON logs, request IDs for traceability |
| A10: SSRF | No external URL fetching from backend — mitigated by design |
