# Atlas Bites Facturation 🇲🇦

Internal invoicing & CRM application for **Atlas Bites SARL** (Moroccan Catering Services).

Planned Subdomain: `facturation.ourdomain.com`

---

## 📌 Project Overview

**Atlas Bites Facturation** is a modern full-stack web application designed for managing catering clients, quotes (*devis*), invoices (*factures*), and financial reporting.

This foundation phase establishes:
- **Core Technology Stack**: Nuxt 3, Vue 3 Composition API, TypeScript (Strict Mode), Tailwind CSS, Nitro Server API routes, PostgreSQL 16, Prisma ORM, Zod, Argon2, Docker & Docker Compose.
- **Authentication & Security**: Cookie-based HttpOnly sessions (`SameSite=Lax`), SHA-256 token hashing in DB, Argon2 password hashing, session rotation, in-memory rate limiting, security headers, and audit logging.
- **Role-Based Authorization**: System roles (`SUPER_ADMIN`, `ACCOUNTANT`, `COMMERCIAL`) with server-side authorization enforcement.
- **Initial Interface**: Modern dark-themed `/login` page with password visibility toggle, and a protected `/` welcome dashboard confirming foundational status.

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

## 🚀 Environment Setup & Local Installation

> [!CAUTION]
> **NEVER** commit the `.env` file to version control. Ensure `.env` is listed in `.gitignore`.

### 1. Clone & Copy Environment Configuration

```bash
cd atlas-invoice
cp .env.example .env
```

### 2. Generate a Secure Session Secret

Generate a 64-character hex secret for `SESSION_SECRET` in `.env`:

```bash
# Option A: OpenSSL
openssl rand -hex 32

# Option B: Node.js CLI
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update your `.env` with the generated secret and set initial Super Admin credentials (`SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`).

---

## 🐳 Docker Setup

### Start Services (App, Database, Adminer)

```bash
docker compose up -d --build
```

Docker Compose services:
- **`app`**: Nuxt 3 application running on `http://localhost:3000` (with hot reload).
- **`db`**: PostgreSQL 16 database running on port `5432` with healthcheck (`pg_isready`).
- **`adminer`**: Database UI accessible at `http://localhost:8080`.

### Stop Services

```bash
docker compose down
```

---

## 🗄️ Database Migrations & Initial Seed

### Run Database Migrations

Inside Docker:
```bash
docker compose exec app pnpm prisma:migrate
```

Or locally (with Postgres running):
```bash
pnpm prisma:migrate
```

### Seed Initial Super Admin

> [!IMPORTANT]
> The seed script reads `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD` from `.env`.
> The password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters.

Inside Docker:
```bash
docker compose exec app pnpm db:seed
```

Or locally:
```bash
pnpm db:seed
```

---

## 🔑 Login & Verification

1. Access application at [http://localhost:3000](http://localhost:3000).
2. Enter the Super Admin credentials defined in your `.env`.
3. Upon successful login, you will be redirected to the protected `/` dashboard confirming system status.
4. Database administration interface available at [http://localhost:8080](http://localhost:8080) (System: PostgreSQL, Server: `db`, Username: `atlas_user`, Database: `atlas_bites_facturation`).

---

## 🧪 Quality & Developer Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start Nuxt development server with hot reload |
| `pnpm build` | Build production bundle |
| `pnpm start` | Run production bundle from `.output/server/index.mjs` |
| `pnpm lint` | Run ESLint check across `.ts` and `.vue` files |
| `pnpm lint:fix` | Automatically fix linting issues |
| `pnpm typecheck` | Execute `vue-tsc` strict TypeScript type checks |
| `pnpm format` | Format code using Prettier |
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate` | Run Prisma database migrations |
| `pnpm db:seed` | Seed initial Super Admin account |
| `pnpm test` | Run Vitest unit & security test suite |

---

## 📦 Production Build

To build and run in production mode:

```bash
pnpm build
pnpm start
```

Or target the production Docker image stage:
```bash
docker build --target runner -t atlas-invoice:latest .
```

---

## 💾 Database Backup & Restore

### Backup Database

```bash
docker exec -t atlas_db pg_dump -U atlas_user atlas_bites_facturation > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
cat backup_file.sql | docker exec -i atlas_db psql -U atlas_user -d atlas_bites_facturation
```

---

## 🔍 Common Troubleshooting

- **Nuxt Hot Reload inside Docker**: Configured with `WATCHPACK_POLLING=true` and `CHOKIDAR_USEPOLLING=true` in `compose.yml` for macOS/Linux compatibility.
- **Port Conflict (5432 / 3000 / 8080)**: Stop local PostgreSQL (`brew services stop postgresql`) or change port mappings in `compose.yml`.
- **Database Reset**: `pnpm prisma migrate reset` or `docker compose down -v`.
