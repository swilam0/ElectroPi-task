# Constitution — Hard Rules & Non-Negotiables

## Token & Auth Rules

1. **JWT access tokens** MUST expire in 15 minutes (`JWT_EXPIRES_IN=15m`).
2. **JWT refresh tokens** MUST expire in 7 days (`JWT_REFRESH_EXPIRES_IN=7d`).
3. **Passwords** MUST be hashed with bcrypt at cost factor >= 12.
4. **Refresh token rotation:** on each use, the old token record is DELETED from the database and a new one is inserted. (No separate blacklist needed — absence of the record is the blacklist.)
5. **Logout:** The refresh token record is DELETED from the database. The access token's JWT ID (`jti`) is added to Redis with a TTL equal to the token's remaining lifetime.

## API Rules

6. **No business logic in route handlers or controllers.** Controllers parse requests and delegate to services. Services contain all business rules.
7. **All API responses MUST follow the JSEND envelope:**
   - Success: `{ status: 'success', data: {...} }`
   - Fail (validation error): `{ status: 'fail', data: { field: 'message' } }`
   - Error (server error): `{ status: 'error', message: '...', code: '...' }`
8. **Unauthenticated requests** MUST return HTTP 401 with code `A-001`.
9. **Unauthorized requests** (authenticated but wrong role) MUST return HTTP 403 with code `Z-001`.
10. **Never expose internal IDs, stack traces, or debug info** to clients in production.

## Data Rules

11. **Two roles only:** `ADMIN` and `MEMBER`. No exceptions.
12. **Three task statuses only:** `TODO`, `IN_PROGRESS`, `DONE`. No custom statuses.
13. **All entity IDs MUST be UUID v4.** Auto-increment IDs are forbidden.
14. **All tables MUST have `createdAt` and `updatedAt` timestamps** with `DEFAULT NOW()`.
15. **Soft deletes are forbidden** — hard delete only. Audit trail is maintained via application-level logging.
16. **Users can only see projects they are members of.** Project listing MUST filter by membership.
17. **Only ADMINs can add/remove project members.** MEMBERs attempting this MUST receive 403.
18. **When a user creates a project, they MUST be automatically added as a ProjectMember.** This is enforced in `ProjectsService`, not in the controller.
19. **Failed login attempts are tracked per email.** After 10 consecutive failures, the account is locked for 15 minutes. This requires `failedLoginAttempts` (Int, default 0) and `lockedUntil` (DateTime?) fields on the User model.
20. **Only ADMIN (global role) or the project creator can delete a project.** A MEMBER who is not the project creator cannot delete a project.

## Architecture Rules

21. **Service layer MUST NOT import framework symbols** (`@nestjs/common`, `express`, Prisma, JWT library). Only `@Injectable()` for DI registration is allowed. No framework imports in business logic.
22. **Repository interfaces MUST be defined in the domain**, not in the infrastructure layer.
23. **All input validation MUST happen at the boundary** — DTOs with `class-validator` decorators in controllers.
24. **No raw SQL** — all database access through Prisma ORM.
25. **All secrets live in environment variables.** Never hardcode. Never commit `.env` to the repository.

## Testing Rules

26. **Every service MUST have unit tests.** Mocks for repository layer.
27. **Every endpoint MUST have an integration test** covering success and at least one error case.
28. **Auth tests MUST test both the presence and absence** of required roles.

## Enforcement

Violations of any rule above MUST be caught in code review or by automated linting. Any PR that violates these rules is automatically rejected.
