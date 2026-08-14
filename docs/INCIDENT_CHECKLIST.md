# Incident Checklist — Atlas Bites Facturation

Operational response guide for production incidents.

---

## 🚨 Incident Scenarios & Action Items

### 1. Application Unavailable (HTTP 502 / 503)
- Check container status: `docker compose -f compose.production.yml ps`
- Inspect application logs: `docker compose -f compose.production.yml logs --tail=100 app`
- Test liveness endpoint: `curl -v http://localhost:3000/api/health/live`
- Restart container: `docker compose -f compose.production.yml restart app`

### 2. Database Connection Error
- Test readiness endpoint: `curl -v http://localhost:3000/api/health/ready`
- Check Postgres container logs: `docker compose -f compose.production.yml logs --tail=100 db`
- Check disk space: `df -h`

### 3. Backup Failure
- Inspect backup status API: `curl -u superadmin:password http://localhost:3000/api/admin/backup/status`
- Run manual backup with verbose logs: `npx tsx scripts/backup.ts`
- Check backup directory write permissions.

### 4. Disk Storage Warning (> 85% full)
- Run backup retention cleanup: `npx tsx scripts/backup.ts`
- Prune unused Docker build images: `docker image prune -f`
