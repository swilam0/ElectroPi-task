# Engineering Principles

## SOLID Principles

### S — Single Responsibility Principle

> Every class/module should have exactly one reason to change.

**Example (this project):**

```typescript
// BAD — Controller handles business logic
@Controller('tasks')
export class TasksController {
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException();
    // ...validation logic here... ← business logic leak
  }
}

// GOOD — Controller delegates to service
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.tasksService.updateStatus(id, dto);
  }
}
```

`TasksService` handles status transitions, validation, and business rules. `TasksController` only handles HTTP concerns (parsing request, returning response).

### O — Open/Closed Principle

> Classes should be open for extension but closed for modification.

**Example (this project):**

```typescript
// Core status transition map — closed for modification
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE'],
  DONE: ['TODO', 'IN_PROGRESS'], // Admin-only reopening allowed
};

// Extending behavior via composition, not modification
class StatusTransitionValidator {
  canTransition(from: TaskStatus, to: TaskStatus): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }
}
```

Adding a new status means adding an entry to the enum and the transition map — not rewriting conditionals throughout the codebase.

### L — Liskov Substitution Principle

> Derived classes must be substitutable for their base classes without altering correctness.

**Example (this project):**

```typescript
// Base guard
export class AuthGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any) {
    if (err || !user) throw new UnauthorizedException();
    return user;
  }
}

// Derived guard — fully substitutable
export class OptionalAuthGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any) {
    return user; // Returns null instead of throwing — still valid behavior
  }
}
```

Any code expecting `JwtAuthGuard` works correctly with `OptionalAuthGuard` because it returns the same shape of result.

### I — Interface Segregation Principle

> No client should be forced to depend on methods it does not use.

**Example (this project):**

```typescript
// Segregated interfaces — consumers depend only on what they need
interface ITaskReader {
  findById(id: string): Promise<Task | null>;
  findByProject(projectId: string): Promise<Task[]>;
}

interface ITaskWriter {
  create(data: CreateTaskDto): Promise<Task>;
  update(id: string, data: UpdateTaskDto): Promise<Task>;
  delete(id: string): Promise<void>;
}

// Read-only consumer
class TaskViewController {
  constructor(private readonly reader: ITaskReader) {} // No write methods exposed
}
```

### D — Dependency Inversion Principle

> Depend on abstractions, not concretions.

**Example (this project):**

```typescript
// Domain abstraction (no framework import)
export interface ITaskRepository extends ITaskReader, ITaskWriter {}

// Service depends on abstraction
@Injectable()
export class TasksService {
  constructor(private readonly taskRepo: ITaskRepository) {} // ← abstraction, not PrismaService
}

// Infrastructure provides concrete implementation
@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaService) {}
}
```

The service layer never imports Prisma directly. Swap implementations (e.g., to an in-memory store for tests) by changing the DI binding only.

---

## 12-Factor App Compliance

| Factor | Description | How We Implement |
|--------|-------------|------------------|
| **I. Codebase** | One codebase tracked in revision control, many deploys | Single Git repo. `/backend` and `/frontend` in one monorepo. One `package.json` per app. |
| **II. Dependencies** | Explicitly declare and isolate dependencies | All dependencies in `package.json` with exact semver ranges. `package-lock.json` committed. No system-level dependencies. `npm ci` for reproducible installs. |
| **III. Config** | Store config in environment variables | All config via `process.env`. `.env.example` documents every variable. No hardcoded values. Configuration is never grouped into "environments" files. |
| **IV. Backing Services** | Treat backing services as attached resources | PostgreSQL and Prisma connected via `DATABASE_URL`. Swapping to a different PostgreSQL instance requires changing only the connection string. Zero code changes. |
| **V. Build, Release, Run** | Strictly separate build and run stages | `npm run build` (compile TypeScript) → `npx prisma migrate deploy` (release DB changes) → `npm run start:prod` (run). Build artifacts are never modified at runtime. |
| **VI. Processes** | Execute the app as one or more stateless processes | NestJS is stateless. Session state is stored in JWT tokens or the database. No in-memory session state. Horizontal scale via multiple processes. |
| **VII. Port Binding** | Export services via port binding | Server binds to `PORT` env var. No embedded web server needed. `npm run start:prod` starts the HTTP server directly. |
| **VIII. Concurrency** | Scale out via the process model | Each process handles any request. No sticky sessions required. Multiple processes via PM2 or `node:cluster`. |
| **IX. Disposability** | Maximize robustness with fast startup and graceful shutdown | `PrismaService.enableShutdownHooks()` ensures clean DB connection teardown. `SIGTERM` handler drains requests before exiting. Startup is sub-second after `node_modules` is cached. |
| **X. Dev/Prod Parity** | Keep development, staging, and production as similar as possible | Same database engine (PostgreSQL) across all environments. Same dependency versions. Docker Compose provides identical DB setup. |
| **XI. Logs** | Treat logs as event streams | Structured JSON logging via `@nestjs/common` Logger. Output goes to stdout only. Never write to files. Aggregation handled by the deployment platform (e.g., systemd journal, CloudWatch). |
| **XII. Admin Processes** | Run admin/management tasks as one-off processes | Migrations: `npx prisma migrate deploy`. Seed data: `npx prisma db seed`. Both run as one-off commands against a running database, not embedded in application startup. |

---

## Clean Architecture Boundaries

### Layer Rules

```
┌──────────────────────────────────────────────┐
│  Presentation Layer (Controllers, Guards)     │
│  Imports: @nestjs/common, class-validator    │
│  Role: Parse request, validate, return response │
├──────────────────────────────────────────────┤
│  Application Layer (Services, Use Cases)     │
│  Imports: Domain interfaces, DTOs, enums     │
│  Role: Business logic, orchestration         │
│  ⚠ NO framework imports in business logic    │
├──────────────────────────────────────────────┤
│  Domain Layer (Entities, Interfaces, Enums)  │
│  Imports: None (pure TypeScript)             │
│  Role: Domain models, repository contracts   │
├──────────────────────────────────────────────┤
│  Infrastructure Layer (Prisma, JWT, Guards)  │
│  Imports: PrismaClient, @nestjs/jwt, bcrypt  │
│  Role: Implement interfaces, DB access, I/O  │
└──────────────────────────────────────────────┘
```

### Hard Boundary Rules

1. **Domain layer must be pure TypeScript** — no framework imports, no decorators, no external dependencies beyond `@nestjs/common` for basic types.
2. **Service layer may import `@Injectable()` only** — for DI registration. No `@nestjs/jwt`, `@prisma/client`, `express`, or other framework/library imports in service files.
3. **Infrastructure code must not contain business rules** — Prisma repositories implement CRUD but never validate status transitions or check permissions. That belongs in services.
4. **Controllers must not access the database** — they call services. If a response requires multiple services, compose in the controller or create a dedicated use-case service.
5. **DTOs must be defined at the controller boundary** — they are not shared with the domain. Each layer has its own data shape.
