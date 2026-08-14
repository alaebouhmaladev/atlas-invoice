#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Atlas Bites CRM & Facturation — Zero-Data-Loss Production Deployment Script
# ==============================================================================

echo "======================================================================"
echo " Atlas Bites Production Deployment Workflow"
echo "======================================================================"

# 1. Environment Check
if [ ! -f ".env.production" ]; then
  echo "[ERROR] .env.production file not found! Copy .env.production.example to .env.production and configure production secrets."
  exit 1
fi

echo "[1/6] Running Pre-Deployment Backup..."
npx tsx scripts/backup.ts

echo "[2/6] Validating Database Migrations..."
pnpm prisma:migrate

echo "[3/6] Building Production Container Images..."
docker compose -f compose.production.yml build --no-cache

echo "[4/6] Restarting Production Services safely without removing persistent volumes..."
docker compose -f compose.production.yml up -d

echo "[5/6] Waiting for Application Readiness..."
sleep 5
npx tsx -e "
import http from 'node:http';
let retries = 10;
function check() {
  http.get('http://localhost:3000/api/health/ready', (r) => {
    if (r.statusCode === 200) {
      console.log('✓ Production container readiness confirmed!');
      process.exit(0);
    } else {
      retry();
    }
  }).on('error', retry);
}
function retry() {
  if (--retries <= 0) { console.error('✗ Readiness timeout!'); process.exit(1); }
  setTimeout(check, 2000);
}
check();
"

echo "[6/6] Executing Automated Post-Deployment Smoke Tests..."
npx tsx scripts/smoke_test.ts http://localhost:3000

echo "======================================================================"
echo " 🎉 Production Deployment Completed Successfully with Zero Data Loss!"
echo "======================================================================"
