# ADR-002: Authentication Strategy

**Title:** Use JWT access tokens with bcrypt password hashing and refresh token rotation
**Status:** Accepted
**Date:** 2026-07-29

## Context

We need an authentication system that:
- Supports stateless API access (no server-side sessions)
- Allows role-based authorization via the token payload
- Handles token expiry and renewal without requiring re-login
- Stores passwords securely
- Supports token revocation on logout

Options considered: JWT, session-based auth (passport + express-session), OAuth2.

## Decision

Use **JWT (JSON Web Tokens)** with the following strategy:

1. **Password hashing:** bcrypt with cost factor ≥ 12
2. **Access token:** Short-lived (15 min), signed with `JWT_SECRET`, contains `{ userId, email, role }`
3. **Refresh token:** Longer-lived (7 days), stored as bcrypt hash in database, rotated on every use
4. **Token revocation:** On logout, the refresh token record is deleted from the `refresh_tokens` table (absence of the record is the blacklist). The access token's `jti` is added to Redis with a TTL equal to its remaining lifetime. On refresh, the old refresh token is deleted and a new one is inserted (rotation).
5. **Client-side storage:** Access tokens are stored in memory (JavaScript variable) on the client. Refresh tokens are stored in `localStorage`. Rationale: httpOnly cookies require CSRF protection; `localStorage` is acceptable given XSS mitigations in place.

## Consequences

- **Positive:**
  - Stateless access token verification (no DB lookup for auth)
  - Role information embedded in JWT — enables `RolesGuard` without extra queries
  - Refresh token rotation limits exposure window if a refresh token is stolen
  - bcrypt is the industry standard for password hashing
  - Access token in memory reduces XSS exposure window compared to persistent storage

- **Negative:**
  - Requires careful handling of token storage on the client (localStorage vs httpOnly cookie)
  - Token blacklist table adds some statefulness for refresh tokens
  - JWT cannot be revoked server-side (mitigated by short expiry + refresh rotation)

- **Trade-off:** Using httpOnly cookies for refresh tokens prevents XSS theft but requires CSRF protection. We chose Bearer header approach instead, which avoids CSRF entirely.
