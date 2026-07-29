# Error Catalogue

## Error Response Format

All error responses follow the JSEND format:

### Validation Error (400)
```json
{
  "status": "fail",
  "data": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

### Application Error (4xx/5xx)
```json
{
  "status": "error",
  "message": "Invalid credentials",
  "code": "A-004"
}
```

### Server Error (500)
```json
{
  "status": "error",
  "message": "Internal server error",
  "code": "G-001"
}
```
*Note: In production, stack traces and internal details are never exposed.*

---

## Error Code Reference

### Global Errors (G-*)

| Code | HTTP | Message | Trigger Condition |
|------|------|---------|-------------------|
| G-001 | 500 | Internal server error | Unexpected server error (catch-all in exception filter) |
| G-002 | 429 | Too many requests | Rate limit exceeded |
| G-003 | 400 | Validation failed | DTO validation failed — details in `data` field |

### Auth Errors (A-*)

| Code | HTTP | Message | Trigger Condition |
|------|------|---------|-------------------|
| A-001 | 401 | Authentication required | Missing, malformed, or expired access token |

| A-003 | 400 | Validation failed | Weak password, invalid email format, missing fields |
| A-004 | 401 | Invalid credentials | Wrong email or password (generic — same message for both) |
| A-005 | 429 | Too many login attempts | Rate limiting threshold hit for IP or user |
| A-006 | 423 | Account temporarily locked | 10 consecutive failed login attempts (15 min cooldown) |
| A-007 | 401 | Refresh token revoked or reused | Token not found in DB (possible theft detected) |
| A-008 | 401 | Refresh token expired or invalid | Refresh token JWT is expired or has an invalid signature |

### Authorization Errors (Z-*)

| Code | HTTP | Message | Trigger Condition |
|------|------|---------|-------------------|
| Z-001 | 403 | Insufficient permissions | MEMBER trying to access ADMIN-only endpoint |
| Z-002 | 403 | Cannot modify this resource | MEMBER trying to delete/update another user's resource |
| Z-003 | 403 | Cannot perform this action on yourself | Admin trying to demote or delete own account |

### User Errors (U-*)

| Code | HTTP | Message | Trigger Condition |
|------|------|---------|-------------------|
| U-001 | 404 | User not found | User ID does not exist |
| U-002 | 409 | User has active projects | Attempting to delete a user who owns projects |

### Project Errors (P-*)

| Code | HTTP | Message | Trigger Condition |
|------|------|---------|-------------------|
| P-001 | 403 | You are not a member of this project | Non-member trying to access or modify a project/tasks |
| P-002 | 404 | Project not found | Project ID does not exist |
| P-003 | 409 | User is already a member | POST /projects/:id/members for an existing member |
| P-004 | 403 | Cannot remove the project creator | DELETE /projects/:id/members/:userId targeting project creator |
| P-005 | 404 | User is not a member of this project | Removing a user who is not a member |

### Task Errors (T-*)

| Code | HTTP | Message | Trigger Condition |
|------|------|---------|-------------------|
| T-001 | 400 | Assignee is not a member of this project | Assigning task to a user not in the project |
| T-002 | 404 | Task not found | Task ID does not exist |
| T-003 | 400 | Invalid status transition | Illegal transition (e.g., TODO → DONE directly) |
| T-004 | 403 | Not authorized to change task status | MEMBER trying to reopen DONE; non-creator/non-assignee changing status |
| T-005 | 400 | Cannot start a task without an assignee | Moving TODO → IN_PROGRESS with no assignee |

---

## Error Code Reference Table

| Code | HTTP | Module | Short Message |
|------|------|--------|---------------|
| G-001 | 500 | Global | Internal server error |
| G-002 | 429 | Global | Too many requests |
| G-003 | 400 | Global | Validation failed |
| A-001 | 401 | Auth | Authentication required |
| A-003 | 400 | Auth | Validation failed (auth) |
| A-004 | 401 | Auth | Invalid credentials |
| A-005 | 429 | Auth | Too many login attempts |
| A-006 | 423 | Auth | Account temporarily locked |
| A-007 | 401 | Auth | Refresh token revoked |
| A-008 | 401 | Auth | Refresh token expired or invalid |
| Z-001 | 403 | Authz | Insufficient permissions |
| Z-002 | 403 | Authz | Cannot modify this resource |
| Z-003 | 403 | Authz | Cannot perform on yourself |
| U-001 | 404 | Users | User not found |
| U-002 | 409 | Users | User has active projects |
| P-001 | 403 | Projects | Not a project member |
| P-002 | 404 | Projects | Project not found |
| P-003 | 409 | Projects | User already a member |
| P-004 | 403 | Projects | Cannot remove creator |
| P-005 | 404 | Projects | User not a member |
| T-001 | 400 | Tasks | Assignee not in project |
| T-002 | 404 | Tasks | Task not found |
| T-003 | 400 | Tasks | Invalid status transition |
| T-004 | 403 | Tasks | Not authorized for status change |
| T-005 | 400 | Tasks | Task needs assignee to start |
