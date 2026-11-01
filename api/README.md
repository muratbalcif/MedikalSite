# ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ API

NestJS backend for the Anamur Acil Medikal web sitesi ve uygulaması. Android, web ve yönetim paneli istemcilerinin ortak API’si.

## Prerequisites

- Node.js 22+
- npm 10+
- Docker & Docker Compose

## Installation

From the monorepo root (recommended):

```bash
cp api/.env.example api/.env
# Fill JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before enabling auth
npm install
npm run api:docker:up
npm run api:prisma:generate
npm run api:prisma:migrate:dev
```

Or from this directory:

```bash
cp .env.example .env
# Fill JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before enabling auth
npm install
npm run docker:up
npm run prisma:generate
npm run prisma:migrate:dev
```

## Environment configuration

Copy `.env.example` to `.env`. Required variables:

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | API port (default `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access token secret (required length ≥ 32 in production) |
| `JWT_REFRESH_SECRET` | Refresh token secret (required length ≥ 32 in production) |
| `REDIS_URL` | Redis connection string (wired for future use) |

Environment variables are validated at application startup.

## Docker commands

```bash
npm run docker:up      # Start PostgreSQL (5432) and Redis (6379)
npm run docker:down    # Stop containers
npm run docker:logs    # Follow container logs
```

Named volumes persist PostgreSQL and Redis data.

If host port `5432` is already in use, stop the conflicting service before `docker:up`, or temporarily change the published port mapping and matching `DATABASE_URL`.

## Prisma commands

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
```

## Development commands

```bash
npm run start:dev      # Watch mode
npm run start          # Single start
npm run build          # Compile TypeScript
npm run start:prod     # Run compiled output
npm run lint
npm run format
```

## Test commands

```bash
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests (requires Docker services)
npm run test:cov       # Coverage
```

## Swagger

Available in non-production environments:

http://localhost:3000/api/docs

JWT bearer auth is prepared for future authentication endpoints (`access-token`).

## Health endpoint

```http
GET /api/v1/health
```

```json
{ "status": "ok" }
```

## Auth endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Refresh token body |
| POST | `/api/v1/auth/logout` | Refresh token body |
| GET | `/api/v1/auth/me` | Bearer access token |

Passwords are hashed with Argon2. Refresh tokens are stored as SHA-256 hashes only and rotated on use.

## Architecture notes

- Global API prefix: `/api/v1`
- Modular NestJS layout under `src/modules/`
- Global validation pipe, exception filter, and request logging
- Prisma `User` model is minimal and reserved for upcoming auth
- Prices and business logic will live only on the server in later milestones
