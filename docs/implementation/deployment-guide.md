# Deployment Guide

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- Redis >= 7
- PM2 (recommended for process management)

## Option A: Manual Deployment

### 1. Build

```bash
# Backend
cd backend
npm ci
npm run build

# Frontend
cd ../frontend
npm ci
npm run build
```

### 2. Configure Environment

Set the following environment variables on the production server:

| Variable | Production Value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | Production PostgreSQL connection string |
| `REDIS_URL` | Production Redis connection string |
| `JWT_SECRET` | Strong random value (`openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Different strong random value |
| `BCRYPT_SALT_ROUNDS` | `12` |
| `CORS_ORIGIN` | Frontend domain (e.g., `https://app.example.com`) |
| `THROTTLE_TTL` | `60000` |
| `THROTTLE_LIMIT` | `10` |
| `LOG_LEVEL` | `warn` |

### 3. Run Migrations

```bash
cd backend
npx prisma migrate deploy
```

### 4. Start Processes

```bash
# Using PM2 with clustering
pm2 start dist/main.js --name taskflow-api -i max

# Using a process manager for the frontend
cd ../frontend
npm run start
```

## Option B: Docker Compose

Follow the setup in `docs/implementation/docker-compose-setup.md`. For production, override environment variables via a `.env` file or Docker secrets.

## HTTPS / TLS

Configure a reverse proxy (nginx, Caddy, or cloud load balancer) to terminate TLS. The backend only serves HTTP on the configured `PORT`.

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong random values, not defaults
- [ ] `CORS_ORIGIN` set to the frontend domain
- [ ] Swagger UI is disabled (automatic when `NODE_ENV=production`)
- [ ] Database backups are configured (recommended: daily `pg_dump` with 7-day retention)
- [ ] Logs are captured by the deployment platform (stdout) — do not write to files
- [ ] `npm audit` has been run and critical vulnerabilities are resolved
