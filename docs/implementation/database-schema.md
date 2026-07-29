# Database Schema

## Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ─────────────────────────────────────────────

enum Role {
  ADMIN
  MEMBER
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

// ─── Models ────────────────────────────────────────────

model User {
  id                   String     @id @default(uuid()) @db.Uuid
  email                String     @unique @db.VarChar(255)
  password             String     @db.VarChar(255)     // bcrypt hash
  name                 String     @db.VarChar(100)
  role                 Role       @default(MEMBER)
  failedLoginAttempts  Int        @default(0) @map("failed_login_attempts")
  lockedUntil          DateTime?  @map("locked_until")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  createdProjects  Project[]       @relation("ProjectCreator")
  assignedTasks    Task[]          @relation("TaskAssignee")
  createdTasks     Task[]          @relation("TaskCreator")
  projectMemberships ProjectMember[]
  refreshTokens    RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  tokenHash String   @unique @map("token_hash")
  userId    String   @map("user_id") @db.Uuid
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model Project {
  id          String   @id @default(uuid()) @db.Uuid
  title       String   @db.VarChar(200)
  description String?  @db.Text

  createdById String   @map("created_by_id") @db.Uuid
  createdBy   User     @relation("ProjectCreator", fields: [createdById], references: [id])

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  members ProjectMember[]
  tasks   Task[]

  @@map("projects")
}

model ProjectMember {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  projectId String   @map("project_id") @db.Uuid

  joinedAt DateTime @default(now()) @map("joined_at")

  // Relations
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId])
  @@index([userId])
  @@index([projectId])
  @@map("project_members")
}

model Task {
  id          String     @id @default(uuid()) @db.Uuid
  title       String     @db.VarChar(300)
  description String?    @db.Text
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?  @map("due_date") @db.Date

  projectId   String  @map("project_id") @db.Uuid
  createdById String  @map("created_by_id") @db.Uuid
  assigneeId  String? @map("assignee_id") @db.Uuid

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator  User    @relation("TaskCreator", fields: [createdById], references: [id], onDelete: Restrict)
  assignee User?   @relation("TaskAssignee", fields: [assigneeId], references: [id])

  @@index([projectId])
  @@index([assigneeId])
  @@index([status])
  @@map("tasks")
}
```

## SQL CREATE TABLE Statements

For reference and manual verification, here are the equivalent SQL DDL statements:

```sql
-- ─── Enums ─────────────────────────────────────────────

CREATE TYPE role AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');


-- ─── Tables ────────────────────────────────────────────

CREATE TABLE users (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 VARCHAR(255) NOT NULL UNIQUE,
    password              VARCHAR(255) NOT NULL,          -- bcrypt hash
    name                  VARCHAR(100) NOT NULL,
    role                  role        NOT NULL DEFAULT 'MEMBER',
    failed_login_attempts INTEGER     NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);


CREATE TABLE refresh_tokens (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);


CREATE TABLE projects (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    created_by_id UUID        NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_created_by ON projects (created_by_id);


CREATE TABLE project_members (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, project_id)
);

CREATE INDEX idx_project_members_user_id ON project_members (user_id);
CREATE INDEX idx_project_members_project_id ON project_members (project_id);


CREATE TABLE tasks (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(300) NOT NULL,
    description   TEXT,
    status        task_status  NOT NULL DEFAULT 'TODO',
    priority      priority     NOT NULL DEFAULT 'MEDIUM',
    due_date      DATE,
    project_id    UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by_id UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assignee_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_task_assignee_in_project
        CHECK (assignee_id IS NULL OR assignee_id IN (
            SELECT user_id FROM project_members WHERE project_id = project_id
        ))
);

CREATE INDEX idx_tasks_project_id ON tasks (project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks (assignee_id);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
```

## Entity Relationship Diagram

```
┌──────────────────────┐    ┌──────────────────────┐    ┌─────────────┐
│   RefreshToken       │    │        User          │    │   Project   │
│──────────────────────│    │──────────────────────│    │─────────────│
│ id (PK)              │    │ id (PK)              │    │ id (PK)     │
│ tokenHash (UNIQUE)   │    │ email (UNIQUE)       │    │ title       │
│ userId (FK) ─────────┼───▶│ password             │    │ description │
│ expiresAt            │    │ name                 │    │ createdById │
│ createdAt            │    │ role                 │    │ createdBy   │
└──────────────────────┘    │ failedLoginAttempts  │    │ createdAt   │
                            │ lockedUntil          │    │ updatedAt   │
                            └──────┬───┬───┬───────┘    └──────┬──────┘
                                   │   │   │                   │
              ┌────────────────────┘   │   └────────────┐      │ 1:N
              │ 1:N                    │ 1:N            │      │
              ▼                        ▼                 │      ▼
     ┌──────────────────┐    ┌──────────────────┐       │
     │   ProjectMember  │    │     Task (as     │       │
     │──────────────────│    │    assignee)     │       │
     │ userId (FK)      │    │──────────────────│       │
     │ projectId (FK)   │    │ assigneeId (FK)  │       │
     │ UNIQUE(u,p)      │    └──────────────────┘       │
     └──────────────────┘                               │
                                                        │
     ┌──────────────────┐                               │
     │  Task (as        │◀──────────────────────────────┘
     │  creator/owner)  │
     │──────────────────│
     │ createdById (FK) │
     │ projectId (FK)   │──▶ Project
     │ assigneeId (FK)  │──▶ User (assignee)
     └──────────────────┘
```

## Key Constraints Summary

| Constraint | Purpose |
|------------|---------|
| `UNIQUE(userId, projectId)` on ProjectMember | A user cannot be added to the same project twice |
| `ON DELETE CASCADE` on ProjectMember → User | When a user is deleted, their memberships are removed |
| `ON DELETE CASCADE` on ProjectMember → Project | When a project is deleted, all memberships are removed |
| `ON DELETE CASCADE` on Task → Project | When a project is deleted, all tasks are removed |
| `assignee_id IS NULL OR assignee_id IN (...)` | The assignee must be a member of the project (CHECK constraint in SQL, enforced in service layer in Prisma) |
| `ON DELETE CASCADE` on RefreshToken → User | When a user is deleted, their refresh tokens are removed |
| `UNIQUE(token_hash)` on RefreshToken | Prevents duplicate token hash entries |
| `failed_login_attempts DEFAULT 0` on User | Tracks consecutive failed login attempts for account lockout |
| `locked_until` on User | Nullable timestamp — when set, login is blocked until this time |
