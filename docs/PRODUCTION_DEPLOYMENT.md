# Production Deployment Guide — Atlas Bites Facturation

This document provides step-by-step instructions for deploying **Atlas Bites Facturation** to a production Linux server using Docker, Nginx, PostgreSQL, and Let's Encrypt TLS.

---

## 📋 Prerequisites

- Ubuntu 22.04 LTS / Debian 12 server.
- Installed tools: Docker 24+, Docker Compose v2, Nginx, Git, Node.js 20+.
- Domain configured with A records pointing to server IP (`facturation.atlasbites-maroc.com`, `crm.atlasbites-maroc.com`).

---

## 🚀 Deployment Steps

### 1. Clone & Configure Environment
```bash
git clone git@github.com:ourorg/atlas-invoice.git /var/www/atlas-invoice
cd /var/www/atlas-invoice
cp .env.production.example .env.production
```
Edit `.env.production` and configure secure values for `POSTGRES_PASSWORD` and `SESSION_SECRET`.

### 2. Zero-Data-Loss Deployment
Run the automated deployment script:
```bash
./scripts/deploy.sh
```

The script will automatically:
1. Create a pre-deployment database and asset backup.
2. Verify SHA-256 backup checksums.
3. Apply database migrations (`prisma migrate deploy`).
4. Build and restart production containers without deleting persistent volumes.
5. Wait for readiness check `/api/health/ready`.
6. Run post-deployment smoke tests.

---

## 🔒 Security Best Practices
- Never publish PostgreSQL port `5432` to external interfaces.
- Ensure Nginx blocks direct HTTP access to `.env`, `.git`, `.dump`, and `backups/` directories.
- Configure daily cron backup:
```bash
0 3 * * * cd /var/www/atlas-invoice && npx tsx scripts/backup.ts >> /var/log/atlas-backup.log 2>&1
```
