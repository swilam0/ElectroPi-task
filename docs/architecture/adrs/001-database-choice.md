# ADR-001: Database Choice

**Title:** Use PostgreSQL as the primary database
**Status:** Accepted
**Date:** 2026-07-29

## Context

We need a database for the Task Management application. Requirements:
- Strong relational integrity (users, projects, tasks with foreign keys)
- Support for enum types (task status, roles, priority)
- Transaction support for multi-table operations
- JSON-like flexibility for future extensibility
- Mature ORM support
- Established hosting options at reasonable cost

Options considered: PostgreSQL, MySQL, SQLite, MongoDB.

## Decision

Use **PostgreSQL** as the primary database.

Rationale:
1. **Relational integrity** — The domain model has clear relationships (Project → Task, User → Task, User ↔ Project through membership). PostgreSQL enforces referential integrity via foreign keys.
2. **Enum support** — Native `CREATE TYPE` for task status, roles, and priority. No magic strings.
3. **JSONB** — Allows semi-structured data (e.g., task metadata, custom fields) without sacrificing relational integrity.
4. **ACID compliance** — Transactional guarantees for multi-table operations (e.g., creating a task and updating project count atomically).
5. **Prisma support** — Prisma has first-class PostgreSQL support with migrations, enum generation, and type safety.
6. **Industry standard** — Widely deployed, excellent tooling, strong community.

## Consequences

- **Positive:** Strong data integrity, enum safety, rich querying, Prisma compatibility.
- **Negative:** Heavier than SQLite for local dev (mitigated by Docker Compose).
- **Trade-off:** No built-in replication (not needed at this scale; can add later via streaming replication).
