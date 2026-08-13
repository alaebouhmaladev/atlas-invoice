# Atlas Bites Facturation 🇲🇦

Internal invoicing & CRM application for **Atlas Bites SARL** (Moroccan Catering Services).

Planned Subdomain: `facturation.ourdomain.com`

---

## 📌 Project Overview

**Atlas Bites Facturation** is a modern full-stack web application designed for managing catering clients, quotes (*devis*), invoices (*factures*), and financial reporting.

### Module Status:
- **Phase 1: Foundation & Authentication**: Nuxt 3, Vue 3, TypeScript (Strict Mode), Tailwind CSS, PostgreSQL 16, Prisma ORM, Argon2, Cookie sessions (`SameSite=Lax`, `HttpOnly`), Docker Compose, Vitest.
- **Phase 2: Client Management Module**: Complete management of Moroccan corporate (`COMPANY`) and individual (`INDIVIDUAL`) catering clients, supporting Moroccan legal & tax identifiers (ICE 15 digits, IF, RC, CNSS, Patente), duplicate detection, soft archiving, role-based authorization, and French UI.
- **Phase 3: Devis Management Module**: End-to-end devis management with sequential numbering (`DEV-YYYY-0001`), frozen client snapshots, `decimal.js` exact financial calculations, line & global MAD/percentage discounts, TVA rate breakdowns (0%, 7%, 10%, 14%, 20%), controlled status transitions (`DRAFT → SENT → ACCEPTED / REJECTED`), A4 PDF generation via `PDFKit`, duplicate devis, soft archiving, role authorization, and French UI.

---

## 👥 Devis Management Permission Matrix

| Action | Super Admin | Accountant (`ACCOUNTANT`) | Commercial (`COMMERCIAL`) |
| :--- | :---: | :---: | :---: |
| **View & Search Devis** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Create Devis** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Update Draft Devis** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Duplicate Devis** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Generate & Download PDF** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Mark as Sent** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Mark as Accepted / Refused** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Archive / Restore Devis** | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Permanently Delete Draft** | ✅ Allowed | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |
| **Convert to Facture** | ⏳ Phase 4 | ⏳ Phase 4 | ❌ Forbidden |

---

## 🔄 Devis Status Workflow Transitions

```text
DRAFT → SENT
DRAFT → ACCEPTED
DRAFT → REJECTED
SENT → ACCEPTED
SENT → REJECTED
SENT → EXPIRED
REJECTED → DRAFT (Reopen as Draft)
```

- Invalid status transitions return **HTTP 409 Conflict**.
- Status timestamps (`sentAt`, `acceptedAt`, `rejectedAt`, `expiredAt`) are recorded automatically.

---

## 🔢 Document Numbering & Financial Calculations

### Numbering Format
- **Format**: `DEV-YYYY-0001` (e.g., `DEV-2026-0001`)
- **Sequence Generator**: Concurrency-safe atomic transaction using `DocumentSequence` table with annual calendar year reset.

### Financial Rules
- **Precision**: Exact `decimal.js` / Prisma `Decimal` arithmetic rounded to 2 decimal places (`ROUND_HALF_UP`).
- **Currency**: Displayed in Moroccan Dirham (`MAD`, e.g., `1 250,00 MAD`).
- **Discounts**: Supports line-item discount rates (%) and global quote discounts (percentage or fixed MAD amount).
- **TVA Rates**: 0%, 7%, 10%, 14%, 20%.

---

## 📄 Client Snapshot Mechanism

To prevent future client updates from silently altering historical devis:
- At creation/update time, a frozen client snapshot (`clientSnapshot` JSON) is stored on the `Quote` record.
- The A4 PDF generator uses `clientSnapshot` rather than the active client profile.

---

## 🔌 Devis Module API Endpoints

| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/quotes` | Paginated search, filtered & sorted devis list | All Roles |
| `POST` | `/api/quotes` | Create new devis record (with client snapshot & sequence) | All Roles |
| `GET` | `/api/quotes/:id` | Fetch devis detail profile with service items | All Roles |
| `PATCH` | `/api/quotes/:id` | Update draft devis record | All Roles |
| `POST` | `/api/quotes/:id/duplicate` | Duplicate existing devis into a new DRAFT | All Roles |
| `POST` | `/api/quotes/:id/status` | Transition devis status (`SENT`, `ACCEPTED`, `REJECTED`, `DRAFT`) | All Roles |
| `POST` | `/api/quotes/:id/archive` | Soft archive devis (`isArchived: true`) | Super Admin, Accountant |
| `POST` | `/api/quotes/:id/restore` | Restore archived devis (`isArchived: false`) | Super Admin, Accountant |
| `DELETE` | `/api/quotes/:id` | Permanently delete draft devis record | Super Admin Only |
| `GET` | `/api/quotes/:id/pdf` | Stream A4 PDF document (`DEV-2026-0001.pdf`) | All Roles |

---

## 🐳 Docker Setup

### Start Services (App, Database, Adminer)

```bash
cd atlas-invoice
docker compose up -d
```

### Apply Migrations

```bash
docker compose exec app pnpm prisma:migrate
```

Applied migrations:
1. `20260813000131_init`
2. `20260813003111_add_client_management`
3. `20260813005738_add_quote_management`

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
| `pnpm test` | Run complete Vitest test suite (48 tests) |
