# Atlas Bites Facturation 🇲🇦

Internal invoicing & CRM application for **Atlas Bites SARL** (Moroccan Catering Services).

Planned Subdomain: `facturation.ourdomain.com`

---

## 📋 Comprehensive Audit & Status Report

### Executive Summary
All core modules through **Phase 5** and the **PDF Engine Design & Layout Refinement** are **100% completed, tested, and verified**:
- **Phase 1: Foundation & Authentication**: Nuxt 3, Vue 3, TypeScript (Strict Mode), Tailwind CSS, PostgreSQL 16, Prisma ORM, Argon2 password hashing, Cookie session management (`HttpOnly`, `SameSite=Lax`), Docker Compose setup, Vitest integration.
- **Phase 2: Client Management Module**: Moroccan corporate (`COMPANY`) and individual (`INDIVIDUAL`) catering clients, supporting Moroccan legal & tax identifiers (ICE 15 digits, IF, RC, CNSS, Patente), duplicate detection, soft archiving, role-based authorization, and French UI.
- **Phase 3: Devis Management Module**: End-to-end devis management with sequential numbering (`DEV-YYYY-0001`), frozen client snapshots, `decimal.js` exact financial calculations, line & global MAD/percentage discounts, TVA rate breakdowns (0%, 7%, 10%, 14%, 20%), controlled status transitions (`DRAFT → SENT → ACCEPTED / REJECTED`), PDFKit rendering, quote duplication, soft archiving, role authorization, and French UI.
- **Phase 4: Factures & Payments Module**: Facture creation & quote conversion (`DEV` → `FAC-YYYY-0001`), partial & full payment recording (`UNPAID`, `PARTIALLY_PAID`, `PAID`), payment reversal audit trail, credit notes / cancellations, automatic payment status synchronization, `FACTURE ACQUITTÉE` status badges, and locking of finalized invoices.
- **Phase 5: Company Settings & Asset Management**: Company profile & parameters (`Paramètres`), legal identifiers (ICE, IF, RC, CNSS, Patente), bank RIB/IBAN details, logo, signature, and stamp asset uploads with SHA-256 deduplication and mime/size validation.
- **PDF Engine & Layout Refinement**: Shared PDFKit engine matching authoritative reference design (`#FAF9F5` canvas, outer dark border, top logo & header metadata grid, two-column ÉMETTEUR / DESTINATAIRE alignment, side-by-side RÈGLEMENT & Totals alignment, vector checkmark circle `FACTURE ACQUITTÉE` box, centered bold legal footer with address line and no page numbers, strict 12pt font minimum, guaranteed single-page layout math).

- **Phase 6: Production Dashboard, Backups, Deployment & Operations**: Real-time server-aggregated Super Admin Production Dashboard with date filters (`30d`, `7d`, `today`, `this_month`, `last_month`, `this_year`, `custom`), financial KPIs (Chiffre d’affaires facturé, Montant encaissé, Montant restant à encaisser, Factures en retard, Taux de transformation, Valeur devis acceptés), operational cards, visual distribution charts, Action-Required alerts, and Super Admin System Health card. Automated PostgreSQL `.dump` & Company Assets `.tar.gz` CLI backup tool (`scripts/backup.ts`) with SHA-256 `manifest.json` verification and retention policy. Verified CLI restoration tool (`scripts/restore.ts`) with test-database mode (`--test-restore-db`) and live safeguards (`--confirm-live-restore`). Production Docker Compose stack (`compose.production.yml`) with non-root app runner container, isolated database network, persistent named volumes (`postgres_prod_data`, `atlas_prod_uploads`, `atlas_prod_backups`), and zero public DB ports. Production Nginx reverse proxy template (`nginx/atlas-invoice.conf`) with security headers, body upload limits, blocked `.env` & `.dump` paths, and TLS setup. Process liveness (`/api/health/live`) and readiness (`/api/health/ready`) endpoints. Zero-data-loss deployment workflow script (`scripts/deploy.sh`), automated post-deployment smoke test (`scripts/smoke_test.ts`), and comprehensive operations documentation (`docs/`).

---

## 🔒 Permission Matrix (All Modules)

| Feature / Action | Super Admin | Accountant (`ACCOUNTANT`) | Commercial (`COMMERCIAL`) |
| :--- | :---: | :---: | :---: |
| **Auth & Profile Management** | ✅ All | ✅ Profile & Password | ✅ Profile & Password |
| **User & Team Management** | ✅ Create/Update/Delete | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |
| **Client Management** | ✅ Create/Update/Archive | ✅ Create/Update/Archive | ✅ Create/Update (No Archive) |
| **Devis Management** | ✅ Create/Update/Status | ✅ Create/Update/Status | ✅ Create/Update/Status |
| **Devis Archive / Delete** | ✅ Archive & Delete | ✅ Archive Only | ❌ Forbidden (HTTP 403) |
| **Quote → Facture Conversion** | ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Facture Management** | ✅ Create/Update/Status | ✅ Create/Update/Status | ✅ View Only |
| **Payment Recording & Reversal**| ✅ Allowed | ✅ Allowed | ❌ Forbidden (HTTP 403) |
| **Facture Archive / Cancel** | ✅ Archive & Cancel | ✅ Archive & Cancel | ❌ Forbidden (HTTP 403) |
| **Company Settings & Assets** | ✅ Update Profile/Upload Assets | 👁️ View Only | 👁️ View Only |
| **Production Dashboard & KPIs**| ✅ Full Dashboard & Infra Health | ✅ Financials & Operations | ✅ Sales & Devis Metrics |
| **Backup & Restore Operations**| ✅ CLI & Status Endpoint | ❌ Forbidden (HTTP 403) | ❌ Forbidden (HTTP 403) |

---

## 🔄 Document Workflow State Machines

### 1. Devis Status Transitions
```text
DRAFT ──► SENT ──► ACCEPTED
  │         │
  ▼         ▼
REJECTED ◄──┴──────► EXPIRED
  │
  ▼
DRAFT (Reopened)
```

### 2. Facture Lifecycle & Payment Status Transitions
```text
DRAFT ──► FINALIZED ──► CANCELLED (Credit Note)
            │
            ▼
        UNPAID ──► PARTIALLY_PAID ──► PAID (FACTURE ACQUITTÉE)
```

---

## 🔢 Document Numbering & Financial Calculations

### Numbering Format
- **Devis Format**: `DEV-YYYY-0001` (e.g., `DEV-2026-0001`)
- **Facture Format**: `FAC-YYYY-0001` (e.g., `FAC-2026-0001`)
- **Sequence Generator**: Concurrency-safe atomic transaction using `DocumentSequence` table with annual calendar year reset.

### Financial Rules
- **Precision**: Exact `decimal.js` / Prisma `Decimal` arithmetic rounded to 2 decimal places (`ROUND_HALF_UP`).
- **Currency**: Displayed in Moroccan Dirham (`MAD`, e.g., `1 250,00 MAD`).
- **Discounts**: Supports line-item discount rates (%) and global quote/invoice discounts (percentage or fixed MAD amount).
- **TVA Rates**: 0%, 7%, 10%, 14%, 20%.

---

## 📄 Client & Company Snapshot Mechanism

To prevent future client or company parameter updates from silently altering historical devis and invoices:
- At creation/update time, a frozen client snapshot (`clientSnapshot` JSON) and company snapshot (`companySnapshot` JSON) are stored on the `Quote` or `Invoice` record.
- The A4 PDF generator uses `companySnapshot` or dynamically resolves missing parameters from PostgreSQL live `CompanySettings` (`singletonKey = 'DEFAULT'`) when rendering PDFs.

---

## 🔌 Complete API Endpoint Registry

### Auth & User Module (`/api/auth`)
| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & issue session cookie | Public |
| `POST` | `/api/auth/logout` | Terminate active session | Authenticated |
| `GET` | `/api/auth/me` | Fetch active user profile | Authenticated |

### Dashboard & Health Module (`/api/dashboard`, `/api/health`)
| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Server-aggregated KPIs, trends & actions | Authenticated |
| `GET` | `/api/health/live` | Process liveness check (200 OK) | Public |
| `GET` | `/api/health/ready` | Readiness check (Postgres & storage) | Public |
| `GET` | `/api/admin/backup/status` | Backup health status | Super Admin Only |

### Client Module (`/api/clients`)
| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clients` | Paginated search & list | All Roles |
| `POST` | `/api/clients` | Create new client | All Roles |
| `GET` | `/api/clients/:id` | Client profile detail | All Roles |
| `PATCH` | `/api/clients` | Update client profile | All Roles |
| `POST` | `/api/clients/:id/archive` | Soft archive client | Super Admin, Accountant |
| `POST` | `/api/clients/:id/restore` | Restore archived client | Super Admin, Accountant |

### Devis Module (`/api/quotes`)
| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/quotes` | Paginated search & filter devis | All Roles |
| `POST` | `/api/quotes` | Create devis record | All Roles |
| `GET` | `/api/quotes/:id` | Devis detail view | All Roles |
| `PATCH` | `/api/quotes` | Update draft devis | All Roles |
| `POST` | `/api/quotes/:id/duplicate` | Duplicate devis into new DRAFT | All Roles |
| `POST` | `/api/quotes/:id/status` | Change devis status | All Roles |
| `POST` | `/api/quotes/:id/convert-to-invoice` | Convert accepted quote to invoice | Super Admin, Accountant |
| `POST` | `/api/quotes/:id/archive` | Archive devis | Super Admin, Accountant |
| `POST` | `/api/quotes/:id/restore` | Restore devis | Super Admin, Accountant |
| `DELETE` | `/api/quotes` | Delete draft devis | Super Admin Only |
| `GET` | `/api/quotes/:id/pdf` | Stream A4 PDF | All Roles |

### Facture Module (`/api/invoices`)
| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/invoices` | Paginated search & filter invoices | All Roles |
| `POST` | `/api/invoices` | Create draft invoice | Super Admin, Accountant |
| `GET` | `/api/invoices/:id` | Invoice detail view | All Roles |
| `PATCH` | `/api/invoices` | Update draft invoice | Super Admin, Accountant |
| `POST` | `/api/invoices/:id/finalize` | Finalize invoice & lock numbers | Super Admin, Accountant |
| `POST` | `/api/invoices/:id/cancel` | Cancel invoice (Credit note) | Super Admin, Accountant |
| `POST` | `/api/invoices/:id` | Record payment against invoice | Super Admin, Accountant |
| `POST` | `/api/invoices/:id/payments/:paymentId/reverse` | Reverse recorded payment | Super Admin, Accountant |
| `POST` | `/api/invoices/:id/archive` | Archive invoice | Super Admin, Accountant |
| `POST` | `/api/invoices/:id/restore` | Restore invoice | Super Admin, Accountant |
| `DELETE` | `/api/invoices` | Delete draft invoice | Super Admin Only |
| `GET` | `/api/invoices/:id/pdf` | Stream A4 PDF | All Roles |

### Company Settings & Asset Module (`/api/settings`)
| Method | Endpoint | Description | Role Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings/company` | Fetch company profile & settings | All Roles |
| `PATCH` | `/api/settings/company` | Update company settings | Super Admin Only |
| `POST` | `/api/settings/assets/logo` | Upload company logo asset | Super Admin Only |
| `POST` | `/api/settings/assets/signature` | Upload signature asset | Super Admin Only |
| `POST` | `/api/settings/assets/stamp` | Upload stamp asset | Super Admin Only |
| `GET` | `/api/settings/assets/:id` | Stream company asset file | All Roles |
| `DELETE` | `/api/settings/assets/:id` | Delete asset | Super Admin Only |

---

## 🐳 Docker Setup

### Start Services (Development)
```bash
cd atlas-invoice
docker compose up -d
```

### Production Deployment
```bash
cp .env.production.example .env.production
./scripts/deploy.sh
```

Applied migrations:
1. `20260813000131_init`
2. `20260813003111_add_client_management`
3. `20260813005738_add_quote_management`
4. `20260814120000_add_invoice_management`
5. `20260814130000_add_company_settings`

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
| `pnpm backup` | Execute automated PostgreSQL & asset backup script |
| `pnpm restore` | Execute verified restoration CLI tool |
| `pnpm test` | Run complete Vitest test suite (86 tests passing) |

---

## 🧪 Test Suite Summary (18 Test Files, 86/86 Passing)

1. `tests/auth.test.ts` (12 tests) — Argon2 hashing, login/logout, cookie session management, user management.
2. `tests/client.validation.test.ts` (7 tests) — Moroccan ICE 15-digit validation, corporate vs individual client validation.
3. `tests/client.api.test.ts` (6 tests) — CRUD API, search, archive/restore authorization.
4. `tests/quote.calculation.test.ts` (10 tests) — `decimal.js` exact financial calculations, line & global discounts, TVA rates.
5. `tests/quote.validation.test.ts` (4 tests) — Quote validation schema & item constraints.
6. `tests/quote.sequence.test.ts` (2 tests) — Atomic sequential generator (`DEV-YYYY-0001`).
7. `tests/quote.api.test.ts` (6 tests) — Quote status workflow, duplication, permissions.
8. `tests/quote.pdf.test.ts` (3 tests) — PDFKit quote generation, single-page math, multi-page overflow.
9. `tests/invoice.calculation.test.ts` (3 tests) — Invoice financial formulas, partial & full payment math.
10. `tests/invoice.validation.test.ts` (5 tests) — Invoice payload schema validation.
11. `tests/invoice.api.test.ts` (5 tests) — Invoice lifecycle, quote conversion, payment recording & reversal.
12. `tests/invoice.pdf.test.ts` (3 tests) — PDFKit invoice rendering, `FACTURE ACQUITTÉE` status badges.
13. `tests/companySettings.test.ts` (3 tests) — Singleton settings update, user data preservation safeguards.
14. `tests/asset.test.ts` (5 tests) — Logo, signature, stamp asset upload, SHA-256 deduplication, state preservation.
15. `tests/userManagement.test.ts` (7 tests) — Super admin user management & role restriction tests.
16. `tests/dashboard.test.ts` (3 tests) — Dashboard aggregation formulas, date range filtering, financial KPI accuracy, role authorization.
17. `tests/health.test.ts` (1 test) — Database & storage readiness query verification.
18. `tests/backup.test.ts` (1 test) — Backup CLI execution, `manifest.json` generation, SHA-256 checksum integrity.

---

## 📝 Guidelines for Appending Future Phases (Phase 7+)

When completing subsequent phases:
1. **Append Phase Audit**: Add a summary of the completed features, database schema additions, and new API routes to the **Executive Summary** and **API Endpoint Registry** sections in `README.md`.
2. **Permission Matrix Update**: Add any new permission capabilities to the **Permission Matrix**.
3. **Quality Gates**: Ensure that:
   - `pnpm test` passes 100% (86+ tests).
   - `pnpm typecheck` returns 0 errors.
   - `pnpm build` compiles cleanly.
4. **Data Protection**: Never delete or un-link live user database records or asset IDs.

