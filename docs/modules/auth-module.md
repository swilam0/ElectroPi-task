# Auth Module

## Responsibilities
- User registration and account creation
- User login with credential verification
- JWT access token generation and validation
- Refresh token issuance and rotation
- Token blacklisting on logout
- Current user profile retrieval

## Role-Permission Matrix

| Endpoint | Unauthenticated | ADMIN | MEMBER |
|----------|-----------------|-------|--------|
| POST /auth/register | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ |
| POST /auth/refresh | ✅ | ✅ | ✅ |
| POST /auth/logout | ❌ 401 | ✅ | ✅ |
| GET /auth/me | ❌ 401 | ✅ | ✅ |

## Endpoints

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Validation Rules:**
- `email`: valid email format, unique in database, max 255 chars
- `password`: min 8 chars, max 128 chars, must contain at least 1 letter and 1 number
- `name`: min 2 chars, max 100 chars

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "message": "If the email is not already registered, an account has been created."
  }
}
```
*Note: New users are always created with `MEMBER` role. Admin role can only be assigned by an existing Admin. The response does not reveal whether the email was already registered (anti-enumeration per threat model T-10).*

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-003 | 400 | Validation failed (weak password, invalid email, etc.) |

---

### POST /auth/login

Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Business Rules:**
- Use bcrypt.compare() to verify password
- Check for account lockout (10 failed attempts = 15 min cooldown)
- Generate access token (15 min) and refresh token (7 days)
- Store bcrypt hash of refresh token in database

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "MEMBER"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-004 | 401 | Invalid credentials (generic — don't distinguish "user not found" from "wrong password") |
| A-005 | 429 | Too many failed attempts — rate limited |
| A-006 | 423 | Account temporarily locked (10 consecutive failures) |

---

### POST /auth/refresh

Exchange a valid refresh token for a new access + refresh token pair.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Business Rules:**
- Look up the refresh token in the database by its hash
- Verify the JWT signature and expiration
- If valid, generate new access + refresh token pair
- Hash and store the new refresh token; delete the old one (rotation)
- If the old token is not found (already used), the previous legitimate token was stolen — invalidate ALL sessions for that user

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-007 | 401 | Refresh token has been revoked (possible theft detected) |
| A-008 | 401 | Refresh token is expired or has an invalid signature |

---

### POST /auth/logout

Revoke the current refresh token(s).

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Business Rules:**
- Delete the refresh token record from the database
- Add the access token's JWT ID (`jti`) to Redis with a TTL equal to its remaining lifetime

**Success Response (200):**
```json
{
  "status": "success",
  "data": null
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-001 | 401 | Token missing/invalid |

---

### GET /auth/me

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <accessToken>`

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "MEMBER",
    "createdAt": "2026-07-29T00:00:00.000Z"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-001 | 401 | Token missing or invalid |

---

## Token Lifecycle

```
Register ──▶ {access: 15m, refresh: 7d}
Login    ──▶ {access: 15m, refresh: 7d}
                │
                ├──▶ Access expires ──▶ Use refresh ──▶ New pair issued (rotation)
                │                          │
                │                          ├──▶ Success ──▶ New pair
                │                          └──▶ Fail ──▶ Re-login required
                │
                └──▶ Logout ──▶ Refresh token deleted from DB, access token jti added to Redis

Refresh token recycled (rotated) on each use.
Old refresh token deleted, new one issued.
```
