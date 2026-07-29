# Docker Compose Setup

This document describes the expected Docker Compose configuration for local development. The `docker-compose.yml` file will be created during implementation.

## Required Services

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `postgres:15-alpine` | Primary database |
| `redis` | `redis:7-alpine` | Token blacklist cache |
| `backend` | Build from `./backend` | NestJS API server |
| `frontend` | Build from `./frontend` | Next.js frontend |

## Service Configuration

### PostgreSQL
- **Port:** `5432:5432`
- **Environment:** `POSTGRES_DB=taskflow`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`
- **Volume:** Named volume `pgdata` for data persistence
- **Health check:** `pg_isready -U postgres`

### Redis
- **Port:** `6379:6379`
- **Health check:** `redis-cli ping`

### Backend
- **Port:** `3001:3001`
- **Env file:** `./backend/.env`
- **Depends on:** PostgreSQL and Redis (with `condition: service_healthy`)
- **Build context:** `./backend`

### Frontend
- **Port:** `3000:3000`
- **Environment:** `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- **Depends on:** Backend
- **Build context:** `./frontend`

## Startup Order

1. PostgreSQL starts and becomes healthy
2. Redis starts and becomes healthy
3. Backend starts after both dependencies are healthy
4. Frontend starts after backend

## Usage

```bash
docker compose up --build
```

This starts all four services. The API is available at `http://localhost:3001/api` and the frontend at `http://localhost:3000`.
