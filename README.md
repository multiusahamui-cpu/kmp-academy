

# KMP - ADNG Academy

Platform pembelajaran berbasis React (frontend) dan Express (backend) untuk skenario LMS, manajemen kursus, pembelajaran, review, wallet, dan administrasi.

## Technology Stack

Frontend:

- React 18
- Vite 5
- TypeScript
- React Router
- Axios
- Recharts

Backend:

- Node.js
- Express 4
- TypeScript
- Drizzle ORM
- PostgreSQL
- JWT Authentication

Tooling:

- tsx (dev runtime untuk backend)
- Tailwind CSS

## Struktur Proyek Saat Ini

- Root: frontend app (Vite React)
- `backend-academy`: backend API (Express + Drizzle)
- `docs`: dokumentasi arsitektur dan roadmap

## Quick Start

Prerequisites:

- Node.js 18+
- PostgreSQL

Frontend:

1. Install dependency di root:
   `npm install`
2. Jalankan frontend:
   `npm run dev`

Backend:

1. Masuk ke folder backend:
   `cd backend-academy`
2. Install dependency backend:
   `npm install`
3. Siapkan environment backend (`.env`) minimal:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT` (opsional)
4. Jalankan backend:
   `npm run dev`

## Frontend Environment

Frontend membaca base URL API dari:

- `VITE_API_URL` (opsional, default: `http://localhost:3000/api`)

## Dokumentasi Lanjutan

- Arsitektur workspace monorepo: [docs/monorepo-workspace-architecture.md](docs/monorepo-workspace-architecture.md)
- TODO production readiness: [docs/production-readiness-todos.md](docs/production-readiness-todos.md)
