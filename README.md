# ElectroPi — Team Task Management Application

A lightweight task board where authenticated users can create projects, manage tasks, assign them to team members, track status changes via drag-and-drop, and manage team membership. Built with a NestJS API backend and a Next.js frontend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 15 via Prisma ORM |
| Cache | Redis 7 (token blacklist) |
| Frontend | Next.js 15 (App Router), React 19 |
| State | Zustand (UI state), React Query (server state) |
| Auth | JWT (access + refresh tokens), bcrypt |
| UI | Tailwind CSS, lucide-react icons, @dnd-kit (drag & drop) |
| Testing | Jest, Supertest |

## Prerequisites

- **Node.js** >= 20
- **npm** >= 9
- **PostgreSQL** >= 15
- **Redis** >= 7

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd electropi

# Install all dependencies (Turborepo workspaces)
npm install
```

This installs dependencies for both `backend/` and `frontend/` automatically via npm workspaces.

## Environment Setup

### Backend (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/taskflow?schema=public` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Access token signing key (min 32 chars) | — |
| `JWT_REFRESH_SECRET` | Refresh token signing key (min 32 chars, different from `JWT_SECRET`) | — |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt salt rounds | `12` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `THROTTLE_TTL` | Rate limit window (ms) | `60000` |
| `THROTTLE_LIMIT` | Max requests per window | `10` |
| `LOG_LEVEL` | Logger level | `log` |

### Frontend (`frontend/.env.local`)

```bash
cp frontend/.env.example frontend/.env.local
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api` |
| `NEXT_PUBLIC_APP_URL` | Frontend public URL | `http://localhost:3000` |

> **Security:** Generate secrets with `openssl rand -hex 32`. Never commit `.env` files.

## Database Setup

```bash
# Start PostgreSQL and Redis (via Docker or natively)
docker compose up -d postgres redis

# Run Prisma migrations
cd backend
npx prisma migrate dev

# Seed the database
npx prisma db seed
```

### Seed Credentials

| Name | Email | Role | Password |
|------|-------|------|----------|
| Alice Admin | admin@taskflow.com | ADMIN | Password123! |
| Bob Builder | bob@taskflow.com | MEMBER | Password123! |
| Carol Coder | carol@taskflow.com | MEMBER | Password123! |

## Running the Project

### Development (Turborepo — both services)

```bash
npm run dev
```

- Backend API: `http://localhost:3001/api`
- Frontend: `http://localhost:3000`
- Swagger UI: `http://localhost:3001/api/docs`

### Individual services

```bash
# Backend only
cd backend && npm run start:dev

# Frontend only
cd frontend && npm run dev
```

### With Docker

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, backend, and frontend containers.

## Running Tests

```bash
cd backend

# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# With coverage
npm run test:cov
```

## Project Structure

```
electropi/
├── backend/               # NestJS API
│   ├── prisma/            # Schema, migrations, seeds
│   ├── src/
│   │   ├── modules/       # Auth, Users, Projects, Tasks
│   │   ├── common/        # Guards, decorators, filters, pipes
│   │   ├── redis/         # Redis client (token blacklist)
│   │   └── prisma/        # Prisma client module
│   ├── test/              # E2E tests
│   └── postman.collection.json
├── frontend/              # Next.js App Router
│   ├── app/               # Pages and layouts
│   ├── components/        # UI, boards, layout components
│   ├── hooks/             # React Query hooks
│   ├── lib/               # API client, auth helpers
│   ├── stores/            # Zustand stores
│   └── types/             # TypeScript type definitions
├── docs/                  # Full project documentation
│   ├── foundation/        # Glossary, principles
│   ├── architecture/      # ADRs, architecture overview
│   ├── modules/           # Module specifications
│   ├── implementation/    # Structure, env vars, error codes
│   └── testing/           # Test plan
├── docker-compose.yml     # PostgreSQL + Redis + backend + frontend
├── turbo.json             # Turborepo configuration
└── package.json           # Root workspace config
```

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Required | Logout (blacklists refresh token) |
| GET | `/api/auth/me` | Required | Current user profile |
| GET | `/api/projects` | Required | List my projects |
| POST | `/api/projects` | Required | Create a project |
| GET | `/api/projects/:id` | Required | Get project detail |
| PATCH | `/api/projects/:id` | Required | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |
| GET | `/api/projects/:pid/tasks` | Required | List project tasks |
| POST | `/api/projects/:pid/tasks` | Required | Create task |
| GET | `/api/tasks/:id` | Required | Get task detail |
| PATCH | `/api/tasks/:id` | Required | Update task |
| DELETE | `/api/tasks/:id` | Required | Delete task |

Full API documentation with request/response shapes is available as a [Postman collection](backend/postman.collection.json) and via Swagger UI at `http://localhost:3001/api/docs`.

## Architecture Overview

The backend follows a **layered architecture** with Controller → Service → Repository pattern. Each module is self-contained with its own DTOs, service, and repository. The frontend uses React Query for server state with Zustand for UI state, and all authenticated pages are Client Components due to the localStorage-based auth strategy.

See [`docs/`](./docs) for the full documentation:
- [`docs/implementation/backend-structure.md`](./docs/implementation/backend-structure.md) — Backend directory tree, middleware order, conventions
- [`docs/implementation/frontend-structure.md`](./docs/implementation/frontend-structure.md) — Frontend directory tree, Server vs Client Component rules
- [`docs/implementation/env-variables.md`](./docs/implementation/env-variables.md) — Complete env var reference
- [`docs/modules/`](./docs/modules) — Detailed module specs with request/response shapes
- [`docs/architecture/`](./docs/architecture) — Architecture decisions (ADRs)
