# ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ — Yönetim Paneli

Next.js admin client for the NestJS API (`/api/v1`).

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- TanStack Query
- Zod + React Hook Form
- Real API only (no fake dashboard data)

## Setup

```bash
# from monorepo root
cp admin/.env.example admin/.env.local
npm install
npm run admin:dev
```

Admin: http://localhost:3001  
API must be running: http://localhost:3000/api/v1

Login requires a user with at least one admin role/permission (see API seed / `ADMIN_EMAIL`).

## Structure

```text
admin/
├── app/                 # routes (login, dashboard, modules)
├── components/          # layout, auth guards, UI
├── hooks/               # useAuth, usePermissions
├── lib/                 # api client, storage, nav, RBAC helpers
├── services/            # API service functions
└── types/               # shared types
```

## Auth & RBAC

- Login: `POST /auth/login`
- Profile: `GET /auth/me` (includes `roles` + `permissions`)
- Token refresh on 401 via `POST /auth/refresh`
- Sidebar and pages are filtered by permission codes
- Non-admin accounts are rejected at login
