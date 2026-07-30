# Projects Module

## Responsibilities
- Create, read, update, delete projects
- Manage project membership (add/remove members)
- Enforce membership-based access control
- List projects the current user is a member of

## Role-Permission Matrix

| Endpoint | Unauthenticated | ADMIN | MEMBER |
|----------|-----------------|-------|--------|
| GET /projects | ❌ 401 | ✅ (all) | ✅ (own) |
| POST /projects | ❌ 401 | ✅ | ✅ |
| GET /projects/:id | ❌ 401 | ✅ (if member) | ✅ (if member) |
| PATCH /projects/:id | ❌ 401 | ✅ (if member) | ✅ (if member) |
| DELETE /projects/:id | ❌ 401 | ✅ (any) | ✅ (creator only) |
| POST /projects/:id/members | ❌ 401 | ✅ | ❌ 403 |
| DELETE /projects/:id/members/:userId | ❌ 401 | ✅ | ❌ 403 |

*Note: "if member" means the user must be a member of the project to access it.*

## Endpoints

### GET /projects

List projects the current user has access to.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |
| sort | string | No | Sort field: createdAt, title, updatedAt |
| order | string | No | asc or desc (default: desc) |
| search | string | No | Partial match on title |

**Business Rules:**
- MEMBER sees only projects where they are a member
- ADMIN sees all projects (unless we want to scope them too — decision: ADMIN sees all)

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "Website Redesign",
      "description": "Complete overhaul of the company website",
      "creator": { "id": "uuid", "name": "Alice Admin" },
      "createdAt": "2026-07-29T00:00:00.000Z",
      "updatedAt": "2026-07-29T00:00:00.000Z",
      "memberCount": 3,
      "taskCount": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-001 | 401 | Not authenticated |

---

### POST /projects

Create a new project.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "title": "Website Redesign",
  "description": "Complete overhaul of the company website"
}
```

**Validation Rules:**
- `title`: required, 1-200 chars
- `description`: optional, max 2000 chars

**Business Rules:**
- The creator is automatically added as a MEMBER of the project
- The creator does not become an ADMIN of the project — project administration is determined by global role

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Website Redesign",
    "description": "Complete overhaul of the company website",
    "creator": { "id": "uuid", "name": "Alice Admin" },
    "createdAt": "2026-07-29T00:00:00.000Z",
    "updatedAt": "2026-07-29T00:00:00.000Z"
  }
}

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-001 | 401 | Not authenticated |
| A-003 | 400 | Validation failed |

---

### GET /projects/:id

Get a single project by ID.

**Headers:** `Authorization: Bearer <accessToken>`

**Business Rules:**
- Must be a member of the project (or ADMIN) to access
- Returns 403, not 404, if user is not a member (differentiates "not found" from "no access")

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Website Redesign",
    "description": "Complete overhaul of the company website",
    "creator": { "id": "uuid", "name": "Alice Admin" },
    "createdAt": "2026-07-29T00:00:00.000Z",
    "updatedAt": "2026-07-29T00:00:00.000Z",
    "members": [
      { "id": "uuid", "name": "Alice Admin", "email": "admin@example.com", "role": "ADMIN" },
      { "id": "uuid", "name": "Bob Builder", "email": "bob@example.com", "role": "MEMBER" }
    ]
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| P-001 | 403 | Not a member of this project |
| P-002 | 404 | Project not found |

---

### PATCH /projects/:id

Update project details.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Business Rules:**
- Any member of the project can update its details
- An ADMIN can update any project

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    "description": "Updated description",
    "creator": { "id": "uuid", "name": "Alice Admin" },
    "createdAt": "2026-07-29T00:00:00.000Z",
    "updatedAt": "2026-07-29T00:00:00.000Z"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| P-001 | 403 | Not a member |
| P-002 | 404 | Project not found |

---

### DELETE /projects/:id

Delete a project and all associated tasks.

**Headers:** `Authorization: Bearer <accessToken>`

**Business Rules:**
- ADMIN can delete any project
- MEMBER can delete only projects they created
- Cascading delete removes all tasks and project memberships
- This is a hard delete per Constitution §15

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
| A-001 | 401 | Not authenticated |
| P-001 | 403 | Not a member of this project |
| Z-002 | 403 | MEMBER trying to delete a project they didn't create |
| P-002 | 404 | Project not found |

---

### POST /projects/:id/members

Add a user to the project.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Business Rules:**
- Only ADMIN can add members
- The user must exist in the database
- The user must not already be a member of the project (409 if already added)
- Membership changes are logged application-side for audit purposes

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "projectId": "uuid",
    "joinedAt": "2026-07-29T00:00:00.000Z"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| Z-001 | 403 | Not an Admin |
| U-001 | 404 | User not found |
| P-002 | 404 | Project not found |
| P-003 | 409 | User is already a member |

---

### DELETE /projects/:id/members/:userId

Remove a user from the project.

**Headers:** `Authorization: Bearer <accessToken>`

**Business Rules:**
- Only ADMIN can remove members
- Cannot remove the project creator from the project
- Removed user's task assignments in the project are set to null (unassigned)
- Membership changes are logged application-side for audit purposes

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
| U-001 | 404 | User not found |
| P-002 | 404 | Project not found |
| P-004 | 403 | Cannot remove the project creator |
| P-005 | 404 | User is not a member of the project |
