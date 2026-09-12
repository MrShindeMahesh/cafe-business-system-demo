# Café POS — Deployment Guide

## Requirements
- **Node.js ≥ 22.5** (uses built-in `node:sqlite`). Check: `node -v`

## One-command deploy (fresh machine)
```bash
npm install
npm start          # builds the frontend, then serves app + API on port 4000
```
Open **http://localhost:4000** (set a different port with `PORT=5000 npm start`).

## Moving existing data to the new deployment
The live database is `server/cafe.db` (auto-seeded on first run). To carry your
existing data over:

1. **On the old machine:** Settings → *Auto DB Backups* → **⬇ Extract Data File**
   → downloads `cafe-backup-YYYY-MM-DD.db`
2. **On the new deployment:** Settings → **⬆ Restore Data File** → pick that file
   → a safety snapshot of current data is taken first, then all tables
   (menu, orders, payments, settings, staff, …) are replaced in one transaction.
   The page reloads with the restored data.

Manual equivalents (no UI):
```bash
# extract (also runs automatically at server start + every 30 min)
curl -X POST http://localhost:4000/api/backup
# download the file
curl -o data.db http://localhost:4000/api/backups/<cafe-backup-YYYY-MM-DD.db>/download
# restore
curl -X POST --data-binary @data.db -H "Content-Type: application/octet-stream" \
     http://localhost:4000/api/restore-db
```

## What runs where
| Piece | Where |
|---|---|
| Built frontend | `dist/` (served by the Express server) |
| API | same server, `/api/*` |
| Database | `server/cafe.db` (SQLite, WAL) |
| Auto backups | `server/backups/cafe-backup-*.db` (last 7 kept) |
| Print logs | `server/logs/print.log` (when no printer IP is configured) |
| Logo / QRs | `public/` uploads |

## Thermal printer
Set the printer IP + port in Settings (printer section). With no IP configured,
bills are logged to `server/logs/print.log` so nothing is lost while testing.

## Keeping it running (optional)
```bash
# pm2
npm i -g pm2
npm run build
pm2 start server/server.js --name cafe
pm2 save
```
