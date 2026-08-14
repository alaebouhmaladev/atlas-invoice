# Rollback Guide — Atlas Bites Facturation

This document outlines emergency procedures for rolling back application deployments.

---

## ⏪ Application Rollback (Code Issue)

Used when new code contains a bug but database schema remains compatible.

```bash
# 1. Revert Git repository to previous stable commit
git checkout HEAD~1

# 2. Restart production containers without modifying database volumes
docker compose -f compose.production.yml up -d --build

# 3. Verify readiness
curl -f http://localhost:3000/api/health/ready
```

---

## 🛑 Data Restoration Rollback (Data Corruption Issue)

Used when data corruption occurs and an approved backup set must be restored.

```bash
# 1. Stop write traffic
docker compose -f compose.production.yml stop app

# 2. Run forensic backup of current state
npx tsx scripts/backup.ts --output-dir=/tmp/forensic-backup

# 3. Restore verified backup set into live target
npx tsx scripts/restore.ts --confirm-live-restore

# 4. Restart application
docker compose -f compose.production.yml up -d app
```
