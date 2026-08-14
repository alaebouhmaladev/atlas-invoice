# Environment Variables Reference — Atlas Bites Facturation

| Variable Name | Required | Default / Example | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Node environment mode (`development` or `production`). |
| `PORT` | No | `3000` | HTTP port exposed inside container. |
| `APP_URL` | Yes | `https://facturation.atlasbites-maroc.com` | Primary application public URL. |
| `POSTGRES_DB` | Yes | `atlas_bites_facturation` | PostgreSQL database name. |
| `POSTGRES_USER` | Yes | `atlas_user` | PostgreSQL database user. |
| `POSTGRES_PASSWORD` | Yes | `[secret]` | PostgreSQL database password. |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db` | Prisma database connection string. |
| `SESSION_SECRET` | Yes | `[secret-64-char-hex]` | Cookie session encryption key. |
| `SESSION_MAX_AGE` | No | `86400` | Session lifetime in seconds (24h). |
| `BACKUP_DIR` | No | `/app/backups` | Directory path for local backup snapshots. |
