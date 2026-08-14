# Backup and Restoration Guide — Atlas Bites Facturation

This guide details the automated backup architecture, manifest verification, retention policy, and tested restoration procedures for **Atlas Bites Facturation**.

---

## 💾 Backup Architecture

Backups are executed via `scripts/backup.ts`. Each execution creates a complete snapshot containing:
1. **PostgreSQL Database Dump**: `atlas-bites-db-YYYYMMDD-HHMMSS.dump` (custom format).
2. **User Upload Assets Archive**: `atlas-bites-assets-YYYYMMDD-HHMMSS.tar.gz` (contains logos, signatures, stamps).
3. **SHA-256 Manifest**: `manifest.json` containing cryptographic checksums, sizes, and timestamps.

### Running a Manual Backup
```bash
npx tsx scripts/backup.ts
```

### Dry-Run Mode
```bash
npx tsx scripts/backup.ts --dry-run
```

---

## 🔄 Restoration Safeguards & Procedure

Restoration is executed via `scripts/restore.ts`.

### 1. Test Restore Mode (Safe Test Database)
Restore into an isolated test database without touching production:
```bash
npx tsx scripts/restore.ts --test-restore-db=atlas_test_restore
```

### 2. Live Target Restoration
Requires explicit confirmation flag:
```bash
npx tsx scripts/restore.ts --confirm-live-restore
```

### Restoration Verification Checklist
After restoration, verify:
- [x] Super Admin login works.
- [x] Catering clients list loads.
- [x] Devis and Factures load.
- [x] Confirmed payment records match financial balances.
- [x] PDF previews render with historical logos.
- [x] Single-page PDF math and 12pt minimum font rule remain preserved.
