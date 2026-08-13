# Atlas Bites Facturation 🇲🇦

Internal invoicing & CRM application for **Atlas Bites SARL** (Moroccan Catering Services).

Planned Subdomain: `facturation.ourdomain.com`

---

## 📌 Project Overview

**Atlas Bites Facturation** is a modern full-stack web application designed for managing catering clients, quotes (*devis*), invoices (*factures*), and financial reporting.

### Module Status:
- **Phase 1: Foundation & Authentication**: Nuxt 3, Vue 3, TypeScript (Strict Mode), Tailwind CSS, PostgreSQL 16, Prisma ORM, Argon2, Cookie sessions (`SameSite=Lax`, `HttpOnly`), Docker Compose, Vitest.
- **Phase 2: Client Management Module**: Complete management of Moroccan corporate (`COMPANY`) and individual (`INDIVIDUAL`) catering clients, supporting Moroccan legal & tax identifiers (ICE 15 digits, IF, RC, CNSS, Patente), duplicate detection, soft archiving, role-based authorization, and French UI.

---

## 🛠️ Required Technology Stack

- **Node.js**: `v22.x` (LTS)
- **Package Manager**: `pnpm` (`v9.x`+)
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose
- **Framework**: Nuxt 3 (SSR enabled)
- **Styling**: Tailwind CSS
- **ORM**: Prisma ORM

---

## 👥 Client Management Permission Matrix

| Action | Super Admin | Accountant (`ACCOUNTANT`) | Commercial (`COMMERCIAL`) |
| :--- | :---: | :---: | :---: |
| **View & Search Clients** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Create Clients** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Update Clients** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Archive Clients** | ✅ Yes | ✅ Yes | ❌ Forbidden (403) |
| **Restore Clients** | ✅ Yes | ✅ Yes | ❌ Forbidden (403) |
| **Permanently Delete Clients** | ✅ Yes | ❌ Forbidden (403) | ❌ Forbidden (403) |

---

## 🔌 Client Module API Endpoints

| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clients` | Paginated search & filtered client listing | All Roles |
| `POST` | `/api/clients` | Create new client record (with duplicate checks) | All Roles |
| `GET` | `/api/clients/:id` | Fetch client detail profile & audit history | All Roles |
| `PATCH` | `/api/clients/:id` | Update client details | All Roles |
| `POST` | `/api/clients/:id/archive` | Soft archive client (`isArchived: true`) | Super Admin, Accountant |
| `POST` | `/api/clients/:id/restore` | Restore archived client (`isArchived: false`) | Super Admin, Accountant |
| `DELETE` | `/api/clients/:id` | Permanently delete client record | Super Admin Only |

---

## ⚠️ Duplicate Detection Rules

1. **Exact ICE Collision**:
   - If a provided ICE (15 digits) already exists in database, creation/update is **rejected** with HTTP 409 Conflict and a French validation message.
2. **Soft Candidate Warnings**:
   - Matches on exact Email, Phone, or Display Name return HTTP 200 with `{ duplicateWarning: true, potentialDuplicates: [...] }`.
   - Users can review matching candidates in a modal dialog and confirm creation by passing `confirmDuplicate: true`.

---

## 🐳 Docker Setup

### Start Services (App, Database, Adminer)

```bash
cd atlas-invoice
docker compose up -d
```

Docker Compose services:
- **`app`**: Nuxt 3 application running on `http://localhost:3000` (with hot reload).
- **`db`**: PostgreSQL 16 database running on container port `5432` (host port `5436`).
- **`adminer`**: Database UI accessible at `http://localhost:8080`.

---

## 🗄️ Database Migrations & Initial Seed

### Run Database Migrations

Inside Docker:
```bash
docker compose exec app pnpm prisma:migrate
```

Or locally:
```bash
pnpm prisma:migrate
```

Applied migrations:
1. `20260813000131_init`
2. `20260813003111_add_client_management`

### Seed Initial Super Admin

```bash
docker compose exec app pnpm db:seed
```

---

## 🔑 Login & Credentials

1. Access application at [http://localhost:3000/login](http://localhost:3000/login).
2. Enter Super Admin credentials:
   - **Email**: `admin@atlasbites.ma`
   - **Password**: `AtlasAdmin2026!Secret`
3. Access Client Directory at [http://localhost:3000/clients](http://localhost:3000/clients).

---

## 🧪 Quality & Developer Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start Nuxt development server with hot reload |
| `pnpm build` | Build production bundle |
| `pnpm start` | Run production bundle from `.output/server/index.mjs` |
| `pnpm lint` | Run ESLint check across `.ts` and `.vue` files |
| `pnpm typecheck` | Execute `vue-tsc` strict TypeScript type checks |
| `pnpm format` | Format code using Prettier |
| `pnpm prisma:migrate` | Run Prisma database migrations |
| `pnpm db:seed` | Seed initial Super Admin account |
| `pnpm test` | Run complete Vitest test suite (25 tests) |
