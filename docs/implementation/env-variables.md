# Environment Variables

## Backend (`backend/.env`)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `NODE_ENV` | string | `development` | Yes | Runtime environment: `development`, `test`, `production` |
| `PORT` | number | `3001` | Yes | Port the NestJS server listens on |
| `DATABASE_URL` | string | — | Yes | PostgreSQL connection string: `postgresql://user:pass@host:5432/dbname?schema=public` |
| `REDIS_URL` | string | `redis://localhost:6379` | Yes | Redis connection string for token blacklist cache: `redis://host:port` |
| `JWT_SECRET` | string | — | Yes | Secret key for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | string | — | Yes | Secret key for signing refresh tokens (min 32 chars, different from JWT_SECRET) |
| `JWT_EXPIRES_IN` | string | `15m` | Yes | Access token expiration duration (e.g., `15m`, `1h`, `7d`) |
| `JWT_REFRESH_EXPIRES_IN` | string | `7d` | Yes | Refresh token expiration duration |
| `BCRYPT_SALT_ROUNDS` | number | `12` | Yes | Number of bcrypt salt rounds (≥ 12) |
| `CORS_ORIGIN` | string | `http://localhost:3000` | Yes | Allowed CORS origin for frontend |
| `THROTTLE_TTL` | number | `60000` | Yes | Rate limiting time window in milliseconds (60s) |
| `THROTTLE_LIMIT` | number | `10` | Yes | Max requests per TTL for auth endpoints |
| `LOG_LEVEL` | string | `log` | No | NestJS Logger log level: `log`, `warn`, `error`, `debug`, `verbose` |

## Frontend (`frontend/.env.local`)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | string | `http://localhost:3001/api` | Yes | Base URL for the backend API |
| `NEXT_PUBLIC_APP_URL` | string | `http://localhost:3000` | Yes | Public URL of the frontend app |

## Example `.env` File

```env
# ─── Server ─────────────────────────────────────────────
NODE_ENV=development
PORT=3001

# ─── Database ───────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow?schema=public

# ─── Redis ──────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── JWT ────────────────────────────────────────────────
JWT_SECRET=your-super-secret-key-min-32-chars-long
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Auth ───────────────────────────────────────────────
BCRYPT_SALT_ROUNDS=12

# ─── CORS ───────────────────────────────────────────────
CORS_ORIGIN=http://localhost:3000

# ─── Rate Limiting ──────────────────────────────────────
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# ─── Logging ────────────────────────────────────────────
LOG_LEVEL=log
```

## Security Notes

- `JWT_SECRET` and `JWT_REFRESH_SECRET` MUST be different strings
- Secrets should be generated with `openssl rand -hex 32` (produces 64 hex chars = 256 bits)
- Never commit `.env` files to version control — use `.env.example` as a template
- In production, use a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault) rather than `.env` files
