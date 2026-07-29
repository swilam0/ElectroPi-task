# TaskFlow — Team Task Management Application

A lightweight task board where authenticated users can create projects, manage tasks, assign them to team members, and track status changes.

**Tech Stack:** NestJS (backend) + Prisma (ORM) + PostgreSQL (database) + Next.js App Router (frontend) + JWT/bcrypt (auth) + Jest/Supertest (testing)

---

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- npm >= 9

---

## Getting Started

### 1. Clone and Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your database URL and secrets

# Frontend
cp .env.example frontend/.env.local
# Edit frontend/.env.local with your API URL
```

### 3. Database Setup

```bash
cd backend

# Create the database
createdb taskflow

# Run migrations
npx prisma migrate dev --name init

# Seed the database with sample data
npx prisma db seed
```

### 4. Run the Application

```bash
# Terminal 1 — Backend API
cd backend
npm run start:dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The API is available at `http://localhost:3001/api` and the frontend at `http://localhost:3000`.

### 5. Run Tests

```bash
cd backend
npm run test        # Unit tests
npm run test:e2e    # Integration/E2E tests
npm run test:cov    # With coverage
```

---

## Seed Credentials

| Name | Email | Role | Password |
|------|-------|------|----------|
| Alice Admin | admin@taskflow.com | ADMIN | Password123! |
| Bob Builder | bob@taskflow.com | MEMBER | Password123! |
| Carol Coder | carol@taskflow.com | MEMBER | Password123! |

---

## Documentation

All project documentation is in the [`docs/`](./docs) directory:

| Directory | Contents |
|-----------|----------|
| `docs/foundation/` | Constitution, glossary, principles, threat model |
| `docs/architecture/` | Architecture overview, ADRs |
| `docs/modules/` | Auth, Users, Projects, Tasks module specs |
| `docs/implementation/` | Backend/frontend structure, database schema, env vars, error codes, seed data |
| `docs/testing/` | Test plan |

---

## Project Structure

```
taskflow/
├── backend/          # NestJS API (Prisma + PostgreSQL)
├── frontend/         # Next.js App Router (React + Zustand + React Query)
├── docs/             # Documentation
├── .env.example      # Environment variable template
└── README.md         # This file
```

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | Public | Register a new user |
| POST | /api/auth/login | Public | Login |
| POST | /api/auth/refresh | Public | Refresh access token |
| POST | /api/auth/logout | Required | Logout |
| GET | /api/auth/me | Required | Current user profile |
| GET | /api/projects | Required | List my projects |
| POST | /api/projects | Required | Create a project |
| GET | /api/projects/:id | Required | Get project detail |
| PATCH | /api/projects/:id | Required | Update project |
| DELETE | /api/projects/:id | Admin | Delete project |
| POST | /api/projects/:id/members | Admin | Add member |
| DELETE | /api/projects/:id/members/:userId | Admin | Remove member |
| GET | /api/projects/:pid/tasks | Required | List project tasks |
| POST | /api/projects/:pid/tasks | Required | Create task |
| GET | /api/tasks/:id | Required | Get task detail |
| PATCH | /api/tasks/:id | Required | Update task |
| DELETE | /api/tasks/:id | Required | Delete task |

Full API documentation with request/response shapes is in `docs/modules/`.
