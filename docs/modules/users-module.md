# Users Module

## Responsibilities
- List all users (Admin only)
- Get user by ID (Admin only)
- Update user profile (Admin or self)
- Delete user (Admin only)
- Change user role (Admin only)

## Role-Permission Matrix

| Endpoint | Unauthenticated | ADMIN | MEMBER |
|----------|-----------------|-------|--------|
| GET /users | ❌ 401 | ✅ | ❌ 403 |
| GET /users/:id | ❌ 401 | ✅ | ❌ 403 |
| PATCH /users/:id | ❌ 401 | ✅ (any) | ✅ (self only) |
| DELETE /users/:id | ❌ 401 | ✅ | ❌ 403 |
| PATCH /users/:id/role | ❌ 401 | ✅ | ❌ 403 |
| PATCH /users/:id/password | ❌ 401 | ✅ (any user) | ✅ (self only) |

## Endpoints

### GET /users

List all registered users. Admin only.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |
| search | string | No | Filter by name or email (partial match) |
| role | string | No | Filter by role: ADMIN or MEMBER |

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Alice Admin",
      "role": "ADMIN",
      "createdAt": "2026-07-29T00:00:00.000Z",
      "updatedAt": "2026-07-29T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-001 | 401 | Not authenticated |
| Z-001 | 403 | Not an Admin |

---

### GET /users/:id

Get a single user by ID. Admin only.

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "member@example.com",
    "name": "Bob Member",
    "role": "MEMBER",
    "createdAt": "2026-07-29T00:00:00.000Z",
    "updatedAt": "2026-07-29T00:00:00.000Z"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| Z-001 | 403 | Not an Admin |
| U-001 | 404 | User not found |

---

### PATCH /users/:id

Update user profile. Admin can update any user. Member can only update their own profile.

**Request:**
```json
{
  "name": "Updated Name"
}
```

**Updatable Fields:**
| Field | Type | Admin Can Update | Member Can Update (self) |
|-------|------|------------------|--------------------------|
| name | string | ✅ | ✅ |
| email | string | ✅ | ✅ |

**Business Rules:**
- A MEMBER can only update their own profile (userId from JWT must match `:id`)
- An ADMIN can update any user's profile
- Email uniqueness is enforced when changing email

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "member@example.com",
    "name": "Updated Name",
    "role": "MEMBER"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| Z-002 | 403 | MEMBER trying to update another user's profile |
| U-001 | 404 | User not found |
| A-003 | 400 | Validation failed |

---

### PATCH /users/:id/role

Change a user's role. Admin only.

**Request:**
```json
{
  "role": "ADMIN"
}
```

**Business Rules:**
- Only ADMIN can change roles
- Cannot change own role (prevent accidental self-demotion)
- Valid roles: `ADMIN`, `MEMBER`

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "member@example.com",
    "name": "Bob Member",
    "role": "ADMIN"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| Z-001 | 403 | Not an Admin |
| Z-003 | 403 | Cannot change own role |
| U-001 | 404 | User not found |
| A-003 | 400 | Invalid role value |

---

### PATCH /users/:id/password

Change a user's password. Self-service or admin reset.

**Request (self-service):**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Request (admin reset):**
```json
{
  "newPassword": "AdminSetPass789!"
}
```

**Business Rules:**
- A MEMBER or ADMIN changing their own password MUST provide `currentPassword` for verification
- An ADMIN changing another user's password does NOT need `currentPassword` — can reset directly
- `newPassword`: min 8 chars, max 128 chars, must contain at least 1 letter and 1 number
- Password is hashed with bcrypt (cost ≥ 12) before storage

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| Z-002 | 403 | MEMBER trying to change another user's password |
| A-003 | 400 | Validation failed (weak password, wrong current password, etc.) |
| U-001 | 404 | User not found |

---

### DELETE /users/:id

Delete a user. Admin only.

**Business Rules:**
- Cannot delete own account (use a separate self-deletion endpoint if needed)
- Admin must reassign or delete all projects and tasks created by the user before deletion. The `creator` relation on Task uses `onDelete: Restrict`, so Prisma will block deletion if the user has created any tasks.
- Project memberships are removed (cascading)

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
| Z-001 | 403 | Not an Admin |
| Z-003 | 403 | Cannot delete own account |
| U-001 | 404 | User not found |
| U-002 | 409 | User has active projects (must delete or transfer them first) |
