# Tasks Module

## Responsibilities
- Create, read, update, delete tasks within a project
- Manage task status transitions
- Assign tasks to project members
- Filter and sort tasks
- Enforce status state machine rules

## Role-Permission Matrix

| Endpoint | Unauthenticated | ADMIN | MEMBER |
|----------|-----------------|-------|--------|
| GET /projects/:pid/tasks | ❌ 401 | ✅ (if member) | ✅ (if member) |
| POST /projects/:pid/tasks | ❌ 401 | ✅ | ✅ |
| GET /tasks/:id | ❌ 401 | ✅ (if member) | ✅ (if member) |
| PATCH /tasks/:id | ❌ 401 | ✅ | ✅ |
| DELETE /tasks/:id | ❌ 401 | ✅ | ✅ (own tasks) |

*Note: All task operations require the user to be a member of the task's parent project.*

## Task Status State Machine

```
                    ┌──────────────┐
                    │              │
       ┌───────────▶│    TODO      │◀────────────
       │            │              │             │
       │            └──────┬───────┘             │
       │                   │                     │
       │         ┌─────────▼─────────┐           │
       │         │                   │           │
       │         │   IN PROGRESS     │           │
       │         │                   │           │
       │         └─────────┬─────────┘           │
       │                   │                     │
       │            ┌──────▼───────┐             │
       │            │              │             │
       └────────────│    DONE      │─────────────┘
                    │              │
                    └──────────────┘
```

### Allowed Transitions

| From | To | Who Can Execute | Condition |
|------|-----|----------------|-----------|
| TODO | IN_PROGRESS | Creator, Assignee, Admin | User must be project member |
| IN_PROGRESS | DONE | Creator, Assignee, Admin | Task must have an assignee |
| DONE | TODO | Admin only | Requires admin override reason |
| IN_PROGRESS | TODO | Creator, Assignee, Admin | — |
| DONE | IN_PROGRESS | Admin only | — |

### Transition Rules

1. **Forward progression** (TODO → IN_PROGRESS → DONE) is the happy path. Any member of the project (who is also the creator or assignee) or any Admin can move a task forward.
2. **Reopening DONE tasks** is restricted to Admin only — once marked done, only an Admin can return it to active status.
3. **Skipping states is prohibited.** Cannot go directly from TODO → DONE or DONE → TODO (Admin exception above covers DONE → TODO as a single operation).
4. **DONE is NOT a terminal state** — it can be reopened by Admin.
5. **Edge case — unassigned task:** An unassigned task cannot be moved to IN_PROGRESS. It must first be assigned.
6. **Edge case — past-due status change:** Tasks past their `dueDate` can still have their status changed. The system logs a warning but does not block.
7. **Edge case — simultaneous edits:** Last-write-wins. Prisma's `updatedAt` is used for optimistic concurrency; implement optional version field if race conditions become a problem.
8. **Edge case — deleting in-progress tasks:** A task in IN_PROGRESS can be deleted by an Admin or the creator. A warning is logged.

## Endpoints

### GET /projects/:pid/tasks

List tasks in a project.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | No | Filter: TODO, IN_PROGRESS, DONE |
| priority | string | No | Filter: LOW, MEDIUM, HIGH |
| assigneeId | string | No | Filter by assignee |
| search | string | No | Partial match on title or description |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |
| sort | string | No | Field to sort by: createdAt, dueDate, priority, status |
| order | string | No | asc or desc (default: desc) |

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "title": "Implement auth flow",
      "description": "Add JWT authentication with refresh tokens",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "dueDate": "2026-08-15T00:00:00.000Z",
      "projectId": "uuid",
      "creator": { "id": "uuid", "name": "Alice Admin" },
      "assignee": { "id": "uuid", "name": "Bob Builder" },
      "createdAt": "2026-07-29T00:00:00.000Z",
      "updatedAt": "2026-07-29T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| A-001 | 401 | Not authenticated |
| P-001 | 403 | Not a member of this project |

---

### POST /projects/:pid/tasks

Create a task in a project.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "title": "Implement auth flow",
  "description": "Add JWT authentication with refresh tokens",
  "priority": "HIGH",
  "dueDate": "2026-08-15T00:00:00.000Z",
  "assigneeId": "uuid"
}
```

**Validation Rules:**
- `title`: required, 1-300 chars
- `description`: optional, max 5000 chars
- `priority`: required, one of LOW, MEDIUM, HIGH
- `dueDate`: optional, must be a future date (or today)
- `assigneeId`: optional, must be a UUID of a user who is a member of this project

**Business Rules:**
- The creator (`createdById`) is automatically set to the authenticated user
- The status is automatically set to `TODO`
- The assignee (if provided) must be a member of the project
- The user must be a member of the project to create a task

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Implement auth flow",
    "description": "Add JWT authentication with refresh tokens",
    "status": "TODO",
    "priority": "HIGH",
    "dueDate": "2026-08-15T00:00:00.000Z",
    "projectId": "uuid",
    "creator": { "id": "uuid", "name": "Alice Admin" },
    "assignee": { "id": "uuid", "name": "Bob Builder" },
    "createdAt": "2026-07-29T00:00:00.000Z",
    "updatedAt": "2026-07-29T00:00:00.000Z"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| P-001 | 403 | Not a member of this project |
| T-001 | 400 | Assignee is not a member of this project |
| A-003 | 400 | Validation failed |

---

### GET /tasks/:id

Get a single task.

**Headers:** `Authorization: Bearer <accessToken>`

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Implement auth flow",
    "description": "Add JWT authentication with refresh tokens",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "dueDate": "2026-08-15T00:00:00.000Z",
    "projectId": "uuid",
    "creator": { "id": "uuid", "name": "Alice Admin" },
    "assignee": { "id": "uuid", "name": "Bob Builder" },
    "createdAt": "2026-07-29T00:00:00.000Z",
    "updatedAt": "2026-07-29T00:00:00.000Z"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| P-001 | 403 | Not a member of the task's parent project |
| T-002 | 404 | Task not found |

---

### PATCH /tasks/:id

Update a task's fields and/or status.

**Headers:** `Authorization: Bearer <accessToken>`

**Request:**
```json
{
  "title": "Updated title",
  "status": "IN_PROGRESS",
  "priority": "MEDIUM",
  "dueDate": "2026-08-20T00:00:00.000Z",
  "assigneeId": "uuid"
}
```

**Updatable Fields:**
| Field | Type | Notes |
|-------|------|-------|
| title | string | — |
| description | string | — |
| status | string | Must follow state machine rules |
| priority | string | Any priority value allowed at any time |
| dueDate | string | ISO 8601 date |
| assigneeId | string | Must be a member of the project; null to unassign |

**Business Rules:**
- Any project member can update `title`, `description`, `priority`, and `dueDate`
- Status transitions follow the state machine rules defined above
- Only Admin can change `assigneeId` to `null` on a DONE task
- Changing the assignee assigns the task to a different project member (must be a member)
- Setting `assigneeId` to `null` unassigns the task (Admin only for DONE tasks)
- The user must be a member of the parent project
- Status changes and assignee changes are logged application-side for audit purposes

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "title": "Updated title",
    "description": "Add JWT authentication with refresh tokens",
    "status": "IN_PROGRESS",
    "priority": "MEDIUM",
    "dueDate": "2026-08-20T00:00:00.000Z",
    "projectId": "uuid",
    "creator": { "id": "uuid", "name": "Alice Admin" },
    "assignee": { "id": "uuid", "name": "Bob Builder" },
    "createdAt": "2026-07-29T00:00:00.000Z",
    "updatedAt": "2026-07-29T00:00:00.000Z"
  }
}
```

**Error Cases:**
| Code | HTTP | Condition |
|------|------|-----------|
| P-001 | 403 | Not a project member |
| T-001 | 400 | Assignee is not a member of the project |
| T-003 | 400 | Invalid status transition (e.g., TODO → DONE directly) |
| T-004 | 403 | Not authorized to make this status transition (e.g., MEMBER trying to reopen DONE) |
| T-005 | 400 | Cannot move task to IN_PROGRESS without an assignee |
| T-002 | 404 | Task not found |

---

### DELETE /tasks/:id

Delete a task.

**Headers:** `Authorization: Bearer <accessToken>`

**Business Rules:**
- Admin can delete any task in any project they belong to
- MEMBER can only delete tasks they created
- Hard delete (per Constitution §15)

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
| P-001 | 403 | Not a project member |
| Z-002 | 403 | MEMBER trying to delete another user's task |
| T-002 | 404 | Task not found |
