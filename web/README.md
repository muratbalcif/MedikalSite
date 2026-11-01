# ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ — Web Sitesi

Next.js storefront consuming the NestJS API (`/api/v1`).

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- TanStack Query
- Zod + React Hook Form
- Playwright E2E
- HttpOnly cookie auth via Next.js BFF routes

## Setup

```bash
cp web/.env.example web/.env.local
npm install
npm run api:start:dev   # :3000
npm run web:dev         # :3002
```

## Scripts

```bash
npm run web:dev
npm run web:build
npm run web:lint
npm run web:test
npm run web:test:e2e
```

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base (`http://localhost:3000/api/v1`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Optional image CDN host |

Never put secrets in `NEXT_PUBLIC_*` variables.

## Auth

Tokens are stored in **HttpOnly cookies** (`fs_access_token`, `fs_refresh_token`) by `/api/auth/*` route handlers. Browser code never reads JWTs from localStorage. Authenticated API calls go through `/api/proxy/*`.

## Deployment

Build `web` with `npm run web:build` and serve on port 3002 (or your platform's port). Ensure `CORS_ORIGINS` on the API includes the public site origin.
